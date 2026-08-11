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

// Only fresh projects get repairs; exact generator text turns upstream drift into a notice.
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
      continue;
    }

    const after = transform === undefined ? before : transform(before);

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

// Drop script extensions only, preserving names such as `x.module.css`.
const specifierFor = (path: string): string => {
  return path.replace(/\.[cm]?tsx?$/, '');
};

// Match trailing path segments, longest first, to avoid partial rename matches.
const specifierEdits = (renames: StarterRename[]): [string, string][] => {
  return renames.map(({ from, to }): [string, string] => {
    return [`/${basename(specifierFor(from))}`, `/${basename(specifierFor(to))}`];
  }).sort(([left], [right]) => {
    return right.length - left.length;
  });
};

const repointSpecifiers = (source: string, edits: [string, string][]): string => {
  return edits.reduce((text, [from, to]) => {
    // Include the closing quote to avoid rewriting a longer filename's stem.
    return text.replaceAll(`${from}'`, `${to}'`).replaceAll(`${from}"`, `${to}"`);
  }, source);
};

// Rename after starter fixes, which match original paths; `rename` handles case-only APFS moves.
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
      // Warned, not thrown: a generator that moved its own file is not a reason to fail a generate.
      onNotice?.(`  starter rename for ${entry.from} found nothing: the generator changed what it writes.`);
      continue;
    }

    // Always a write, since the destination is what changed rather than the text.
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
