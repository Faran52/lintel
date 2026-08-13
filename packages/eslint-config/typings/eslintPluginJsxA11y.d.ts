/**
 * `eslint-plugin-jsx-a11y` publishes no types at all, so importing it is an implicit `any` under this package's
 * `noImplicitAny`. Declared in ESLint's own terms instead, with the one preset the layers read: `flatConfigs`, since
 * `configs` is still the eslintrc form that flat config rejects.
 *
 * Delete this file once the plugin ships its own declarations.
 */
declare module 'eslint-plugin-jsx-a11y' {
  import type { ESLint, Linter } from 'eslint';

  interface JsxA11yPlugin extends ESLint.Plugin {
    flatConfigs: {
      recommended: Linter.Config;
      strict: Linter.Config;
    };
  }

  const plugin: JsxA11yPlugin;

  export default plugin;
}
