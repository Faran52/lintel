// Mechanical floor for `.claude/rules/type-standards.md`, run by both the pre-commit task and the
// PostToolUse(Edit|Write) hook. `@linteljs/create sync` restores this file when missing but never overwrites it.
import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

interface BannedPattern {
  name: string;
  re: RegExp;
  // Test the raw line rather than the string- and comment-stripped one.
  raw?: boolean;
  // Shapes the rule file grants explicitly. A line matching one of these is not a hit.
  allowed?: RegExp[];
}

// The two shapes `type-standards.md` grants `unknown`: a narrowing guard's parameter, and the `JSON.parse` payload it
// narrows.
const NARROWING_GUARD = /:\s*unknown\b[^)]*\)\s*:\s*\w+\s+is\s/;
const PARSED_JSON = /:\s*unknown\s*=\s*JSON\.parse\(/;

// A dynamically imported namespace is typed `any`; granted the same as `JSON.parse` for the same narrowing-boundary
// reason.
const DYNAMIC_IMPORT = /:\s*unknown\s*=\s*await import\(/;

/**
 * A thrown value, which `catch` binds as `unknown` by language rule under `useUnknownInCatchVariables`. Matched on
 * the whole parameter list rather than on `: unknown` anywhere in it, and on the three conventional names for a
 * caught value, so it grants a single-argument helper turning a throw into something readable and nothing else.
 *
 * Structural evidence is not available here: TypeScript has no distinct type for a caught value, so the line carries
 * no shape a regex could key on instead of the name.
 */
const CAUGHT_VALUE = /\(\s*(?:error|cause|reason)\s*:\s*unknown\s*\)/;

// Tested against the raw line: the strip below hides comments, and a directive lives inside one.
const directive = (name: string): RegExp => {
  return new RegExp(`(?://|/\\*)\\s*${name}`);
};

// Plain `as X` is not gated: tsc already rejects non-overlapping casts, and a regex fires on `import * as x` and `catch
// (e) as`.
const BANNED: BannedPattern[] = [
  { name: 'as never', re: /\bas never\b/ },
  { name: 'as unknown', re: /\bas unknown\b/ },
  { name: ': unknown', re: /:\s*unknown\b/, allowed: [NARROWING_GUARD, PARSED_JSON, DYNAMIC_IMPORT, CAUGHT_VALUE] },
  { name: '=> unknown', re: /=>\s*unknown\b/ },
  { name: 'unknown[]', re: /unknown\[]/ },
  { name: '<unknown>', re: /<unknown[,>]/ },
  { name: '@ts-ignore', re: directive('@ts-ignore'), raw: true },
  { name: '@ts-expect-error', re: directive('@ts-expect-error'), raw: true },
  { name: 'eslint-disable', re: directive('eslint-disable'), raw: true },
  { name: 'Record<string, unknown>', re: /Record<string,\s*unknown>/ },
  { name: 'index signature', re: /\[[A-Za-z_]\w*:\s*(?:string|number|symbol)]/ },
];

// Add project-specific patterns here. Empty by default.
const PROJECT_BANNED: BannedPattern[] = [];

// The checker itself holds the patterns as data, so scanning it would self-flag.
const BASE_SKIPPED = ['/scripts/'];

// Add an exemption here with the reason beside it; each case is documented in `.claude/rules/type-standards.md`.
const PROJECT_SKIPPED: string[] = [
  // `Extract<PluginConfig, { rules?: unknown }>` is a type-level wildcard; no value here is ever typed `unknown`.
  'packages/eslint-config/src/utils/presetUtils.ts',

  // `readJson` answers `Record<string, unknown>`, and `ruleIdsIn` narrows the `any` `ESLint.calculateConfigForFile`
  // returns; neither is a shape a regex can confirm as narrowed.
  'packages/eslint-plugin/src/meta.test.ts',

  // Shipped template text written against this floor, not to it: emitted for a `typeSafety: relaxed` project, where an
  // index signature and `=> unknown` are the point.
  'packages/create/assets/typings/',

  // React Native's mocks/starter tests carry `: unknown`/`Record<string, unknown>` a strict project's own checker would
  // block; tracked debt in type-standards.md, not a grant.
  'packages/create/assets/mocks/',
  'packages/create/assets/starter/',
];

const patterns: BannedPattern[] = [...BANNED, ...PROJECT_BANNED];
const skipped: string[] = [...BASE_SKIPPED, ...PROJECT_SKIPPED];

const isSkipped = (filePath: string): boolean => {
  return skipped.some((fragment) => {
    return filePath.includes(fragment) || filePath.startsWith(fragment.replace(/^\//, ''));
  });
};

// `import * as x`, re-export braces and rename clauses all contain `as` in a position that's never a type assertion.
const isAliasOrImportLine = (line: string): boolean => {
  return line.includes('* as ')
    || /^\s*import\b/.test(line)
    || /^\s*export\s+(?:type\s+)?\{/.test(line)
    || /^\s*(?:type\s+)?[A-Za-z_]\w*\s+as\s+[A-Za-z_]\w*,?\s*$/.test(line);
};

// Same width, same line count, so every reported line number still points where it did.
const blankSpan = (match: string): string => {
  return match.replace(/[^\n]/g, ' ');
};

// Blanks comments before template literals, across the whole file: prose backticks are unbalanced, so pairing them
// first would blank real code.
const blankMultilineSpans = (content: string): string => {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, blankSpan)
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, blankSpan);
};

// What is left after the pass above: single-line strings and line comments.
const stripStringsAndComments = (line: string): string => {
  return line
    .replace(/\\['"]/g, '  ')
    .replace(/'[^']*'|"[^"]*"/g, blankSpan)
    .replace(/\/\/.*/, '');
};

const SCRIPT_FILE = /\.[cm]?tsx?$/;
const SFC_FILE = /\.(?:vue|svelte)$/;
const SFC_SCRIPT_BLOCK = /(<script\b[^>]*>)([\s\S]*?)<\/script>/gi;

// The `<script>` blocks of a .vue/.svelte file, blanked rather than dropped so line numbers still match; a rendered
// code sample would otherwise quote the very shapes this bans.
const scriptBlocksOnly = (content: string): string => {
  let output = '';
  let cursor = 0;

  for (const match of content.matchAll(SFC_SCRIPT_BLOCK)) {
    const [, open = '', body = ''] = match;

    output += blankSpan(content.slice(cursor, match.index)) + blankSpan(open) + body;
    cursor = match.index + open.length + body.length;
  }

  return output + blankSpan(content.slice(cursor));
};

const files: string[] = argv.slice(2);
let failed = false;

for (const file of files) {
  const sfc = SFC_FILE.test(file);

  if (!(sfc || SCRIPT_FILE.test(file)) || isSkipped(file)) {
    continue;
  }

  let content = '';

  try {
    content = readFileSync(file, 'utf8');
  }
  catch {
    continue;
  }

  const hits: string[] = [];
  // Same line count, so `source[index]` is the scannable half of the line reported as `line`.
  const source = blankMultilineSpans(sfc ? scriptBlocksOnly(content) : content).split('\n');

  for (const [index, line] of content.split('\n').entries()) {
    // `continue`, not `return`: this skips one line, which is what the callback's `return` meant before the loop was
    // a loop rather than a `forEach`.
    if (isAliasOrImportLine(line)) {
      continue;
    }

    const scrubbed = stripStringsAndComments(source[index] ?? '');

    const match = patterns.find((pattern) => {
      const subject = pattern.raw === true ? line : scrubbed;

      return pattern.re.test(subject) && !pattern.allowed?.some((shape) => {
        return shape.test(subject);
      });
    });

    if (match) {
      hits.push(`${String(index + 1)}: ${line.trim()}  [${match.name}]`);
    }
  }

  if (hits.length > 0) {
    console.error(`✘ Banned pattern in ${file}:`);

    for (const hit of hits) {
      console.error(`  ${hit}`);
    }

    failed = true;
  }
}

if (failed) {
  console.error('\n→ Fix the source: build the real type, from its owner.');
  console.error('  See .claude/rules/type-standards.md.');
  exit(1);
}

exit(0);
