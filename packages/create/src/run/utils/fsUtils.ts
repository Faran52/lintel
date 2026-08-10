import {
  access,
  lstat,
  readFile,
} from 'node:fs/promises';

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
