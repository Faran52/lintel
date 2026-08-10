import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  join,
} from 'node:path';

import { targetFor } from '../../model/targets';
import { SOURCE_ROOT, sourceFiles } from '../rewrite/rewrite';
import { exists } from '../utils/fsUtils';

import type { TargetId } from '../../model/answers/answers';
import type { StarterRename } from '../../model/targets';

// Fixes defects no fixer can reach; gated on `fresh` by the caller, unlike the ungated `rewrite.ts`.

// Each transform matches exact text a generator wrote, so a small upstream change silently stops it firing; a match of
// nothing is reported rather than swallowed, since it otherwise looks identical to a fix that was never needed.
const applyStarterFixes = async (
  cwd: string,
  target: TargetId,
  onWrite?: (path: string) => void,
  onNotice?: (message: string) => void,
): Promise<void> => {
  for (const {
    path,
    transform,
    moveTo,
  } of targetFor(target).starterFixes ?? []) {
    const full = join(cwd, path);
    let before = '';

    try {
      before = await readFile(full, 'utf8');
    }
    catch {
      // A generator that changed its starter layout is not a reason to fail a generate.
      continue;
    }

    const after = transform === undefined ? before : transform(before);

    // A move always writes, because the destination is what changed rather than the text.
    if (moveTo !== undefined) {
      const destination = join(cwd, moveTo);

      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, after, 'utf8');
      await rm(full);
      onWrite?.(moveTo);
      continue;
    }

    if (after === before) {
      onNotice?.(`  starter fix for ${path} matched nothing: the generator changed what it writes.`);
      continue;
    }

    await writeFile(full, after, 'utf8');
    onWrite?.(path);
  }
};

// The specifier a module is imported by: its path with a script extension dropped and any other kept, so
// `./themed-text` names `themed-text.tsx` and `./x.module.css` names itself.
const specifierFor = (path: string): string => {
  return path.replace(/\.[cm]?tsx?$/, '');
};

/**
 * Every specifier a rename invalidates, longest first: keyed on the trailing segment with its leading slash so one
 * entry serves both `./themed-text` and `@/components/themed-text`, and longest-first keeps `/animated-icon.web` from
 * matching as `/animated-icon` with a stray `.web` left behind.
 */
const specifierEdits = (renames: StarterRename[]): [string, string][] => {
  return renames.map(({ from, to }): [string, string] => {
    return [`/${basename(specifierFor(from))}`, `/${basename(specifierFor(to))}`];
  }).sort(([left], [right]) => {
    return right.length - left.length;
  });
};

const repointSpecifiers = (source: string, edits: [string, string][]): string => {
  return edits.reduce((text, [from, to]) => {
    // Anchored on the closing quote, so `/themed-text'` matches and `/themed-text.module.css'` does not: a bare
    // `replaceAll` of the segment would rewrite the stem of a longer name.
    return text.replaceAll(`${from}'`, `${to}'`).replaceAll(`${from}"`, `${to}"`);
  }, source);
};

/**
 * Renames the generator's own files onto this project's convention and repoints what imported them; runs after
 * `starterFixes`, whose entries match text at the generator's original paths. `rename` handles a case-only move
 * (`collapsible.tsx` to `Collapsible.tsx`) on a case-insensitive filesystem; checked on APFS rather than assumed.
 */
const renameStarterFiles = async (
  cwd: string,
  target: TargetId,
  onWrite?: (path: string) => void,
  onNotice?: (message: string) => void,
): Promise<void> => {
  const moved: StarterRename[] = [];

  for (const entry of targetFor(target).starterRenames ?? []) {
    const present = await exists(join(cwd, entry.from));

    if (!present) {
      // Same refusal `applyStarterFixes` makes, said out loud: a generator that moved its own file is not a reason to
      // fail a generate.
      onNotice?.(`  starter rename for ${entry.from} found nothing: the generator changed what it writes.`);
      continue;
    }

    await rename(join(cwd, entry.from), join(cwd, entry.to));
    moved.push(entry);
    onWrite?.(entry.to);
  }

  if (moved.length === 0) {
    return;
  }

  // Every source file, at its final path, so each is read and written once.
  const edits = specifierEdits(moved);

  for (const path of await sourceFiles(join(cwd, SOURCE_ROOT))) {
    const before = await readFile(path, 'utf8');
    const after = repointSpecifiers(before, edits);

    if (after !== before) {
      await writeFile(path, after, 'utf8');
      onWrite?.(path.slice(cwd.length + 1));
    }
  }
};

// Removes what the generator wrote that lintel's own files then orphaned, per each target's `staleScaffoldFiles`
// (e.g. an unreferenced `tsconfig.app.json` still reads as the tsconfig).
const removeStaleScaffoldFiles = async (
  cwd: string,
  target: TargetId,
  onNotice?: (message: string) => void,
): Promise<void> => {
  for (const path of targetFor(target).staleScaffoldFiles ?? []) {
    const present = await exists(join(cwd, path));

    if (!present) {
      continue;
    }

    await rm(join(cwd, path));
    // Reported, not silent: a delete the user did not ask for has to appear in the log.
    onNotice?.(`removed ${path}, which nothing references now`);
  }
};

export const repairScaffoldedOutput = async (
  cwd: string,
  target: TargetId,
  onWrite?: (path: string) => void,
  onNotice?: (message: string) => void,
): Promise<void> => {
  await applyStarterFixes(cwd, target, onWrite, onNotice);
  await renameStarterFiles(cwd, target, onWrite, onNotice);
  await removeStaleScaffoldFiles(cwd, target, onNotice);
};
