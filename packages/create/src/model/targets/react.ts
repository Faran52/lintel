import { FOLDER_NAMING, NAMING } from '../naming/naming';

import { OUTSIDE_TESTS } from './utils/frameworkUtils';
import {
  COMMON_REACT_PLUGINS,
  HOOKS_ALIAS,
  viteScaffold,
} from './utils/targetUtils';

import type { TargetRecord } from './record';

export const react: TargetRecord = {
  id: 'react',
  label: 'React (Vite)',
  scaffold: viteScaffold('react', true),
  framework: 'react',
  html: true,
  vite: true,
  routeUnit: 'src/pages/<kebab>/{Name}Page.tsx',
  hooksSlot: { label: 'Hooks', path: 'src/lib/hooks/ (use*)' },
  store: { label: 'Zustand', dependency: 'zustand' },
  ignores: [],
  naming: NAMING.react,
  folderNaming: FOLDER_NAMING.react,
  hooksAlias: HOOKS_ALIAS,
  styleEntry: 'src/index.css',
  vitePlugin: {
    imports: [
      "import react, { reactCompilerPreset } from '@vitejs/plugin-react';",
      "import babel from '@rolldown/plugin-babel';",
    ],
    calls: [
      'react()',
      `...(${OUTSIDE_TESTS} ? [babel({ presets: [reactCompilerPreset()] })] : [])`,
    ],
  },
  tsconfig: { jsx: 'react-jsx' },
  starterTests: [{ source: 'starter/react/App.test.tsx', target: 'src/App.test.tsx', covers: 'src/App.tsx' }],
  staleScaffoldFiles: ['tsconfig.app.json', 'tsconfig.node.json'],
  typecheck: 'tsc --noEmit',
  testDevDependencies: ['@testing-library/dom', '@testing-library/react'],
  devDependencies: [
    ...COMMON_REACT_PLUGINS,
    '@vitejs/plugin-react',
    // Peer dependencies of the React Compiler's babel-based transport in `@vitejs/plugin-react` v6; not optional
    // extras.
    '@rolldown/plugin-babel',
    '@babel/core',
    '@types/babel__core',
    'babel-plugin-react-compiler',
  ],
  allowBuilds: [],
  stateRules: ['react-state.md', 'hooks-order.md'],
  routerMocks: true,
};
