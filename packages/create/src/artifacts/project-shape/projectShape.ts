/**
 * What a project already holds, for each file this CLI has more than one spelling of. Both routes that write artifacts
 * plan from one of these, so a file discovered for `sync` is discovered for `create --skip-scaffold` too.
 *
 * It exists because the alternative did not hold. `buildArtifacts` took its discoveries as loose positional arguments,
 * and each caller ran its own lookups: `sync` did, and `runPipeline` looked up the setup file and nothing else. So a
 * project keeping its stylesheet at `src/styles/tailwind.css` was handed a second `src/index.css` that nothing imports
 * on every `--skip-scaffold` run, which is exactly the defect the style-entry lookup was added to stop. One record with
 * one producer means the next discovered file reaches both routes by construction rather than by remembering.
 *
 * Each field is every candidate the project has, in candidate order, not the first: the caller decides which one it
 * means, and `projectSpelling` is that decision.
 */
export interface ProjectShape {
  setupTests: readonly string[];
  styleEntries: readonly string[];
}

// A project holding none of them: birth, and what a caller planning without reading disk passes.
export const EMPTY_PROJECT: ProjectShape = { setupTests: [], styleEntries: [] };

/**
 * Which spelling a project means, given the target's own and every candidate the project has.
 *
 * The target's own wins where the project has it, and the project's first is the fallback. Ordered that way because a
 * project can hold several at once: one keeping both the standard's entry and a `styles/global.css` beside it was read
 * as the second, which moved the Tailwind import out of the file every consumer already pulls in. Taking the first
 * present answers "which of these did the project arrange its styles around" with "whichever sorts earliest in a list
 * this package wrote", and the target's own entry is the one the project's other files already name.
 *
 * Overloaded on whether the target declares one at all, because the two callers differ and only one of them can be
 * answered with nothing: every target has a setup file and only some declare a style entry. Without this the setup
 * caller carries a `?? own` for a case it cannot reach, which is an untestable branch rather than a guard.
 */
export function projectSpelling(own: string, present: readonly string[]): string;
export function projectSpelling(
  own: string | undefined,
  present: readonly string[],
): string | undefined;
export function projectSpelling(
  own: string | undefined,
  present: readonly string[],
): string | undefined {
  if (own !== undefined && present.includes(own)) {
    return own;
  }

  return present[0] ?? own;
}
