import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import nextConfig from 'eslint-config-next';

import { reactGroup } from './react';

import type { Linter } from 'eslint';
import type { Layer } from '../types';

// React's bucket plus Next itself, composed rather than restated so the two cannot disagree.
export const nextGroup: string[] = [...reactGroup, '^next$', '^next/'];

// A type predicate, not an extractor answering `string | undefined`: the shape `type-standards.md` grants `unknown`.
const isVersioned = (parsed: unknown): parsed is { version: string } => {
  return typeof parsed === 'object'
    && parsed !== null
    && 'version' in parsed
    && typeof parsed.version === 'string';
};

// Only MODULE_NOT_FOUND and ERR_PACKAGE_PATH_NOT_EXPORTED mean react is absent; anything else,
// notably ERR_INVALID_PACKAGE_CONFIG for a corrupt package.json, stays an error.
const ABSENT_CODES = new Set(['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED']);

const isAbsent = (error: unknown): error is Error & { code: string } => {
  return error instanceof Error
    && 'code' in error
    && typeof error.code === 'string'
    && ABSENT_CODES.has(error.code);
};

// Resolved from the working directory, not from this file, which lives inside `node_modules`.
const resolvedReactManifest = (): string | undefined => {
  try {
    return createRequire(join(process.cwd(), 'noop.js')).resolve('react/package.json');
  }
  catch (error) {
    if (isAbsent(error)) {
      return undefined;
    }

    throw error;
  }
};

const installedReactVersion = (): string | undefined => {
  const manifest = resolvedReactManifest();

  if (manifest === undefined) {
    return undefined;
  }

  const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));

  return isVersioned(parsed) ? parsed.version : undefined;
};

// Pin `settings.react.version`: the `eslint-config-next` copy of `eslint-plugin-react` detects it via
// `context.getFilename()`, gone in ESLint 10, so every `react/*` rule throws at load. Delete when upstream supports 10.
const reactVersionSettings = (): Layer => {
  const version = installedReactVersion();

  return version ? [{ name: '@linteljs/next/react-version', settings: { react: { version } } }] : [];
};

/**
 * `eslint-config-next`'s flat entries need surgery to sit beside `typescript()`; delete once upstream ships a
 * flat config built for ESLint 10. `next` claims every script extension for a pre-ESLint-10 parser (dies with
 * `scopeManager.addGlobals is not a function`), so its parser and Babel `parserOptions` go and the 1174
 * `globals` stay. `next/typescript` registers `@typescript-eslint` again, which `typescript()` already did
 * (`Cannot redefine plugin`); dropping the whole entry would also drop the only thing pointing TypeScript
 * files at a working parser.
 */
const normaliseUpstreamEntry = (entry: Linter.Config): Linter.Config => {
  if (entry.name === 'next/typescript') {
    const copy = { ...entry };

    delete copy.plugins;

    return copy;
  }

  if (entry.name === 'next' && entry.languageOptions !== undefined) {
    const languageOptions = { ...entry.languageOptions };

    // Bracket access: ESLint types `LanguageOptions` with an index signature, and the base
    // tsconfig sets `noPropertyAccessFromIndexSignature`.
    delete languageOptions['parser'];
    delete languageOptions['parserOptions'];

    return { ...entry, languageOptions };
  }

  return entry;
};

// Next.js. Stacks on `react()`: the one framework layer that is not exclusive.
export const next = (): Layer => {
  return [
    ...nextConfig.map(normaliseUpstreamEntry),
    ...reactVersionSettings(),
  ];
};

export default next;
