import {
  access,
  lstat,
  readFile,
} from 'node:fs/promises';
import { join } from 'node:path';

// True only for absence. A permission error, or a directory where a file should be, stays an error.
export const isAbsence = (error: unknown): error is Error & { code: 'ENOENT' } => {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
};

// Presence for an async caller that would otherwise reach for `existsSync`, same answer including an unreachable
// path read as absent. Unlike `readIfPresent` nothing here decides what to overwrite, so a failure costs a guard.
export const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);

    return true;
  }
  catch {
    return false;
  }
};

// Presence of the directory entry itself, including a dangling symbolic link.
export const entryExists = async (path: string): Promise<boolean> => {
  try {
    await lstat(path);

    return true;
  }
  catch (error) {
    if (isAbsence(error)) {
      return false;
    }

    throw error;
  }
};

// A merge input: the file's text, or null when it does not exist yet.
export const readIfPresent = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf8');
  }
  catch (error) {
    if (isAbsence(error)) {
      return null;
    }

    throw error;
  }
};

/**
 * The first of `candidates` present under `cwd`, relative as given, or undefined. A project that
 * already holds one spelling of a file keeps it rather than gaining a second beside it.
 */
export const firstPresent = async (
  cwd: string,
  candidates: string[],
): Promise<string | undefined> => {
  const found = await Promise.all(candidates.map(async (candidate) => {
    return await entryExists(join(cwd, candidate)) ? candidate : undefined;
  }));

  return found.find((candidate) => {
    return candidate !== undefined;
  });
};
