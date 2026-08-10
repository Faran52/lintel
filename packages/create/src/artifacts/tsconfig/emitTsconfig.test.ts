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
import { buildAliases } from '../build-aliases/buildAliases';
import { emitEslintConfig } from '../eslint-config/emitEslintConfig';

import { buildTsconfig, emitTsconfig } from './emitTsconfig';

interface AnswerOverrides {
  target?: TargetId;
  testing?: Testing;
  libraries?: Library[];
}

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

describe('buildTsconfig', () => {
  it('carries the shared base', () => {
    const { compilerOptions } = buildTsconfig(answersFor({}));

    expect(compilerOptions.strict).toBe(true);
    expect(compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(compilerOptions.exactOptionalPropertyTypes).toBe(true);
    expect(compilerOptions.erasableSyntaxOnly).toBe(true);
    expect(compilerOptions.useDefineForClassFields).toBe(true);
  });

  it('leaves unused-locals to the unused-imports rule', () => {
    const text = emitTsconfig(answersFor({}));

    expect(text).not.toContain('noUnusedLocals');
    expect(text).not.toContain('noUnusedParameters');
  });

  it('flips useDefineForClassFields and drops erasableSyntaxOnly for Angular', () => {
    const { compilerOptions } = buildTsconfig(answersFor({ target: 'angular' }));

    expect(compilerOptions.useDefineForClassFields).toBe(false);
    expect(compilerOptions).not.toHaveProperty('erasableSyntaxOnly');
  });

  it('applies the jsx delta per target', () => {
    expect(buildTsconfig(answersFor({ target: 'react' })).compilerOptions.jsx).toBe('react-jsx');
    expect(buildTsconfig(answersFor({ target: 'solid' })).compilerOptions.jsx).toBe('preserve');
    expect(buildTsconfig(answersFor({ target: 'solid' })).compilerOptions.jsxImportSource)
      .toBe('solid-js');
    expect(buildTsconfig(answersFor({ target: 'webextension' })).compilerOptions)
      .not.toHaveProperty('jsx');
  });

  it('declares every key Next would otherwise inject', () => {
    const { compilerOptions, include } = buildTsconfig(answersFor({ target: 'next' }));

    expect(compilerOptions.plugins).toEqual([{ name: 'next' }]);
    expect(include).toContain('next-env.d.ts');
    expect(include).toContain('.next/types/**/*.ts');
    expect(include).toContain('.next/dev/types/**/*.ts');
  });

  it('drops vitest globals when testing is declined', () => {
    expect(buildTsconfig(answersFor({ testing: 'none' })).compilerOptions.types)
      .toEqual(['node', 'vite/client']);
  });

  it('declares vite/client only for the targets that build with vite', () => {
    expect(buildTsconfig(answersFor({ target: 'react' })).compilerOptions.types)
      .toContain('vite/client');
    expect(buildTsconfig(answersFor({ target: 'next' })).compilerOptions.types)
      .not.toContain('vite/client');
    expect(buildTsconfig(answersFor({ target: 'angular' })).compilerOptions.types)
      .not.toContain('vite/client');
  });

  it('refuses ts extensions in imports, which the scaffold rewrite is what makes possible', () => {
    expect(buildTsconfig(answersFor({ target: 'react' })).compilerOptions
      .allowImportingTsExtensions).toBe(false);
  });

  it('drops noEmit only on angular, whose vitest compiler has to emit', () => {
    expect(buildTsconfig(answersFor({ target: 'angular' })).compilerOptions.noEmit)
      .toBeUndefined();
    expect(buildTsconfig(answersFor({ target: 'react' })).compilerOptions.noEmit).toBe(true);
  });
});

// The alias list feeds three consumers: tsconfig paths, base({ aliases })'s import-sort buckets, and the import-x
// resolver; hand-kept copies are what drifted in the reference repos.
describe('alias coupling', () => {
  TARGET_IDS.forEach((target) => {
    [true, false].forEach((withZod) => {
      const libraries: Library[] = withZod ? ['zod'] : [];
      const label = `${target}${withZod ? ' with zod' : ''}`;

      it(`emits the same alias map into tsconfig paths and base() for ${label}`, () => {
        const answers = answersFor({ target, libraries });
        const aliases = buildAliases(answers);
        const { paths } = buildTsconfig(answers).compilerOptions;
        const config = emitEslintConfig(answers);

        expect(Object.keys(paths)).toEqual(Object.keys(aliases));

        Object.entries(aliases).forEach(([alias, directory]) => {
          expect(paths[alias]).toEqual([directory]);
          expect(config).toContain(`'${alias}': '${directory}',`);
        });

        /**
         * Nothing outside the shared list may reach the config: an alias emitted into one consumer and not the
         * others is the exact failure this pins. The pattern matches `[@$]` with an optional wildcard, because
         * SvelteKit's `$lib` is a real alias spelled both ways, and a segment may be empty because Expo's own
         * `@/*` and `@/assets/*` put the slash straight after the sigil. Import lines are dropped first, because
         * `@linteljs/eslint-config/define-config` is a scoped package specifier, not an alias, and matches the
         * same shape.
         */
        const body = config.replaceAll(/^import .*$/gm, '');
        const emitted = body.match(/'[@$][\w-]*(?:\/[\w-]+)*(?:\/\*)?'/g) ?? [];

        expect(emitted).toEqual(
          Object.keys(aliases).map((alias) => {
            return `'${alias}'`;
          }),
        );
      });
    });
  });

  it('carries the target-only aliases through all three consumers', () => {
    const answers = answersFor({ target: 'next' });
    const { paths } = buildTsconfig(answers).compilerOptions;

    expect(paths['@server/*']).toEqual(['./src/lib/server/*']);
    expect(paths['@content/*']).toEqual(['./src/content/*']);
    expect(buildAliases(answers)['@server/*']).toBe('./src/lib/server/*');
    expect(emitEslintConfig(answers)).toContain("'@content/*': './src/content/*',");
  });

  it('gives them to no other target', () => {
    TARGET_IDS.filter((target) => {
      return target !== 'next';
    }).forEach((target) => {
      const { paths } = buildTsconfig(answersFor({ target })).compilerOptions;

      expect(paths).not.toHaveProperty('@server/*');
      expect(paths).not.toHaveProperty('@content/*');
    });
  });

  // An alias naming a directory the target's own repo-structure.md doesn't describe is a dead end; the extension target
  // has lib/model/, not lib/store/ or lib/providers/.
  it("matches the extension target's own documented layout", () => {
    const { paths } = buildTsconfig(answersFor({ target: 'webextension' })).compilerOptions;

    expect(paths['@model/*']).toEqual(['./src/lib/model/*']);
    expect(paths).not.toHaveProperty('@store/*');
    expect(paths).not.toHaveProperty('@providers/*');
    expect(buildTsconfig(answersFor({ target: 'react' })).compilerOptions.paths)
      .toHaveProperty('@store/*');
  });

  /**
   * `svelte-kit sync` writes `.svelte-kit/tsconfig.json` ($app/*, ambient declarations, route types); SvelteKit warns
   * on svelte-check, vitest and vite build without extending it.
   * An extending config replaces `paths` rather than merging, so `$lib` has to be re-declared here.
   */
  it('extends what SvelteKit generates, and keeps $lib resolvable through it', () => {
    const config = buildTsconfig(answersFor({ target: 'svelte' }));

    expect(config.extends).toBe('./.svelte-kit/tsconfig.json');
    expect(config.compilerOptions.paths['$lib']).toEqual(['./src/lib']);
    expect(config.compilerOptions.paths['$lib/*']).toEqual(['./src/lib/*']);
    expect(buildTsconfig(answersFor({ target: 'react' })).extends).toBeUndefined();
  });
});

// `types` stops being a supplement the moment it names anything: TypeScript treats it as the whole allow-list, so an
// unlisted `@types/chrome` leaves every `chrome.*` call unresolved.
describe('ambient types', () => {
  it("names the target's own alongside the shared ones", () => {
    const config = buildTsconfig(answersFor({ target: 'webextension' }));

    expect(config.compilerOptions.types).toContain('chrome');
    expect(config.compilerOptions.types).toContain('node');
    expect(config.compilerOptions.types).toContain('vite/client');
  });

  it('adds none to a target that declares none', () => {
    expect(buildTsconfig(answersFor({ target: 'react' })).compilerOptions.types)
      .not.toContain('chrome');
  });
});
