import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  describe,
  expect,
  it,
} from 'vitest';

import { parsePackageJson } from './emitPackageJson';
import { VERSIONS } from './versions';

interface Sibling {
  name: string;
  version: string;
}

/**
 * The only ranges in VERSIONS this repository can check for itself; everything else names a registry version, and
 * asserting on those would hit the network. @linteljs/eslint-config sat at ^0.1.0 while the package it names had
 * reached 0.2.0: a caret on 0.x is minor-locked, and the emitter tests (which assert on text, not resolution) missed
 * it.
 */
const WORKSPACE_PACKAGES = ['eslint-config', 'eslint-plugin'];

const siblingIn = (directory: string): Sibling => {
  const path = join(import.meta.dirname, '..', '..', '..', '..', directory, 'package.json');
  const { name, version } = parsePackageJson(readFileSync(path, 'utf8'));

  if (name === undefined || version === undefined) {
    throw new Error(`${path} declares no name or version`);
  }

  return { name, version };
};

describe('VERSIONS against the workspace', () => {
  it.each(WORKSPACE_PACKAGES)('carries no stale range for %s', (directory) => {
    const { name, version } = siblingIn(directory);
    const range = VERSIONS[name];

    // Only @linteljs/eslint-config is written into a generated project; the plugin arrives as its dependency and
    // needs no range of its own.
    expect(range === undefined || range === `^${version}`).toBe(true);
  });

  it('names the one package a generated project depends on', () => {
    expect(VERSIONS[siblingIn('eslint-config').name]).toBeDefined();
  });
});
