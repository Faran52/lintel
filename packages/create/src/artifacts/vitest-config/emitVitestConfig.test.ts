import {
  describe,
  expect,
  it,
} from 'vitest';

import { DEFAULT_ANSWERS } from '../../model/answers/answers';

import { emitVitestConfig } from './emitVitestConfig';

import type { TargetId, Testing } from '../../model/answers/answers';

interface AnswerOverrides {
  target?: TargetId;
  testing?: Testing;
}

const configFor = (overrides: AnswerOverrides = {}): string | null => {
  return emitVitestConfig({ ...DEFAULT_ANSWERS, ...overrides });
};

describe('emitVitestConfig', () => {
  it('writes nothing when testing is declined', () => {
    expect(configFor({ testing: 'none' })).toBeNull();
  });

  it('merges the vite config where the target builds with vite', () => {
    const output = configFor({ target: 'react' });

    expect(output).toContain("import viteConfig from './vite.config.js';");
    expect(output).toContain('mergeConfig(');
  });

  it('carries the compiler plugin where the target has no vite config to merge', () => {
    const output = configFor({ target: 'angular' });

    expect(output).not.toContain('mergeConfig(');
    expect(output).toContain("import angular from '@analogjs/vite-plugin-angular';");
    expect(output).toContain("plugins: [angular({ tsconfig: './tsconfig.json' })],");
  });

  it('names the setup file the artifact list writes', () => {
    expect(configFor()).toContain("setupFiles: ['./__mocks__/setupTests.ts']");
    expect(configFor({ target: 'react-native' })).toContain("setupFiles: ['./__mocks__/setupTests.ts']");
  });

  it('covers the single-file component extension where the target has one', () => {
    expect(configFor({ target: 'vue' })).toContain(',vue}');
    expect(configFor({ target: 'react' })).not.toContain('vue');
  });

  /**
   * Svelte and Solid ship a server build and a client build behind export conditions; without the condition vitest
   * resolves the server half and the first component rendered throws.
   * Written per target, not as one loop, so a target added without conditions has to be listed here on purpose.
   */
  it.each<[TargetId, string]>([
    ['svelte', "resolve: { conditions: ['browser'] },"],
    ['solid', "resolve: { conditions: ['development', 'browser'] },"],
  ])('gives %s the resolve conditions its runtime needs', (target, expected) => {
    expect(configFor({ target })).toContain(expected);
  });

  it.each<TargetId>(['react', 'next', 'vue', 'angular', 'webextension'])(
    'leaves %s on the default resolution',
    (target) => {
      expect(configFor({ target })).not.toContain('conditions');
    },
  );
});
