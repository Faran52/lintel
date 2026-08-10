import {
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { extname, join } from 'node:path';

import { targetFor } from '../../model/targets';
import { isAbsence } from '../utils/fsUtils';

import type { TargetId } from '../../model/answers/answers';

// Confined to `src/`, ungated on `fresh` (unlike `repair.ts`): a non-compiling source is never a decision the project
// made.

// The generator's own source lives here for all eight targets.
export const SOURCE_ROOT = 'src';

const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

// The specifier position of an import; the `(?<!\.d)` guard keeps `./types.d.ts`, extension and all, out of it.
const RELATIVE_TS_IMPORT
  = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"\n]*?)(?<!\.d)\.[cm]?tsx?\2/g;

// A named import clause, captured as its specifier list and the module it comes from.
const IMPORT_CLAUSE = /import\s+\{([^}]*)\}\s+from\s+(['"])([^'"]+)\2/g;

/**
 * Drops the extension from relative `.ts`/`.tsx` imports. Every Vite template's entry has one, which compiles only
 * under `allowImportingTsExtensions`, a bundler-only escape hatch the emitted tsconfig leaves off; rewriting three
 * lines beats carrying that flag for the project's whole life.
 */
export const stripTsExtensions = (source: string): string => {
  return source.replace(RELATIVE_TS_IMPORT, '$1$2$3$2');
};

// Adds the inline `type` modifier to type-only named imports, since the Angular CLI writes clauses
// `verbatimModuleSyntax` rejects with TS1484 otherwise; applied per specifier, as one clause can mix kinds.
export const markTypeOnlyImports = (
  source: string,
  typeOnly: Record<string, string[]>,
): string => {
  return source.replace(IMPORT_CLAUSE, (clause, specifiers: string, quote: string, module: string) => {
    const names = typeOnly[module];

    if (names === undefined) {
      return clause;
    }

    const rewritten = specifiers.split(',').map((specifier) => {
      const name = specifier.trim();
      return names.includes(name) ? specifier.replace(name, `type ${name}`) : specifier;
    });

    return `import {${rewritten.join(',')}} from ${quote}${module}${quote}`;
  });
};

// A DOM lookup immediately followed by `!`, anchored to `document.` and a string literal so a general sweep doesn't
// strip assertions the author meant or hoist side effects out of a call expression's statement.
const DOM_LOOKUP_ASSERTION
  = /document\.(getElementById|querySelector)(<[^>]+>)?\((['"])([^'"]+)\3\)!/g;

// An already-hoisted lookup, which Solid's template writes, asserted at the use site instead.
const HOISTED_LOOKUP = new RegExp(
  [
    '^([ \\t]*)const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*',
    'document\\.(?:getElementById|querySelector)\\(([\'"])([^\'"]+)\\3\\);?[ \\t]*$',
  ].join(''),
  'm',
);

// `getElementById('root')` looks for `#root`; `querySelector('#app')` already reads as one.
const asSelector = (method: string, argument: string): string => {
  return method === 'getElementById' ? `#${argument}` : argument;
};

const guardFor = (name: string, selector: string, indent: string): string => {
  return [
    `${indent}if (!${name}) {`,
    `${indent}  throw new Error('Element ${selector} not found');`,
    `${indent}}`,
  ].join('\n');
};

/**
 * Replaces a template's non-null mount-lookup assertion with a guard naming the selector, so the failure explains
 * itself instead of surfacing as `Cannot read properties of null`; handles React/vanilla's inline assert and Solid's
 * already-hoisted one, leaving anything else untouched.
 */
export const guardMountLookups = (source: string): string => {
  const hoisted = HOISTED_LOOKUP.exec(source);

  if (hoisted) {
    const [line, indent = '', name = '', , argument = ''] = hoisted;
    const method = line.includes('getElementById') ? 'getElementById' : 'querySelector';

    // Idempotent: the hoisted shape is what this function produces, so a re-run under `--skip-scaffold` would
    // otherwise stack a duplicate guard.
    const guarded = new RegExp(`if\\s*\\(!${name}\\b`).test(source)
      ? source
      : source.replace(line, `${line}\n\n${guardFor(name, asSelector(method, argument), indent)}`);

    // Only the asserted uses lose their `!`; an unasserted read of the same binding is untouched.
    return guarded.replaceAll(new RegExp(`\\b${name}!`, 'g'), name);
  }

  // Split rather than a multiline regex: matching indent and body in one pattern makes the two
  // halves ambiguous, and it backtracks across every line of a long template.
  return source.split('\n').map((line) => {
    const matches = [...line.matchAll(DOM_LOOKUP_ASSERTION)];

    if (matches.length === 0) {
      return line;
    }

    /**
     * Each match is hoisted above its line, correct even inside a template literal since every occurrence here starts
     * the statement containing it. The indent is sliced rather than matched: `/^[ \t]*\/` always matches (leaving
     * `?? ''` unreachable) and the inverse pattern backtracks (`sonarjs/super-linear-regex`).
     */
    const indent = line.slice(0, line.length - line.trimStart().length);
    const declarations: string[] = [];

    const rewritten = matches.reduce((text, [expression, method = '', , , argument = '']) => {
      // `#app` -> `app`, `root` -> `root`: a non-identifier character cannot reach a binding.
      const name = argument.replace(/[^\w$]/g, '');

      declarations.push(
        `${indent}const ${name} = ${expression.slice(0, -1)};`,
        '',
        guardFor(name, asSelector(method, argument), indent),
        '',
      );

      return text.replace(expression, name);
    }, line);

    return [...declarations, rewritten].join('\n');
  }).join('\n');
};

export const sourceFiles = async (root: string): Promise<string[]> => {
  try {
    const entries = await readdir(root, { withFileTypes: true, recursive: true });

    return entries
      .filter((entry) => {
        return entry.isFile() && SCRIPT_EXTENSIONS.has(extname(entry.name));
      })
      .map((entry) => {
        return join(entry.parentPath, entry.name);
      });
  }
  catch (error) {
    // No `src/` (`--skip-scaffold` against a repo keeping source elsewhere) is not an error; other failures still are.
    if (isAbsence(error)) {
      return [];
    }

    throw error;
  }
};

// The entry module a bundler mounts from (`main`/`index` directly under `src/`); confined to it since the pattern is
// legitimate to write by hand and `--skip-scaffold` points this pass at a long-lived repository.
const isMountEntry = (path: string, root: string): boolean => {
  const relative = path.slice(root.length + 1);

  return !relative.includes('/') && /^(?:main|index)\.[cm]?tsx?$/.test(relative);
};

export const rewriteScaffoldedSource = async (
  cwd: string,
  target: TargetId,
  onWrite?: (path: string) => void,
): Promise<void> => {
  const { typeOnlyImports } = targetFor(target);
  const root = join(cwd, SOURCE_ROOT);

  for (const path of await sourceFiles(root)) {
    const before = await readFile(path, 'utf8');
    const extensionless = stripTsExtensions(before);
    const typed = typeOnlyImports === undefined
      ? extensionless
      : markTypeOnlyImports(extensionless, typeOnlyImports);
    const after = isMountEntry(path, root) ? guardMountLookups(typed) : typed;

    if (after !== before) {
      await writeFile(path, after, 'utf8');
      onWrite?.(path.slice(cwd.length + 1));
    }
  }
};
