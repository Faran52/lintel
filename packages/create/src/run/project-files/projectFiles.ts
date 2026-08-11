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

export const applyArtifact = async (cwd: string, artifact: Artifact): Promise<boolean> => {
  const path = join(cwd, artifact.target);

  if (artifact.preserve === true && await entryExists(path)) {
    return false;
  }

  const current = 'merge' in artifact.content ? await readIfPresent(path) : null;

  await writeProjectFile(cwd, artifact.target, await contentOf(artifact.content, current));

  if (artifact.executable === true) {
    // Husky and Claude Code invoke these directly, and npm does not preserve the mode bit for every consumer.
    await chmod(path, 0o755);
  }

  return true;
};
