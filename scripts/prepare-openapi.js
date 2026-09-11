#!/usr/bin/env node
/**
 * Cleans up the raw OpenAPI spec exported from formandopercorsi-backend before
 * it is handed to docusaurus-plugin-openapi-docs.
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
 * Usage:
 *   node scripts/prepare-openapi.js [inputPath] [outputPath]
 *
 * Defaults to openapi/formandopercorsi.yaml -> openapi/formandopercorsi.docs.yaml
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const inputPath = process.argv[2] || path.join(__dirname, '..', 'openapi', 'formandopercorsi.yaml');
const outputPath = process.argv[3] || path.join(__dirname, '..', 'openapi', 'formandopercorsi.docs.yaml');

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
    console.log(`prepare-openapi: merged ${removed} duplicate tag entr${removed === 1 ? 'y' : 'ies'} (${byName.size} unique tags remain).`);
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
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
console.log(`prepare-openapi: assigned ${usedIds.size} readable operationIds.`);

fs.writeFileSync(outputPath, yaml.dump(spec, { lineWidth: -1, noRefs: true }));
console.log(`prepare-openapi: wrote ${outputPath}`);
