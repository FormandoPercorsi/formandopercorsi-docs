#!/usr/bin/env node
/**
 * Cleans up the raw OpenAPI spec(s) exported from formandopercorsi-backend before
 * they're handed to docusaurus-plugin-openapi-docs.
 *
 * The backend generates `web/doc/openapi.yaml` from swagger-php attributes
 * scattered across many controllers, which currently produces a few duplicate
 * top-level tag entries (same tag name declared more than once, sometimes with
 * different descriptions). docusaurus-plugin-openapi-docs turns each top-level
 * tag into its own sidebar category, so a duplicate tag would otherwise render
 * as two separate (confusing) categories with the same name.
 *
 * It also rewrites every operation's `operationId`. swagger-php auto-assigns
 * one already, but as an opaque hash (e.g. `74fba823e08bb7452c422ae12a8376ac`)
 * with no relation to the endpoint -- docusaurus-plugin-openapi-docs uses
 * `operationId` verbatim as both the generated doc id and the URL slug, so
 * left alone every endpoint page would live at a meaningless hash URL. This
 * replaces it with a readable `tag-summary` slug (falling back to
 * `method-path` when a summary is missing), de-duplicated when two endpoints
 * would otherwise collide.
 *
 * Neither of these touch which endpoints belong to which tag, nor any
 * request/response schema -- only presentation metadata used purely for
 * building the docs site.
 *
 * Two environments ship separate API reference trees (see docusaurus.config.ts
 * and sidebars.ts) because `develop` and `main` (production) can genuinely
 * diverge -- develop may already have an endpoint or field that hasn't been
 * promoted to production yet. Each environment's raw spec is a straight copy
 * of that branch's `web/doc/openapi.yaml`, fetched automatically by
 * `scripts/fetch-openapi.js` (runs before this script in `npm run gen-api-docs`)
 * -- nobody needs to copy it over by hand.
 *
 * Usage:
 *   node scripts/prepare-openapi.js                    # processes every environment in ENVIRONMENTS below
 *   node scripts/prepare-openapi.js <inputPath> <outputPath>   # ad hoc single file, for local testing
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const OPENAPI_DIR = path.join(__dirname, '..', 'openapi');

const ENVIRONMENTS = [
  {name: 'production', input: path.join(OPENAPI_DIR, 'formandopercorsi.production.yaml'), output: path.join(OPENAPI_DIR, 'formandopercorsi.production.docs.yaml')},
  {name: 'develop', input: path.join(OPENAPI_DIR, 'formandopercorsi.develop.yaml'), output: path.join(OPENAPI_DIR, 'formandopercorsi.develop.docs.yaml')},
];

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function prepareSpec(inputPath, outputPath, label) {
  const spec = yaml.load(fs.readFileSync(inputPath, 'utf8'));

  if (Array.isArray(spec.tags)) {
    const byName = new Map();
    for (const tag of spec.tags) {
      const existing = byName.get(tag.name);
      // Keep the longest description we've seen for this tag name (most complete one).
      if (!existing || (tag.description || '').length > (existing.description || '').length) {
        byName.set(tag.name, tag);
      }
    }
    const before = spec.tags.length;
    spec.tags = Array.from(byName.values());
    const removed = before - spec.tags.length;
    if (removed > 0) {
      console.log(`prepare-openapi [${label}]: merged ${removed} duplicate tag entr${removed === 1 ? 'y' : 'ies'} (${byName.size} unique tags remain).`);
    }
  }

  const usedIds = new Set();
  for (const [urlPath, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;

      const tag = Array.isArray(operation.tags) && operation.tags.length > 0 ? operation.tags[0] : '';
      const base = operation.summary
        ? slugify(`${tag} ${operation.summary}`)
        : slugify(`${method} ${urlPath}`);

      let candidate = base || slugify(`${method}-${urlPath}`);
      let suffix = 2;
      while (usedIds.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(candidate);
      operation.operationId = candidate;
    }
  }
  console.log(`prepare-openapi [${label}]: assigned ${usedIds.size} readable operationIds.`);

  fs.writeFileSync(outputPath, yaml.dump(spec, {lineWidth: -1, noRefs: true}));
  console.log(`prepare-openapi [${label}]: wrote ${outputPath}`);
}

const [cliInput, cliOutput] = process.argv.slice(2);

if (cliInput && cliOutput) {
  prepareSpec(cliInput, cliOutput, 'ad hoc');
} else {
  for (const env of ENVIRONMENTS) {
    if (!fs.existsSync(env.input)) {
      console.error(`prepare-openapi [${env.name}]: missing ${env.input}, skipping. See the sync instructions at the top of this script.`);
      continue;
    }
    prepareSpec(env.input, env.output, env.name);
  }
}
