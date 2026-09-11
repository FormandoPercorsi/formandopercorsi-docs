#!/usr/bin/env node
/**
 * Fetches the current OpenAPI spec for each environment before the docs site
 * is built, so nobody has to remember to copy it over by hand. Runs
 * automatically as the first step of `npm run gen-api-docs` (and therefore
 * `npm run build`).
 *
 * The spec is a plain static file served by the backend itself (Apache
 * `Alias /doc /app/web/doc`, `Require all granted` -- see
 * formandopercorsi-backend's `000-default.conf`), regenerated from the
 * current source at every Docker image build (`php docs/doc_generate.php`
 * runs in `formandopercorsi-backend.Dockerfile`). So the running app for
 * each environment is the source of truth -- it reflects exactly what's
 * deployed right now, not what happens to be committed to the branch (the
 * two can and do diverge -- e.g. a feature merged to `main` without anyone
 * re-running `doc_generate.php` and committing the refreshed spec):
 *
 *   https://api.formandopercorsi.com/doc/openapi.yaml       (production)
 *   https://dev.api.formandopercorsi.com/doc/openapi.yaml   (develop)
 *
 * Deliberately no fallback to formandopercorsi-backend's git repo (local
 * clone or GitHub API): that would read a snapshot that can be stale or
 * miss in-code-only changes, silently producing a docs build that doesn't
 * match what's actually deployed. If the live endpoint isn't reachable,
 * this fails loudly instead.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAPI_DIR = path.join(__dirname, '..', 'openapi');

const ENVIRONMENTS = [
  {
    name: 'production',
    liveUrl: 'https://api.formandopercorsi.com/doc/openapi.yaml',
    output: path.join(OPENAPI_DIR, 'formandopercorsi.production.yaml'),
  },
  {
    name: 'develop',
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

async function fetchSpec(env) {
  try {
    const content = await fetchFromUrl(env.liveUrl);
    fs.writeFileSync(env.output, content);
    console.log(`fetch-openapi [${env.name}]: wrote ${env.output} from the live endpoint (${env.liveUrl}).`);
  } catch (err) {
    throw new Error(`fetch-openapi [${env.name}]: could not fetch ${env.liveUrl}: ${err.message}`);
  }
}

(async () => {
  // openapi/ holds nothing but generated files now (see .gitignore), so a
  // fresh checkout/Docker build context won't have the directory at all --
  // git doesn't track empty directories.
  fs.mkdirSync(OPENAPI_DIR, {recursive: true});
  for (const env of ENVIRONMENTS) {
    await fetchSpec(env);
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
