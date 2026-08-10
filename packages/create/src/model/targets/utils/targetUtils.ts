import type { AliasMap } from '../../answers/answers';
import type { ScaffoldSpec } from '../record';

/**
 * `--no-interactive` forces the piped behaviour `create-vite` otherwise skips only under a TTY. `--eslint` is
 * React-only: the default instead writes `.oxlintrc.json`, which stage 2 doesn't know about and which would sit in an
 * ESLint project forever. The `-ts` template unconditionally: this CLI generates TypeScript only.
 */
export const viteScaffold = (template: string, eslint = false) => {
  return (name: string): ScaffoldSpec => {
    return {
      kind: 'create',
      args: [
        'vite',
        name,
        '--template',
        `${template}-ts`,
        ...(eslint ? ['--eslint'] : []),
        '--no-interactive',
        '--no-immediate',
      ],
    };
  };
};

// Leading tabs to two spaces. SvelteKit indents its templates with tabs; `no-tabs` has no fixer.
export const tabsToSpaces = (source: string): string => {
  return source.replaceAll(/^[ \t]+/gm, (indent) => {
    return indent.replaceAll('\t', '  ');
  });
};

export const HOOKS_ALIAS: AliasMap = { '@hooks/*': './src/lib/hooks/*' };

export const COMMON_REACT_PLUGINS = ['@eslint-react/eslint-plugin', 'eslint-plugin-react-hooks'];

const ASSET_REQUIRE = /require\('([^']+\.(?:png|jpe?g|gif|webp|avif|svg))'\)/g;

// A binding name off the asset's filename, forced into a legal identifier: `-` marks a camelCase hump, every other
// illegal character is dropped (`icon@2x.png`, `logo.dark.png`), and a name still opening with a digit takes a prefix.
const bindingFor = (path: string): string => {
  const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.\w+$/, '');
  const camel = base.replaceAll(/-(\w)/g, (_match, letter: string) => {
    return letter.toUpperCase();
  });
  const name = `${camel.replaceAll(/\W/g, '')}Asset`;

  return /^\d/.test(name) ? `asset${name}` : name;
};

/**
 * Rewrites `require('./x.png')` into a real import, one binding per distinct asset: `require` is declared to return
 * `any`, so every asset arrived as one and tripped `no-unsafe-assignment`, where an import instead typechecks against
 * `src/typings/assets.d.ts`. Imports are left unsorted since stage 6's `eslint --fix` reorders them anyway.
 */
export const esmAssetImports = (source: string): string => {
  const bindings = new Map<string, string>();
  // How many paths have already claimed a base name; two assets sharing a filename in different directories would
  // otherwise collide on one `const`, so the second onward is numbered.
  const claimed = new Map<string, number>();

  const rewritten = source.replaceAll(ASSET_REQUIRE, (_match, path: string) => {
    const existing = bindings.get(path);

    if (existing !== undefined) {
      return existing;
    }

    const base = bindingFor(path);
    const taken = claimed.get(base) ?? 0;
    const name = taken === 0 ? base : `${base}${String(taken + 1)}`;

    claimed.set(base, taken + 1);
    bindings.set(path, name);

    return name;
  });

  if (bindings.size === 0) {
    return source;
  }

  const imports = [...bindings].map(([path, name]) => {
    return `import ${name} from '${path}';`;
  });

  return `${imports.join('\n')}\n${rewritten}`;
};
