import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  type Library,
  type TargetId,
} from '../../model/answers/answers';

import { emitViteConfig } from './emitViteConfig';

interface AnswerOverrides {
  target?: TargetId;
  libraries?: Library[];
}

const configFor = (overrides: AnswerOverrides): string | null => {
  const answers: Answers = { ...DEFAULT_ANSWERS, ...overrides };
  return emitViteConfig(answers);
};

describe('emitViteConfig', () => {
  it('writes nothing for the two targets that own their own build', () => {
    expect(configFor({ target: 'next' })).toBeNull();
    expect(configFor({ target: 'angular' })).toBeNull();
  });

  it('imports and calls the framework plugin', () => {
    const react = configFor({ target: 'react' }) ?? '';

    expect(react).toContain("import react, { reactCompilerPreset } from '@vitejs/plugin-react';");
    expect(react).toContain('    react(),\n');
  });

  // One call per line: React's compiler call plus tailwind joined is 128 characters, over the emitted config's own 120
  // max-len with no fixer.
  it('keeps every plugin call inside the line length it emits for itself', () => {
    const react = configFor({ target: 'react', libraries: ['tailwind'] }) ?? '';

    expect(react.split('\n').every((line) => {
      return line.length <= 120;
    })).toBe(true);
  });

  // `crx` is not a framework plugin but occupies the same slot: it turns a vanilla build into an extension build by
  // reading the manifest.
  it('builds the extension from its manifest rather than from a framework plugin', () => {
    const extension = configFor({ target: 'webextension' }) ?? '';

    expect(extension).toContain("import { crx } from '@crxjs/vite-plugin';");
    expect(extension).toContain("import manifest from './manifest.json';");
    expect(extension).toContain('    crx({ manifest }),');
  });

  it('stacks tailwind after whatever plugin the target already had', () => {
    expect(configFor({ target: 'webextension', libraries: ['tailwind'] }) ?? '')
      .toContain('plugins: [\n    crx({ manifest }),\n    tailwindcss(),\n  ],');
    expect(configFor({ target: 'vue', libraries: ['tailwind'] }) ?? '')
      .toContain('plugins: [\n    vue(),\n    tailwindcss(),\n  ],');
  });

  it('leaves tailwind out when it was not chosen', () => {
    expect(configFor({ target: 'vue' }) ?? '').not.toContain('tailwind');
  });
});
