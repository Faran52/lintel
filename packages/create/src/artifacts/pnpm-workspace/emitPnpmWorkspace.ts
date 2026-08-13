import { targetFor } from '../../model/targets';
import { buildDevDependencies } from '../package-json/emitPackageJson';
import { ESLINT_RANGE } from '../package-json/versions';

import type { Answers } from '../../model/answers/answers';

// The emitted file carries no `packages:` key: it exists for `allowBuilds`, since a denied build fails the
// install with ERR_PNPM_IGNORED_BUILDS, and for the peer ranges below.
const SHARED_ALLOWED_BUILDS = ['sharp', 'unrs-resolver'];

/**
 * Plugins whose own `eslint` peer range closes before the major this standard installs, keyed by the package a project
 * installs to get them, so a generated project does not meet warnings on its first install. Two of the three genuinely
 * run: `next()` names six `jsx-a11y` rules and `solid()` loads its plugin's presets, and neither plugin has a version
 * that declares 10, so an allowance is the only lever. The third never runs at all; its note says why.
 *
 * Scoped with `>` so the allowance reaches only the dependent named, not everything in the tree. Checked against the
 * installed ranges, not assumed: `>=8.57.0` and `>=9.0.0` are open and need nothing, which is why the plugins carrying
 * those are absent.
 */
const PEER_RANGE_GAPS: Record<string, string[]> = {
  /**
   * Never loaded, and every project has it: `eslint-import-resolver-typescript` lists `eslint-plugin-import` as an
   * optional peer, pnpm installs it regardless, and the layers resolve through `import-x` instead. Keyed on the config
   * that brings the resolver, since that is what a project actually installs.
   */
  '@linteljs/eslint-config': ['eslint-plugin-import'],
  'eslint-plugin-jsx-a11y': ['eslint-plugin-jsx-a11y'],
  'eslint-plugin-solid': ['eslint-plugin-solid'],
};

export const allowBuildsBlock = (answers: Answers): string => {
  const names = [...SHARED_ALLOWED_BUILDS, ...targetFor(answers).allowBuilds];

  const entries = [...new Set(names)]
    .sort((left, right) => {
      return left.localeCompare(right, 'en');
    })
    .map((name) => {
      // Quoted unconditionally: @ opens a reserved YAML indicator, so a scoped package name as a bare key fails to
      // parse.
      return `  '${name}': true`;
    })
    .join('\n');

  return `allowBuilds:\n${entries}\n`;
};

// The major of the range this CLI writes, so the allowance follows `versions.ts` rather than repeating a number.
const eslintMajor = (): string => {
  return String(Number.parseInt(ESLINT_RANGE.replace(/^[\^~]/, ''), 10));
};

export const peerRangeAllowances = (answers: Answers): string[] => {
  const installed = Object.keys(buildDevDependencies(answers));

  return [...new Set(
    installed.flatMap((name) => {
      return PEER_RANGE_GAPS[name] ?? [];
    }),
  )].sort((left, right) => {
    return left.localeCompare(right, 'en');
  });
};

/**
 * Always at least one entry, so there is no empty case to guard: `@linteljs/eslint-config` is in every project's
 * dependencies and brings the resolver that drags `eslint-plugin-import`. A guard for a list that cannot be empty is
 * a branch no answer reaches.
 */
export const peerRulesBlock = (answers: Answers): string => {
  const allowed = peerRangeAllowances(answers);
  const major = eslintMajor();
  const entries = allowed
    .map((name) => {
      return `    '${name}>eslint': '${major}'`;
    })
    .join('\n');

  return `\npeerDependencyRules:\n  allowedVersions:\n${entries}\n`;
};

export const emitPnpmWorkspace = (answers: Answers): string => {
  return `${allowBuildsBlock(answers)}${peerRulesBlock(answers)}`;
};
