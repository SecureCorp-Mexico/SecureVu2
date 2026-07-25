// Lightweight i18n consistency check used by CI ("Check i18n keys").
//
// The web UI builds many translation keys dynamically (see
// src/utils/i18n.ts), so static source-extraction (e.g. i18next-parser)
// would incorrectly prune keys it cannot see and produce false failures.
// Instead, this script validates the locale resources themselves:
//
//   1. Every locale JSON file must be valid, parseable JSON.
//   2. The English source locale ("en") must exist and be non-empty.
//   3. Each translated locale's namespace files must exist in "en"
//      (a stray namespace that "en" does not define is a mistake).
//
// It intentionally does NOT fail on missing translations or stale keys,
// since translations legitimately lag behind the English source.

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

const LOCALES_DIR = "public/locales";
const SOURCE_LOCALE = "en";

/** Recursively collect *.json files under `dir`, returned relative to `dir`. */
function collectJsonFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectJsonFiles(full).map((p) => join(entry, p)));
    } else if (entry.endsWith(".json")) {
      out.push(entry);
    }
  }
  return out;
}

const errors = [];

if (!existsSync(LOCALES_DIR)) {
  console.error(`[i18n] locales directory not found: ${LOCALES_DIR}`);
  process.exit(1);
}

const sourceDir = join(LOCALES_DIR, SOURCE_LOCALE);
if (!existsSync(sourceDir)) {
  errors.push(`Source locale "${SOURCE_LOCALE}" is missing (${sourceDir}).`);
}

const sourceFiles = existsSync(sourceDir)
  ? new Set(collectJsonFiles(sourceDir))
  : new Set();
if (sourceFiles.size === 0) {
  errors.push(`Source locale "${SOURCE_LOCALE}" has no namespace files.`);
}

const locales = readdirSync(LOCALES_DIR).filter((name) =>
  statSync(join(LOCALES_DIR, name)).isDirectory(),
);

let checkedFiles = 0;
for (const locale of locales) {
  const localeDir = join(LOCALES_DIR, locale);
  for (const relPath of collectJsonFiles(localeDir)) {
    const filePath = join(localeDir, relPath);
    checkedFiles += 1;

    // 1. Valid JSON.
    try {
      JSON.parse(readFileSync(filePath, "utf8"));
    } catch (e) {
      errors.push(`Invalid JSON in ${filePath}: ${e.message}`);
      continue;
    }

    // 3. Translated namespaces must correspond to an English namespace.
    if (locale !== SOURCE_LOCALE && !sourceFiles.has(relPath)) {
      errors.push(
        `${relative(LOCALES_DIR, filePath)} has no matching "${SOURCE_LOCALE}" namespace (public/locales/${SOURCE_LOCALE}/${relPath}).`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`[i18n] Found ${errors.length} issue(s):`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(
  `[i18n] OK — validated ${checkedFiles} locale files across ${locales.length} locales.`,
);
