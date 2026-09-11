#!/usr/bin/env node
/**
 * Fetches the current web/doc/openapi.yaml from formandopercorsi-backend for
 * each environment branch, so nobody has to remember to manually copy it
 * over before building the docs site. Runs automatically as the first step
 * of `npm run gen-api-docs` (and therefore `npm run build`) -- every build
 * pulls the spec as it stands on that branch right now.
 *
 * Two ways to reach the backend repo, tried in this order:
 *  1. BACKEND_REPO_PATH env var: path to a local clone of
 *     formandopercorsi-backend (read via `git show <ref>:web/doc/openapi.yaml`,
 *     so its remote-tracking branches must be up to date -- `git fetch` first
 *     if unsure). Convenient when both repos are checked out side by side.
 *  2. GitHub REST API (api.github.com), authenticated with GITHUB_TOKEN (or
 *     GH_TOKEN). Works anywhere with network access and a token that can
 *     read formandopercorsi-backend (the repo is private) -- this is what a
 *     CI-driven build uses.
 *
 * Neither path talks to the running API (dev.api.formandopercorsi.com /
 * api.formandopercorsi.com) -- the spec comes from the repo content on the
 * branch, matching how the backend team already keeps web/doc/openapi.yaml
 * current (regenerated with `php docs/doc_generate.php` and committed
 * alongside the endpoint changes it documents).
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
  {name: 'production', ref: 'main', output: path.join(OPENAPI_DIR, 'formandopercorsi.production.yaml')},
  {name: 'develop', ref: 'develop', output: path.join(OPENAPI_DIR, 'formandopercorsi.develop.yaml')},
];

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
      `fetch-openapi [${env.name}]: no way to fetch formandopercorsi-backend's ${BACKEND_FILE_PATH}. Set ` +
        `BACKEND_REPO_PATH to a local clone of the backend repo, or GITHUB_TOKEN/GH_TOKEN to a token that ` +
        `can read ${BACKEND_OWNER}/${BACKEND_REPO}.`,
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
