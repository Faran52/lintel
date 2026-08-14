import { constants } from 'node:fs';
import {
  chmod,
  mkdir,
  open,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { type Artifact } from '../../artifacts';
import { contentOf } from '../shipped-assets/shippedAssets';
import { entryExists, readIfPresent } from '../utils/fsUtils';

export const writeProjectFile = async (
  cwd: string,
  target: string,
  text: string,
): Promise<void> => {
  const path = join(cwd, target);

  await mkdir(dirname(path), { recursive: true });

  try {
    // Generated files may replace regular files, but never a symbolic link and whatever it points at.
    const file = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      0o666,
    );

    try {
      await file.writeFile(text, 'utf8');
    }
    finally {
      await file.close();
    }
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ELOOP') {
      throw new Error(`Refusing to write ${target}: target is a symbolic link`);
    }

    throw error;
  }
};

/**
 * `fresh` says the directory is scaffolder output, which is what decides whether a `preserve` artifact that already
 * exists is the project's or somebody else's default. The build configs are the case that needs telling apart: a
 * scaffolder writes its own `vite.config.ts` moments before this runs, so preserving it at birth would hand a new
 * project Vite's defaults instead of this standard's, while preserving it on every later run is the whole point.
 * Nothing else is affected, because no other preserved file exists yet at birth.
 */
export const applyArtifact = async (
  cwd: string,
  artifact: Artifact,
  fresh = false,
): Promise<boolean> => {
  const path = join(cwd, artifact.target);

  if (!fresh && artifact.preserve === true && await entryExists(path)) {
    return false;
  }

  // Read for a transform too, not only a merge: the checker is copied and still carries the project's own blocks,
  // so its transform needs whatever is already there.
  const reads = 'merge' in artifact.content || 'transform' in artifact.content;
  const current = reads ? await readIfPresent(path) : null;

  await writeProjectFile(cwd, artifact.target, await contentOf(artifact.content, current));

  if (artifact.executable === true) {
    // Husky and Claude Code invoke these directly, and npm does not preserve the mode bit for every consumer.
    await chmod(path, 0o755);
  }

  return true;
};
