import type { AliasMap } from '../types';

// Node built-ins. `fs` and `path` are listed for codebases still writing the bare specifier.
const BUILTIN_GROUP = ['^node:', '^fs$', '^path$'];

const PACKAGE_GROUP = [String.raw`^@?\w`];

const PARENT_GROUP = [String.raw`^\.\.(?!/?$)`, String.raw`^\.\./?$`];

const SIBLING_GROUP = [String.raw`^\./`];

// Type imports, near the end. simple-import-sort appends a NUL to an `import type` source, which
// the trailing `\u0000` matches. `.css` and `.json` are excluded so those sort with their kind.
const TYPE_GROUP = [
  String.raw`^(?!.*[.](?:css|json)$)[^.].*\u0000$`,
  String.raw`^[.].*\u0000$`,
];

// Styles, always last: a stylesheet import is a side effect, and it should read as one.
const STYLE_GROUP = [String.raw`^.+\.s?css$`];

// The alias buckets, in the spine's dependency direction, so a sorted import block reads
// top-down as the architecture. A project only gets the patterns its own alias map declares.
const ALIAS_BUCKETS = [
  ['@config', '@typings'],
  ['@lib', '@store', '@services', '@providers', '@apis', '@utils'],
  ['@hooks', '@composables', '@primitives'],
  ['@ui', '@features', '@components'],
  ['@mocks'],
];

// `'@ui/*'` and `'@ui'` both name the alias `@ui`.
const aliasNameOf = (alias: string): string => {
  return alias.replace(/\/\*$/, '');
};

// `$` opens a regex anchor, so SvelteKit's `$lib` would produce `^$lib/`, matching nothing.
// Escaped by hand, not `RegExp.escape`, which also rewrites `@` and would churn every group.
const REGEX_SPECIAL = /[$^\\.*+?()[\]{}|]/g;

const ESCAPED = '\\$&';

const patternFor = (alias: string): string => {
  return `^${aliasNameOf(alias).replace(REGEX_SPECIAL, ESCAPED)}/`;
};

// Aliases the buckets above do not name. They sort after the known buckets rather than falling
// through to `^@?\w`, which would file them with node_modules.
const unknownAliasesIn = (aliases: string[]): string[] => {
  const known = new Set(ALIAS_BUCKETS.flat());

  return aliases.filter((alias) => {
    return !known.has(aliasNameOf(alias));
  }).map(patternFor).sort((left, right) => {
    return left.localeCompare(right);
  });
};

const knownAliasGroups = (aliases: string[]): string[][] => {
  const declared = new Set(aliases.map(aliasNameOf));

  return ALIAS_BUCKETS.map((bucket) => {
    return bucket.filter((name) => {
      return declared.has(name);
    }).map(patternFor);
  }).filter((bucket) => {
    return bucket.length > 0;
  });
};

// Derived rather than hand-written; order inside a bucket doesn't decide grouping, the longest match wins.
export const buildGroups = (aliases: AliasMap = {}, frameworkGroup?: string[]): string[][] => {
  const declared = Object.keys(aliases);
  const unknown = unknownAliasesIn(declared);

  return [
    BUILTIN_GROUP,
    ...(frameworkGroup && frameworkGroup.length > 0 ? [frameworkGroup] : []),
    PACKAGE_GROUP,
    ...knownAliasGroups(declared),
    ...(unknown.length > 0 ? [unknown] : []),
    PARENT_GROUP,
    SIBLING_GROUP,
    TYPE_GROUP,
    STYLE_GROUP,
  ];
};
