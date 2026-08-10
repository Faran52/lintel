import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  type Library,
  TARGET_IDS,
  type TargetId,
  type Testing,
} from '../../model/answers/answers';
import { FOLDER_ROUTED } from '../../model/naming/naming';

import { emitEslintConfig } from './emitEslintConfig';

interface AnswerOverrides {
  target?: TargetId;
  testing?: Testing;
  libraries?: Library[];
}

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

/**
 * The emitted config, character for character: the README.md of both this package and the workspace quote it, so an
 * edit here is a documentation change too.
 * `String.raw`, because the folder glob carries backslashes: in an ordinary template literal the
 * emitted `\\[` would collapse to `\[` and the fixture would assert a pattern the emitter never wrote.
 */
const CANONICAL_REACT = String.raw`import { defineConfig } from '@linteljs/eslint-config/define-config';

const config = await defineConfig({
  framework: 'react',
  typescript: true,
  vitest: true,
  html: true,
  ignores: ['dist/**', 'coverage/**', '.claude/**', 'plugins/linteljs/**'],
  aliases: {
    '@components/*': './src/components/*',
    '@ui/*': './src/components/ui/*',
    '@features/*': './src/components/features/*',
    '@lib/*': './src/lib/*',
    '@store/*': './src/lib/store/*',
    '@hooks/*': './src/lib/hooks/*',
    '@utils/*': './src/lib/utils/*',
    '@services/*': './src/lib/services/*',
    '@providers/*': './src/lib/providers/*',
    '@config/*': './src/config/*',
    '@mocks/*': './__mocks__/*',
  },
  naming: {
    'src/**/*.tsx': '!([a-z]*[A-Z]*)',
    'src/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',
    'src/**/*.d.ts': '@(+([a-z0-9])*(-+([a-z0-9]))|+([a-z])*([a-zA-Z0-9]))',
  },
  folderNaming: {
    'src/**/': '@(+([a-z0-9])*(-+([a-z0-9]))|__tests__|\\[*\\]|\\(*\\)|{*})',
  },
});

export default config;
`;

