import { spawnSync } from 'node:child_process';
import {
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { ASSETS_ROOT } from '../../src/run/shipped-assets/shippedAssets';

// Spawned rather than imported: it reads `argv` and calls `exit`, which would take the runner down with it.
const CHECKER = join(ASSETS_ROOT, 'scripts/checkBannedPatterns.ts');

let cwd = '';

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'lintel-banned-'));
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

const check = async (source: string): Promise<string> => {
  // Not under `scripts/`, which the checker skips: it holds the patterns as data.
  const path = join(cwd, 'sample.ts');
  await writeFile(path, source, 'utf8');

  const { status, stderr } = spawnSync(execPath, [CHECKER, path], { encoding: 'utf8' });

  return status === 0 ? '' : stderr;
};

describe('the escape hatches it exists to block', () => {
  it.each([
    ['as never', 'const value = input as never;\n'],
    ['as unknown', 'const value = input as unknown as Target;\n'],
    ['a bare unknown annotation', 'const value: unknown = load();\n'],
    ['an unknown return', 'const load = (): unknown => {\n  return 1;\n};\n'],
    ['a string index signature', 'interface Bag {\n  [key: string]: number;\n}\n'],
    ['an eslint-disable directive', '// eslint-disable-next-line no-console\nconsole.log(1);\n'],
    ['a ts-expect-error directive', '// @ts-expect-error wrong on purpose\nconst value = 1;\n'],
  ])('reports %s', async (_label, source) => {
    expect(await check(source)).not.toBe('');
  });
});

describe('the carve-out the rule file grants', () => {
  it.each([
    ['a narrowing type guard', 'const isTarget = (value: unknown): value is Target => {\n  return true;\n};\n'],
    ['the parsed payload it narrows', 'const parsed: unknown = JSON.parse(text);\n'],
    // `import()` with a computed path is typed `any`, so binding the namespace as `unknown` is the stronger read.
    ['a dynamic import namespace', 'const loaded: unknown = await import(`./rules/${name}.ts`);\n'],
  ])('allows %s', async (_label, source) => {
    expect(await check(source)).toBe('');
  });

  it('still blocks an unknown binding with no boundary behind it', async () => {
    expect(await check('const loaded: unknown = other;\n')).toContain('[: unknown]');
  });
});

describe('mentions rather than directives', () => {
  it.each([
    ['a line comment naming a disable', 'const value = 1; // an `eslint-disable-next-line` here would be wrong\n'],
    ['prose naming ts-ignore', 'const value = 1; // never reach for `@ts-ignore`\n'],
    [
      'a banned pattern inside a multiline template',
      'const fixture = [\n  `function load(value: unknown) {`,\n  `  return value;`,\n].join("");\n',
    ],
    [
      'a banned pattern inside a block comment',
      '/**\n * Never write `value: unknown` outside a guard.\n */\nconst value = 1;\n',
    ],
  ])('says nothing about %s', async (_label, source) => {
    expect(await check(source)).toBe('');
  });
});

// Enforced by this script and by nothing else, so an extension it does not recognise has no floor at all.
describe('single-file components', () => {
  const checkFile = async (name: string, source: string): Promise<string> => {
    const path = join(cwd, name);
    await writeFile(path, source, 'utf8');

    const { status, stderr } = spawnSync(execPath, [CHECKER, path], { encoding: 'utf8' });

    return status === 0 ? '' : stderr;
  };

  it('reads the script block of a .vue file', async () => {
    const report = await checkFile('App.vue', [
      '<script setup lang="ts">',
      'const value = input as never;',
      'const options: unknown = load();',
      '</script>',
      '',
      '<template>',
      '  <p>{{ value }}</p>',
      '</template>',
      '',
    ].join('\n'));

    expect(report).toContain('2: const value = input as never;');
    expect(report).toContain('3: const options: unknown = load();');
  });

  it('reads the script block of a .svelte file', async () => {
    const report = await checkFile('Page.svelte', [
      '<script lang="ts">',
      '  let value = input as never;',
      '</script>',
      '',
      '<p>{value}</p>',
      '',
    ].join('\n'));

    expect(report).toContain('2: let value = input as never;');
  });

  // A component that renders a code sample quotes exactly the shapes this script bans.
  it('never reads the template or the styles as if they were TypeScript', async () => {
    expect(await checkFile('Docs.vue', [
      '<script setup lang="ts">',
      "const heading = 'Banned shapes';",
      '</script>',
      '',
      '<template>',
      '  <h2>{{ heading }}</h2>',
      '  <pre>const value = input as never;</pre>',
      '  <pre>const options: unknown = load();</pre>',
      '  <ul>',
      '    <li v-for="item in [1]" :key="item">{{ item }}</li>',
      '  </ul>',
      '</template>',
      '',
      '<style scoped>',
      '.a { color: red; }',
      '</style>',
      '',
    ].join('\n'))).toBe('');
  });
});
