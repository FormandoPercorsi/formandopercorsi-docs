#!/usr/bin/env node
/**
 * Fetches the current OpenAPI spec for each environment before the docs site
 * is built, so nobody has to remember to copy it over by hand. Runs
 * automatically as the first step of `npm run gen-api-docs` (and therefore
 * `npm run build`).
 *
 * Primary source: the spec is a plain static file served by the backend
 * itself (Apache `Alias /doc /app/web/doc`, `Require all granted` -- see
 * formandopercorsi-backend's `000-default.conf`), regenerated from the
 * current source at every Docker image build (`php docs/doc_generate.php`
 * runs in `formandopercorsi-backend.Dockerfile`). So the running app for
 * each environment is the most accurate source there is -- it reflects
 * exactly what's deployed, not just what's committed to the branch:
 *
 *   https://api.formandopercorsi.com/doc/openapi.yaml       (production)
 *   https://dev.api.formandopercorsi.com/doc/openapi.yaml   (develop)
 *
 * Fallbacks, tried in order when the live fetch fails (e.g. no network
 * access to those hosts from wherever this runs, or an environment that
 * hasn't been redeployed since the spec last changed) -- both read straight
 * from the git repo instead of the running app:
 *  1. BACKEND_REPO_PATH env var: path to a local clone of
 *     formandopercorsi-backend (read via `git show <ref>:web/doc/openapi.yaml`,
 *     so its remote-tracking branches must be up to date -- `git fetch` first
 *     if unsure).
 *  2. GitHub REST API (api.github.com), authenticated with GITHUB_TOKEN (or
 *     GH_TOKEN) -- needed since the repo is private.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const https = require('https');

const OPENAPI_DIR = path.join(__dirname, '..', 'openapi');
const BACKEND_OWNER = 'FormandoPercorsi';
const BACKEND_REPO = 'formandopercorsi-backend';
const BACKEND_FILE_PATH = 'web/doc/openapi.yaml';

const ENVIRONMENTS = [
  {
    name: 'production',
    ref: 'main',
    liveUrl: 'https://api.formandopercorsi.com/doc/openapi.yaml',
    output: path.join(OPENAPI_DIR, 'formandopercorsi.production.yaml'),
  },
  {
    name: 'develop',
    ref: 'develop',
    liveUrl: 'https://dev.api.formandopercorsi.com/doc/openapi.yaml',
    output: path.join(OPENAPI_DIR, 'formandopercorsi.develop.yaml'),
  },
];

function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, {timeout: 15000}, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`GET ${url} returned HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      })
      .on('timeout', function () {
        this.destroy(new Error(`GET ${url} timed out`));
      })
      .on('error', reject);
  });
}

function fetchFromLocalClone(repoPath, ref) {
  return execFileSync('git', ['-C', repoPath, 'show', `origin/${ref}:${BACKEND_FILE_PATH}`], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
  });
}

function fetchFromGitHubApi(ref, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${BACKEND_OWNER}/${BACKEND_REPO}/contents/${BACKEND_FILE_PATH}?ref=${ref}`,
      headers: {
        'User-Agent': 'formandopercorsi-docs-fetch-openapi',
        Accept: 'application/vnd.github.raw+json',
        Authorization: `Bearer ${token}`,
      },
    };
    https
      .get(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`GitHub API returned ${res.statusCode} for ref "${ref}": ${body}`));
            return;
          }
          resolve(body);
        });
      })
      .on('error', reject);
  });
}

async function fetchSpec(env) {
  try {
    const content = await fetchFromUrl(env.liveUrl);
    fs.writeFileSync(env.output, content);
    console.log(`fetch-openapi [${env.name}]: wrote ${env.output} from the live endpoint (${env.liveUrl}).`);
    return;
  } catch (err) {
    console.warn(`fetch-openapi [${env.name}]: live fetch failed (${err.message}), falling back to git.`);
  }

  const backendRepoPath = process.env.BACKEND_REPO_PATH;
  if (backendRepoPath) {
    const content = fetchFromLocalClone(backendRepoPath, env.ref);
    fs.writeFileSync(env.output, content);
    console.log(`fetch-openapi [${env.name}]: wrote ${env.output} from local clone at ${backendRepoPath} (${env.ref}).`);
    return;
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error(
      `fetch-openapi [${env.name}]: live fetch failed and no fallback available. Set BACKEND_REPO_PATH to a ` +
        `local clone of the backend repo, or GITHUB_TOKEN/GH_TOKEN to a token that can read ` +
        `${BACKEND_OWNER}/${BACKEND_REPO}.`,
    );
  }
  const content = await fetchFromGitHubApi(env.ref, token);
  fs.writeFileSync(env.output, content);
  console.log(`fetch-openapi [${env.name}]: wrote ${env.output} via GitHub API (${env.ref}).`);
}

(async () => {
  for (const env of ENVIRONMENTS) {
    await fetchSpec(env);
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
