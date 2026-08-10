// The same two presets every generated project gets. No `postcss-html` override: that is for single-file
// components, and a library monorepo has none. CLAUDE.md carries why the gate runs on a workspace with no CSS.
const config = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recess-order',
  ],
};

export default config;
