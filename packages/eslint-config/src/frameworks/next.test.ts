import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ruleIdsFor, startsWith } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import base from '../base';

import next from './next';
import react from './react';

import type { Linter } from 'eslint';

describe('next', () => {
  it('reports a raw <img>, which is the rule eslint-config-next exists for', async () => {
    const code = 'export const Page = () => {\n  return <img src="/a.png" alt="a" />;\n};\n';
    const ruleIds = await ruleIdsFor([...react(), ...next()], code, 'src/app/page.tsx');

    expect(ruleIds.some(startsWith('@next/next/'))).toBe(true);
  });

  it('turns off the eslint-plugin-import rules that duplicate import-x', async () => {
    const code = "import { missing } from './nowhere';\n\nexport const value = missing;\n";
    const ruleIds = await ruleIdsFor([...base(), ...react(), ...next()], code, 'src/app/page.tsx');

    expect(ruleIds).not.toContain('import/no-unresolved');
    expect(ruleIds).toContain('import-x/no-unresolved');
  });

  // Structural, not behavioural: pnpm resolves one `@typescript-eslint/eslint-plugin` instance here, so the
  // collision this guards against cannot be reproduced; in a consumer's tree they are two copies and it throws.
  it('registers no @typescript-eslint plugin of its own', () => {
    const registrations = next().filter((entry) => {
      return entry.plugins !== undefined && '@typescript-eslint' in entry.plugins;
    });

    expect(registrations).toEqual([]);
  });

  // Next's first entry claims every TS extension for its own bundled pre-ESLint-10 parser, so something after
  // it must re-assert a working one or `.tsx` files die on `scopeManager.addGlobals is not a function`.
  it('still points TypeScript files at a parser after dropping the plugin key', () => {
    const parsers = next().filter((entry) => {
      return entry.files?.includes('**/*.tsx') === true
        && entry.languageOptions?.['parser'] !== undefined;
    });

    expect(parsers.length).toBeGreaterThan(0);
  });

  // Nothing re-asserts a working parser for plain JavaScript, so upstream's Babel parser has to
  // go rather than be overridden; its globals stay.
  it('claims no parser for javascript, whose config files nothing else re-asserts', () => {
    const jsParsers = next().filter((entry) => {
      return entry.files?.some((glob) => {
        return typeof glob === 'string' && glob.includes('js');
      }) === true
      && entry.languageOptions?.['parser'] !== undefined
      && !entry.files.includes('**/*.tsx');
    });

    expect(jsParsers).toEqual([]);

    const withGlobals = next().filter((entry) => {
      return entry.languageOptions?.['globals'] !== undefined;
    });

    expect(withGlobals.length).toBeGreaterThan(0);
  });

  // Pinned because `eslint-config-next`'s bundled `eslint-plugin-react` detects the version via
  // `context.getFilename()`, removed in ESLint 10.
  const reactVersionEntry = (): Linter.Config | undefined => {
    return next().find((entry) => {
      return entry.name === '@linteljs/next/react-version';
    });
  };

  it('pins the react version this workspace has installed', () => {
    expect(JSON.stringify(reactVersionEntry()?.settings)).toMatch(/^\{"react":\{"version":"\d+\./);
  });

  // A planted react rather than an empty directory: vitest puts the pnpm store on `NODE_PATH`,
  // so the real react resolves from any working directory and an empty one proves nothing.
  const withPlantedReact = async (manifest: string, assert: () => void): Promise<void> => {
    const root = await mkdtemp(join(tmpdir(), 'lintel-react-'));
    const spy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    try {
      await mkdir(join(root, 'node_modules', 'react'), { recursive: true });
      await writeFile(join(root, 'node_modules', 'react', 'package.json'), manifest, 'utf8');
      assert();
    }
    finally {
      spy.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  };

  it('omits the pin where no manifest resolves, rather than throwing', async () => {
    await withPlantedReact('{"name":"react","version":"9.9.9","exports":{".":"./index.js"}}', () => {
      expect(reactVersionEntry()).toBeUndefined();
    });
  });

  // Only absence is data: a corrupt manifest throws ERR_INVALID_PACKAGE_CONFIG rather than reading as absent.
  it('throws on a manifest that is present but corrupt', async () => {
    await withPlantedReact('not json at all', () => {
      expect(reactVersionEntry).toThrow();
    });
  });

  it('omits the pin where the manifest names no version, rather than inventing one', async () => {
    await withPlantedReact('{"name":"react"}', () => {
      expect(reactVersionEntry()).toBeUndefined();
    });
  });

  // A manifest is somebody else's file and can hold anything.
  it('omits the pin where version is present but not a string', async () => {
    await withPlantedReact('{"name":"react","version":19}', () => {
      expect(reactVersionEntry()).toBeUndefined();
    });
  });

  it('reads the planted version rather than one baked into the layer', async () => {
    await withPlantedReact('{"name":"react","version":"9.9.9"}', () => {
      expect(reactVersionEntry()?.settings).toEqual({ react: { version: '9.9.9' } });
    });
  });
});
