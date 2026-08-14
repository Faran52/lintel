import { type Answers, hasLibrary } from '../../model/answers/answers';
import { targetFor } from '../../model/targets';

// Emits `stylelint.config.js`; `stylelint-config-tailwindcss` teaches it the at-rules Tailwind adds, without which
// every `@apply` is an unknown-at-rule error.

interface StyleOverride {
  files: string;
  body: string[];
}

// Stylelint reads a `.vue` or `.svelte` file as plain CSS unless handed a syntax that knows where the `<style>` block
// starts; with no `customSyntax` those styles go unlinted entirely.
const sfcOverride = (extension: string): StyleOverride => {
  return {
    files: `**/*.${extension}`,
    body: ["customSyntax: 'postcss-html',"],
  };
};

// A CSS module's class names are camelCase JS properties by design; `stylelint-config-standard`'s kebab-case demand is
// the one finding `stylelint --fix` can't clear.
const CSS_MODULE_OVERRIDE: StyleOverride = {
  files: '**/*.module.css',
  body: [
    'rules: {',
    "  'selector-class-pattern': '^[a-z][a-zA-Z0-9]*$',",
    '},',
  ],
};

/**
 * A Tailwind 4 `@custom-variant` body is a bare `&` rule by design, with the at-rule as its scoping root, which
 * stylelint reads as dangling. `stylelint-config-tailwindcss` teaches `at-rule-no-unknown` about it and stops there.
 * Off for a Tailwind project only, the one place the shape is idiomatic rather than a mistake.
 */
const TAILWIND_RULES = [
  'rules: {',
  "  'nesting-selector-no-missing-scoping-root': null,",
  '},',
];

const overridesFor = (overrides: StyleOverride[]): string => {
  const blocks = overrides.map(({ files, body }) => {
    const lines = body.map((line) => {
      return `      ${line}`;
    });

    return `    {\n      files: ['${files}'],\n${lines.join('\n')}\n    },`;
  });

  return `\n  overrides: [\n${blocks.join('\n')}\n  ],`;
};

export const emitStylelintConfig = (answers: Answers): string => {
  const extended = [
    'stylelint-config-standard',
    'stylelint-config-recess-order',
    ...(hasLibrary(answers, 'tailwind') ? ['stylelint-config-tailwindcss'] : []),
  ];

  const entries = extended
    .map((name) => {
      return `    '${name}',`;
    })
    .join('\n');

  const { sfcExtension } = targetFor(answers);
  const overrides = overridesFor([
    ...(sfcExtension === undefined ? [] : [sfcOverride(sfcExtension)]),
    CSS_MODULE_OVERRIDE,
  ]);

  const rules = hasLibrary(answers, 'tailwind')
    ? `\n  ${TAILWIND_RULES.join('\n  ')}`
    : '';

  return `const config = {\n  extends: [\n${entries}\n  ],${rules}${overrides}\n};\n\nexport default config;\n`;
};
