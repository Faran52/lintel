import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

// Plain JavaScript, for rules that never touch TypeScript syntax.
export const jsRuleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

// TypeScript without JSX.
export const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

// TypeScript with JSX enabled: prefer-arrow-functions needs this to disambiguate a generic
// parameter from a JSX tag, and prefer-destructured-props for its JSX fixtures.
export const tsxRuleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});
