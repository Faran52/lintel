import {
  describe,
  expect,
  it,
} from 'vitest';

import { DEFAULT_ANSWERS } from '../answers/answers';

import { reactNative } from './reactNative';
import { esmAssetImports } from './utils/targetUtils';

const transformFor = (path: string): (source: string) => string => {
  const fix = (reactNative.starterFixes ?? []).find((entry) => {
    return entry.path === path;
  });

  if (fix?.transform === undefined) {
    throw new Error(`no transform for ${path}`);
  }

  return fix.transform;
};

describe('scaffold', () => {
  it('writes the exact argv for the default answers', () => {
    expect(reactNative.scaffold('demo-app', DEFAULT_ANSWERS)).toEqual({
      kind: 'create',
      args: ['expo-app@latest', 'demo-app', '--yes', '--no-install'],
    });
  });
});

describe('starterFixes', () => {
  it('wires the four plain asset-only files straight to esmAssetImports', () => {
    for (const path of [
      'src/app/explore.tsx',
      'src/components/animated-icon.web.tsx',
      'src/components/app-tabs.tsx',
      'src/components/web-badge.tsx',
    ]) {
      expect(transformFor(path)).toBe(esmAssetImports);
    }
  });

  it("rewrites the animated icon's asset require and unwinds its finally-only promise chain", () => {
    const source = [
      '      onLayout={() => {',
      '        SplashScreen.hideAsync().finally(() => {',
      '          setAnimate(true);',
      '        });',
      '      }}',
      "      source={require('@/assets/images/expo-logo.png')}",
      '',
    ].join('\n');

    const output = transformFor('src/components/animated-icon.tsx')(source);

    expect(output).toContain("import expoLogoAsset from '@/assets/images/expo-logo.png';");
    expect(output).toContain('const reveal = async (): Promise<void> => {');
    expect(output).toContain('await SplashScreen.hideAsync();');
    expect(output).toContain('void reveal();');
    expect(output).not.toContain('.finally(');
  });

  it("voids expo's floating splash screen call", () => {
    const output = transformFor('src/app/_layout.tsx')('SplashScreen.preventAutoHideAsync();\n');

    expect(output).toBe('void SplashScreen.preventAutoHideAsync();\n');
  });

  it('drops async from the link handler and voids the browser call it awaited', () => {
    const source = [
      '      onPress={async (event) => {',
      "        if (process.env.EXPO_OS !== 'web') {",
      '          await openBrowserAsync(href, {',
      '            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,',
      '          });',
      '        }',
      '      }}',
      '',
    ].join('\n');

    const output = transformFor('src/components/external-link.tsx')(source);

    expect(output).toContain('onPress={(event) => {');
    expect(output).toContain('void openBrowserAsync(href, {');
    expect(output).not.toContain('await openBrowserAsync');
    expect(output).not.toContain('async (event)');
  });

  it('removes the two themed-view props nothing reads', () => {
    const source = [
      'export type ThemedViewProps = ViewProps & {',
      '  lightColor?: string;',
      '  darkColor?: string;',
      '  type?: ThemeColor;',
      '};',
      '',
      'export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {',
      '  return null;',
      '}',
      '',
    ].join('\n');

    const output = transformFor('src/components/themed-view.tsx')(source);

    expect(output).not.toContain('lightColor');
    expect(output).not.toContain('darkColor');
    expect(output).toContain('export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {');
  });

  it('replaces the hydration effect with a synced external store read', () => {
    const source = [
      "import { useEffect, useState } from 'react';",
      '',
      'export function useColorScheme() {',
      '  const [hasHydrated, setHasHydrated] = useState(false);',
      '',
      '  useEffect(() => {',
      '    setHasHydrated(true);',
      '  }, []);',
      '',
      '  return hasHydrated;',
      '}',
      '',
    ].join('\n');

    const output = transformFor('src/hooks/use-color-scheme.web.ts')(source);

    expect(output).toContain("import { useSyncExternalStore } from 'react';");
    expect(output).toContain('const hasHydrated = useSyncExternalStore(');
    expect(output).not.toContain('useEffect');
    expect(output).not.toContain('setHasHydrated');
  });
});
