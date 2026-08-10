import type { Stage } from '../../model/stages/stages';

// Kept separate from index.ts: importing the list back in would trip import-x/no-cycle.

export interface EmittedText {
  text: string;
}

// Files under `assets/`, concatenated in order. `testing.md` joins a per-target head to the shared standard, and
// `type-standards.md` gains a relaxed-floor tail when that answer was chosen.
export interface CopiedAssets {
  sources: string[];
  // Depends on answers, not the file: type-standards.md's shared glob names .vue and .svelte for every target,
  // including pure React and TypeScript.
  transform?: (source: string) => string;
}

export type ArtifactContent = CopiedAssets | EmittedText;

export interface Artifact {
  // The stage that writes it, and the stage `--skip` declines it with.
  stage: Stage;
  target: string;
  content: ArtifactContent;
  executable?: boolean;
  // The project edits this: sync installs it when missing and never overwrites it, not even under --force.
  preserve?: true;
}

export const emitted = (stage: Stage, target: string, text: string): Artifact => {
  return { stage, target, content: { text } };
};

// A shipped file that lands unchanged, from one source or several concatenated. Every one is stage 4, `standard`.
export const copied = (target: string, ...sources: string[]): Artifact => {
  return { stage: 'standard', target, content: { sources } };
};