describe('emitEslintConfig', () => {
  it('reproduces the frozen contract file for default React answers', () => {
    expect(emitEslintConfig(answersFor({ target: 'react' }))).toBe(CANONICAL_REACT);
  });

  // The composer subpath, never the barrel: the barrel pulls in all six framework layers, five unneeded by any one
  // project.
  it('imports the composer from its subpath, once, and nothing else', () => {
    const output = emitEslintConfig(answersFor({ target: 'vue' }));

    expect(output).not.toContain("from '@linteljs/eslint-config'");
    expect(output.match(/^import /gm)).toHaveLength(1);
    expect(output).toContain("import { defineConfig } from '@linteljs/eslint-config/define-config';");
  });

  // `next` names one framework, not two layers in an order: the composer puts react underneath it and reads the
  // ordering off the layer itself.
  it('names next as one framework rather than composing react beneath it here', () => {
    const output = emitEslintConfig(answersFor({ target: 'next' }));

    expect(output).toContain("framework: 'next',");
    expect(output).not.toContain('react');
    expect(output).not.toContain('Group');
  });

  it('names the framework rather than an order for every target that has one', () => {
    expect(emitEslintConfig(answersFor({ target: 'svelte' }))).toContain("framework: 'svelte',");
    expect(emitEslintConfig(answersFor({ target: 'angular' }))).toContain("framework: 'angular',");
    expect(emitEslintConfig(answersFor({ target: 'solid' }))).toContain("framework: 'solid',");
  });

  it('renames the hooks alias per framework', () => {
    expect(emitEslintConfig(answersFor({ target: 'vue' }))).toContain(
      "'@composables/*': './src/lib/composables/*',",
    );
    expect(emitEslintConfig(answersFor({ target: 'vue' }))).not.toContain("'@hooks/*'");

    expect(emitEslintConfig(answersFor({ target: 'solid' }))).toContain(
      "'@primitives/*': './src/lib/primitives/*',",
    );
  });

  it('omits the hooks alias where the framework has no hook equivalent', () => {
    expect(emitEslintConfig(answersFor({ target: 'angular' }))).not.toContain('/src/lib/hooks/');
    expect(emitEslintConfig(answersFor({ target: 'webextension' }))).not.toContain('/src/lib/hooks/');
  });

  it('emits @apis only with Zod', () => {
    expect(emitEslintConfig(answersFor({}))).not.toContain("'@apis/*'");
    expect(emitEslintConfig(answersFor({ libraries: ['zod'] }))).toContain(
      "'@apis/*': './src/lib/apis/*',",
    );
  });

  it('names no framework at all for plain TypeScript', () => {
    const output = emitEslintConfig(answersFor({ target: 'webextension' }));

    expect(output).not.toContain('framework:');
    expect(output).not.toContain('Group');
  });

  it('drops the vitest layer when testing is declined', () => {
    const output = emitEslintConfig(answersFor({ testing: 'none' }));

    expect(output).not.toContain('vitest');
    expect(output).not.toContain('@mocks/*');
  });

  // The layer imports @vitest/eslint-plugin, which only a project with a suite installs; asked for without one, eslint
  // . dies on ERR_MODULE_NOT_FOUND.
  it('asks for the vitest layer only where a suite was chosen', () => {
    expect(emitEslintConfig(answersFor({ testing: 'vitest' }))).toContain('vitest: true');
    expect(emitEslintConfig(answersFor({ testing: 'none' }))).not.toContain('vitest');
  });

  // The emitted file is linted by the config it emits; React Native's eight ignores on one line came to 133 characters
  // and self-reported a finding.
  it('keeps every emitted line inside the max-len the emitted config enforces', () => {
    TARGET_IDS.forEach((target) => {
      const tooLong = emitEslintConfig(answersFor({ target })).split('\n').filter((line) => {
        return line.length > 120;
      });

      expect({ target, tooLong }).toEqual({ target, tooLong: [] });
    });
  });

  it('asks for a library layer only when its library was selected', () => {
    expect(emitEslintConfig(answersFor({ libraries: ['tanstack-query'] })))
      .toContain("libraries: ['tanstack-query'],");
    expect(emitEslintConfig(answersFor({ libraries: ['tailwind'] })))
      .toContain("libraries: ['tailwind'],");
    // Emit order is fixed by LIBRARY_LAYERS, not by the order the libraries were picked in.
    expect(emitEslintConfig(answersFor({ libraries: ['tailwind', 'tanstack-query'] })))
      .toContain("libraries: ['tanstack-query', 'tailwind'],");
    expect(emitEslintConfig(answersFor({ libraries: ['zod'] }))).not.toContain('libraries:');
  });

  it('omits the html layer where there is no markup for it to lint', () => {
    // angular-eslint processes templates itself; Next's App Router owns the document.
    expect(emitEslintConfig(answersFor({ target: 'angular' }))).not.toContain('html');
    expect(emitEslintConfig(answersFor({ target: 'next' }))).not.toContain('html');
    expect(emitEslintConfig(answersFor({ target: 'react' }))).toContain('html: true,');
  });

  it('gives Next the aliases for the directories only it has', () => {
    const next = emitEslintConfig(answersFor({ target: 'next' }));
    const react = emitEslintConfig(answersFor({ target: 'react' }));

    expect(next).toContain("'@server/*': './src/lib/server/*',");
    expect(next).toContain("'@content/*': './src/content/*',");
    expect(react).not.toContain("'@server/*'");
    expect(react).not.toContain("'@content/*'");
  });

  it('carries the target ignores on top of the shared ones', () => {
    expect(emitEslintConfig(answersFor({ target: 'next' }))).toContain(
      "ignores: ['dist/**', 'coverage/**', '.claude/**', 'plugins/linteljs/**', "
      + "'.next/**', 'out/**', 'next-env.d.ts'],",
    );
  });

  // The published `defineConfig` option is consumer API and still takes a boolean; what this CLI emits is always true.
  it('turns the typescript layer on for every target', () => {
    TARGET_IDS.forEach((target) => {
      expect(emitEslintConfig(answersFor({ target }))).toContain('typescript: true,');
    });
  });

  // A test/spec mirrors its subject's name and carries no key of its own: check-file applies every matching key, so
  // App.test.ts beside App.vue could satisfy the camelCase rule and the subject's PascalCase both, which is impossible.
  it('excludes tests, specs and declarations from the script convention', () => {
    const vue = emitEslintConfig(answersFor({ target: 'vue' }));

    expect(vue).toContain("'src/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',");
    expect(vue).toContain("'src/**/*.d.ts':");
  });

  // A router that names routes by filename owns the spelling, so its directory is exempt from the script convention:
  // `+page.server.ts` is the framework's name, not camelCase.
  it('exempts a route directory the framework names, and only where there is one', () => {
    expect(emitEslintConfig(answersFor({ target: 'next' })))
      .toContain("'src/!(app)/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',");

    expect(emitEslintConfig(answersFor({ target: 'svelte' })))
      .toContain("'src/!(routes)/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',");

    // React has no route directory, so the two-key split never appears.
    expect(emitEslintConfig(answersFor({ target: 'react' })))
      .not.toContain("'src/!(");
  });
});

describe('folderNaming', () => {
  it('asks for kebab-case folders on every target', () => {
    TARGET_IDS.forEach((target) => {
      expect(emitEslintConfig(answersFor({ target }))).toContain('folderNaming: {');
    });
  });

  // A router segment (`[slug]`, `(tabs)`) is not kebab-case, so the React family, Solid and Svelte permit both via a
  // raw glob rather than an exclusion by path.
  it('permits a router segment only where a router names one', () => {
    const routed = ['react', 'next', 'solid', 'react-native', 'svelte'] as const;
    const plain = ['vue', 'angular', 'webextension'] as const;

    routed.forEach((target) => {
      expect(emitEslintConfig(answersFor({ target }))).toContain(String.raw`|__tests__|\\[*\\]|`);
    });
    plain.forEach((target) => {
      const emitted = emitEslintConfig(answersFor({ target }));

      expect(emitted).toContain("'src/**/': '@(+([a-z0-9])*(-+([a-z0-9]))|__tests__)'");
      expect(emitted).not.toContain(String.raw`\\[`);
    });
  });

  // `\\[` in the emitted file is the glob's literal `\[`; unescaped it would be `[`, which opens a character class the
  // project never tested against.
  it('escapes the glob so the file parses back to the pattern it emitted', () => {
    const emitted = emitEslintConfig(answersFor({ target: 'react-native' }));
    const quoted = /'src\/\*\*\/': ('(?:[^'\\]|\\.)*')/.exec(emitted)?.[1];

    expect(quoted).toContain(String.raw`\\[`);
    expect(JSON.parse(String(quoted).replace(/^'|'$/g, '"'))).toBe(FOLDER_ROUTED);
  });
});
