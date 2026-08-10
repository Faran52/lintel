import {
  type Answers,
  type DefineConfigOptions,
  hasLibrary,
  LIBRARY_LAYERS,
} from '../../model/answers/answers';
import { targetFor } from '../../model/targets';
import { buildAliases } from '../build-aliases/buildAliases';

// Keyed by `keyof DefineConfigOptions`: a renamed or invented option fails to compile here, not in a project.
type OptionRow = [keyof DefineConfigOptions, string];

// The subpath, not the barrel: the barrel loads all six framework layers, five unneeded by any one project.
const PACKAGE = '@linteljs/eslint-config/define-config';

// Applied everywhere; per-target additions come from the target record. `plugins/linteljs/` is shipped, not written
// here, so linting it gates a project on a file it does not own and cannot fix without a release.
const BASE_IGNORES = ['dist/**', 'coverage/**', '.claude/**', 'plugins/linteljs/**'];

// Escaped, not just wrapped: a folder glob's backslash written straight through parses back as another pattern.
const quote = (value: string): string => {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
};

const indentOf = (level: number): string => {
  return '  '.repeat(level);
};

// Matches @stylistic/max-len (120); a looser value let React Native's ignores self-report a lint finding.
const MAX_LINE = 120;

const arrayLiteral = (key: string, values: string[], level = 1): string => {
  const inline = `[${values.map(quote).join(', ')}]`;

  // The whole emitted line, key and trailing comma included, which is what max-len measures.
  if (`${indentOf(level)}${key}: ${inline},`.length <= MAX_LINE) {
    return inline;
  }

  const entries = values.map((value) => {
    return `${indentOf(level + 1)}${quote(value)},`;
  });

  return `[\n${entries.join('\n')}\n${indentOf(level)}]`;
};

const objectLiteral = (entries: [string, string][], level: number): string => {
  const inner = entries
    .map(([key, value]) => {
      return `${indentOf(level + 1)}${quote(key)}: ${quote(value)},`;
    })
    .join('\n');

  return `{\n${inner}\n${indentOf(level)}}`;
};

// The layer switches lead, then the options `base` reads, so "which layers" is answered at the top of the object.
const optionRows = (answers: Answers): OptionRow[] => {
  const target = targetFor(answers.target);
  const rows: OptionRow[] = [];

  if (target.framework !== undefined) {
    rows.push(['framework', quote(target.framework)]);
  }

  // Unconditional: this CLI generates TypeScript only; the option stays in `defineConfig` for a hand-written config.
  rows.push(['typescript', 'true']);

  // Follows the suite, not the target: it imports @vitest/eslint-plugin, so asking for it without one dies on
  // ERR_MODULE_NOT_FOUND before eslint . lints a line.
  if (answers.testing === 'vitest') {
    rows.push(['vitest', 'true']);
  }

  if (target.html) {
    rows.push(['html', 'true']);
  }

  const layers = LIBRARY_LAYERS.filter((layer) => {
    return hasLibrary(answers, layer);
  });

  if (layers.length > 0) {
    rows.push(['libraries', arrayLiteral('libraries', layers)]);
  }

  rows.push(['ignores', arrayLiteral('ignores', [...BASE_IGNORES, ...target.ignores])]);
  rows.push(['aliases', objectLiteral(Object.entries(buildAliases(answers)), 1)]);
  rows.push(['naming', objectLiteral(Object.entries(target.naming), 1)]);
  rows.push(['folderNaming', objectLiteral(Object.entries(target.folderNaming), 1)]);

  return rows;
};

export const emitEslintConfig = (answers: Answers): string => {
  const options = optionRows(answers)
    .map(([key, value]) => {
      return `${indentOf(1)}${key}: ${value},`;
    })
    .join('\n');

  // Named, not anonymous (like lint-staged.config.js): import/no-anonymous-default-export reports a bare array.
  return [
    `import { defineConfig } from '${PACKAGE}';`,
    '',
    `const config = await defineConfig({\n${options}\n});`,
    '',
    'export default config;',
    '',
  ].join('\n');
};
