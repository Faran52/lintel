import {
  describe,
  expect,
  it,
} from 'vitest';

import base from '../base';

import { presetOf } from './presetUtils';

describe('presetOf', () => {
  it('wraps a single flat config in an array', () => {
    const config = { name: 'probe', rules: {} };

    expect(presetOf(config, 'probe')).toEqual([config]);
  });

  it('passes an array of flat configs through', () => {
    const configs = [{ name: 'probe/one' }, { name: 'probe/two' }];

    expect(presetOf(configs, 'probe')).toBe(configs);
  });

  it('throws when the plugin publishes no such preset', () => {
    expect(() => {
      return presetOf(undefined, 'probe/missing');
    }).toThrow(/probe\/missing is not published/);
  });

  it('throws on an eslintrc config, which flat config would reject far from here', () => {
    expect(() => {
      return presetOf({ plugins: ['probe'], rules: {} }, 'probe/legacy');
    }).toThrow(/probe\/legacy is an eslintrc config/);
  });
});

describe('base: resolver', () => {
  it('leaves the upstream resolver setting alone by default', () => {
    const settings = base().find((config) => {
      return config.settings?.['import-x/resolver'];
    })?.settings;

    expect(settings?.['import-x/resolver']).toEqual({ typescript: true });
    // The whole point of spreading the upstream config: these three come with it.
    expect(settings).toHaveProperty('import-x/parsers');
    expect(settings).toHaveProperty('import-x/extensions');
    expect(settings).toHaveProperty('import-x/external-module-folders');
  });

  it('points the resolver at a named tsconfig when one is supplied', () => {
    const layer = base({ resolver: { project: 'packages/*/tsconfig.json' } });
    const settings = layer.find((config) => {
      return config.settings?.['import-x/resolver'];
    })?.settings;

    expect(settings?.['import-x/resolver']).toEqual({ typescript: { project: 'packages/*/tsconfig.json' } });
    expect(settings).toHaveProperty('import-x/parsers');
  });
});
