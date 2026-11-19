#!/usr/bin/env node
/**
 * Verifies that every named import of an external package in the built Electron main
 * bundle resolves under Node's ESM loader. Catches CommonJS packages imported with
 * named specifiers (e.g. electron-updater), which only fail when the app starts.
 */
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';

const file = process.argv[2] ?? 'dist/main/main.js';
const source = readFileSync(file, 'utf8');
const pattern = /import\s*(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
const skip = new Set(['electron']);
const failures = [];

for (const [, specifiers, pkg] of source.matchAll(pattern)) {
  if (pkg.startsWith('.') || pkg.startsWith('node:') || builtinModules.includes(pkg)) continue;
  if (skip.has(pkg)) continue;
  const names = specifiers
    .split(',')
    .map((part) => part.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, ''))
    .filter(Boolean);
  let mod;
  try {
    mod = await import(pkg);
  } catch (error) {
    failures.push(`${pkg}: cannot be imported (${error.message})`);
    continue;
  }
  for (const name of names) {
    if (!(name in mod)) failures.push(`${pkg}: named export '${name}' not found`);
  }
}

if (failures.length > 0) {
  console.error(`Built main bundle ${file} has unresolvable imports:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.warn(`OK: named imports in ${file} resolve`);
