// `AliasMap`, `NamingMap`, `Framework`, `LibraryLayer`, `ResolverOptions` and `DefineConfigOptions` mirror
// `@linteljs/eslint-config/src/types.ts`, redeclared not imported so `@linteljs/create` installs before it.

export type TargetId
  = 'react'
    | 'next'
    | 'vue'
    | 'svelte'
    | 'solid'
    | 'angular'
    | 'webextension'
    | 'react-native';

export type PackageManager
  = 'pnpm'
    | 'npm'
    | 'yarn'
    | 'bun';

// Which runner a project gets, and `none` for no suite at all. One runner, all eight targets.
export type Testing = 'vitest' | 'none';

// Which floor `scripts/checkBannedPatterns.ts` runs: `strict` bans casts, `unknown` outside a narrowing guard,
// index signatures and suppression directives; `relaxed` keeps only what the compiler can't catch, plus `CustomTypes`.
export type TypeSafety = 'strict' | 'relaxed';

export type Library
  = 'zod'
    | 'tanstack-query'
    | 'tailwind';

export type Agent = 'claude-code' | 'codex';

export type Plugin = 'ponytail' | 'context7' | 'frontend-design';

export interface Answers {
  target: TargetId;
  testing: Testing;
  packageManager: PackageManager;
  libraries: Library[];
  // Always false on a target with no `store` slot, where the question is never asked.
  store: boolean;
  typeSafety: TypeSafety;
  agents: Agent[];
  plugins: Plugin[];
}

export type AliasMap = Record<string, string>;

export type NamingConvention
  = 'PASCAL_CASE'
    | 'CAMEL_CASE'
    | 'KEBAB_CASE';

// A case name or a raw glob: `check-file` micromatches against the basename, which is what lets a folder rule permit a
// router segment like `[slug]` alongside kebab-case.
export type NamingRule = NamingConvention | (string & {});

export type NamingMap = Record<string, NamingRule>;

// The framework layers the composer knows, by the name its subpath already uses.
export type Framework
  = 'react'
    | 'next'
    | 'vue'
    | 'svelte'
    | 'solid'
    | 'angular';

// The subset of `Library` that has a layer behind it. Zod brings no ESLint rules.
export type LibraryLayer = 'tanstack-query' | 'tailwind';

export interface ResolverOptions {
  project?: string;
}

// What `defineConfig` takes, which is what `artifacts/eslint-config` writes into the call.
export interface DefineConfigOptions {
  framework?: Framework;
  typescript?: boolean;
  vitest?: boolean;
  html?: boolean;
  libraries?: LibraryLayer[];
  ignores?: string[];
  naming?: NamingMap;
  folderNaming?: NamingMap;
  aliases?: AliasMap;
  resolver?: ResolverOptions;
}

// Emit order for the `libraries` option, so the written config is stable across runs.
export const LIBRARY_LAYERS: LibraryLayer[] = ['tanstack-query', 'tailwind'];

export const TARGET_IDS: TargetId[] = [
  'react',
  'next',
  'vue',
  'svelte',
  'solid',
  'angular',
  'webextension',
  'react-native',
];

export const PACKAGE_MANAGERS: PackageManager[] = [
  'pnpm',
  'npm',
  'yarn',
  'bun',
];

export const LIBRARIES: Library[] = [
  'zod',
  'tanstack-query',
  'tailwind',
];

export const AGENTS: Agent[] = ['claude-code', 'codex'];

export const PLUGINS: Plugin[] = ['ponytail', 'context7', 'frontend-design'];

export const DEFAULT_ANSWERS: Answers = {
  target: 'react',
  testing: 'vitest',
  packageManager: 'pnpm',
  libraries: [],
  // No store by default: a fresh project earns a state library the day component state stops being enough.
  store: false,
  typeSafety: 'strict',
  agents: ['claude-code'],
  plugins: [...PLUGINS],
};

export const hasLibrary = (answers: Answers, library: Library): boolean => {
  return answers.libraries.includes(library);
};

// Whether the project has a suite at all; a site that is genuinely vitest-specific keeps the literal instead.
export const hasTests = (answers: Answers): boolean => {
  return answers.testing !== 'none';
};

export const TESTING_CHOICES: Testing[] = ['vitest', 'none'];

export const TYPE_SAFETY_CHOICES: TypeSafety[] = ['strict', 'relaxed'];

// What a project name has to satisfy to be safe both as a directory and as an unscoped npm package name: npm's own
// floor (lowercase, no leading `.`/`_`, URL-safe) is also the strictest of the two, so meeting it meets both.
export const PROJECT_NAME_RULE
  = "a valid npm package name: lowercase letters, digits, '.', '-' and '_' only, starting with a letter or digit, "
    + 'at most 214 characters';

const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export const isValidProjectName = (name: string): boolean => {
  return name.length <= 214 && PROJECT_NAME_PATTERN.test(name);
};
