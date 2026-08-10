import { targetFor, type TsconfigPlugin } from '../../model/targets';
import { buildAliases } from '../build-aliases/buildAliases';

import type { Answers } from '../../model/answers/answers';

// Emits `tsconfig.json`: one shared base plus the target's delta. `noUnusedLocals`/`noUnusedParameters` are
// deliberately absent since `unused-imports` owns that and both firing double-reports the same line.

export interface CompilerOptions {
  rootDir: string;
  target: string;
  lib: string[];
  useDefineForClassFields: boolean;
  jsx?: 'react-jsx' | 'preserve';
  jsxImportSource?: string;
  module: string;
  moduleResolution: string;
  resolveJsonModule: boolean;
  allowImportingTsExtensions: boolean;
  isolatedModules: boolean;
  moduleDetection: string;
  importHelpers: boolean;
  verbatimModuleSyntax: boolean;
  noEmit?: boolean;
  incremental: boolean;
  strict: boolean;
  noUncheckedIndexedAccess: boolean;
  exactOptionalPropertyTypes: boolean;
  noImplicitOverride: boolean;
  noFallthroughCasesInSwitch: boolean;
  allowUnreachableCode: boolean;
  allowUnusedLabels: boolean;
  erasableSyntaxOnly?: boolean;
  allowJs: boolean;
  checkJs: boolean;
  skipLibCheck: boolean;
  esModuleInterop: boolean;
  forceConsistentCasingInFileNames: boolean;
  types: string[];
  plugins?: TsconfigPlugin[];
  paths: Record<string, string[]>;
}

export interface TsconfigFile {
  // Only where a framework supplies a config the project has to build on. See `TsconfigDelta`.
  extends?: string;
  compilerOptions: CompilerOptions;
  include: string[];
  exclude: string[];
}

const BASE_INCLUDE = ['**/*.ts', '**/*.tsx', '**/*.mts'];
const BASE_EXCLUDE = ['node_modules', 'dist', 'build', 'coverage'];

// `vite/client` carries the ambient declarations for `./logo.svg`, `./App.css` and `import.meta.env`; without it a
// fresh project fails `tsc --noEmit` on its own starter component.
const typesFor = (answers: Answers): string[] => {
  const target = targetFor(answers.target);

  return [
    'node',
    ...(target.vite ? ['vite/client'] : []),
    // Named rather than "some runner", so a project that declined a suite doesn't typecheck against ambient describe/it
    // declarations it has no runner to satisfy.
    ...(answers.testing === 'vitest' ? ['vitest/globals'] : []),
    ...target.tsconfig.types ?? [],
  ];
};

const pathsFrom = (answers: Answers): Record<string, string[]> => {
  return Object.fromEntries(
    Object.entries(buildAliases(answers)).map(([alias, directory]) => {
      return [alias, [directory]];
    }),
  );
};

export const buildTsconfig = (answers: Answers): TsconfigFile => {
  const delta = targetFor(answers.target).tsconfig;

  return {
    ...(delta.extends === undefined ? {} : { extends: delta.extends }),
    compilerOptions: {
      rootDir: '.',

      target: 'esnext',
      lib: ['dom', 'dom.iterable', 'esnext'],
      // Angular flips this: its DI and input decorators read fields the base class constructor hasn't defined yet, and
      // [[Define]] semantics wipe them.
      useDefineForClassFields: delta.useDefineForClassFields ?? true,
      ...(delta.jsx === undefined ? {} : { jsx: delta.jsx }),
      ...(delta.jsxImportSource === undefined ? {} : { jsxImportSource: delta.jsxImportSource }),

      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      // Off: rewriteScaffoldedSource strips the extension from the three generated lines that need it, rather than
      // carrying a bundler-only escape hatch for the project's life.
      allowImportingTsExtensions: false,
      isolatedModules: true,
      moduleDetection: 'force',
      importHelpers: true,
      verbatimModuleSyntax: true,

      // Absent on Angular: ngtsc emits nothing under it, so the vitest compiler produces no output; typecheck passes
      // --noEmit on the command line regardless.
      ...(delta.dropsNoEmit === true ? {} : { noEmit: true }),
      incremental: true,

      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      noImplicitOverride: true,
      noFallthroughCasesInSwitch: true,
      /**
       * `noPropertyAccessFromIndexSignature` is absent: Vite and Next both declare CSS modules as `{ readonly [key:
       * string]: string }`, rejecting `styles.page` and failing Next's own starter page eight times.
       * `noUncheckedIndexedAccess` stays instead, adding `| undefined` without forbidding the access.
       */
      allowUnreachableCode: false,
      allowUnusedLabels: false,
      // Constructor parameter properties are not erasable, and Angular's DI is built on them.
      ...(delta.dropsErasableSyntaxOnly === true ? {} : { erasableSyntaxOnly: true }),
      allowJs: true,
      checkJs: false,
      skipLibCheck: true,

      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,

      types: typesFor(answers),
      ...(delta.plugins === undefined ? {} : { plugins: delta.plugins }),

      paths: pathsFrom(answers),
    },
    include: [...BASE_INCLUDE, ...(delta.include ?? [])],
    exclude: BASE_EXCLUDE,
  };
};

export const emitTsconfig = (answers: Answers): string => {
  return `${JSON.stringify(buildTsconfig(answers), null, 2)}\n`;
};
