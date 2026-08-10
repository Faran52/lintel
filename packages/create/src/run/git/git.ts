import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  accessSync,
  constants,
  statSync,
} from 'node:fs';
import {
  delimiter,
  join,
  resolve,
} from 'node:path';
import { env } from 'node:process';

export interface GitOptions {
  cwd: string;
  // Fed to the command on stdin. `git diff --no-index -` reads the shipped file from it.
  input?: string;
}

/**
 * The absolute path of the `git` this shell would run, resolved via an explicit PATH walk rather than handing a bare
 * command to the OS; `undefined` where PATH holds none. Resolved against this process's cwd, since the spawn below
 * runs in `options.cwd`; the isFile check keeps a directory named `git` from passing the X_OK probe.
 */
const resolvedGit = (): string | undefined => {
  for (const directory of (env['PATH'] ?? '').split(delimiter)) {
    if (directory === '') {
      continue;
    }

    const candidate = resolve(join(directory, 'git'));

    try {
      accessSync(candidate, constants.X_OK);

      if (statSync(candidate).isFile()) {
        return candidate;
      }
    }
    catch {
      // Not here; the next PATH entry may have it.
    }
  }

  return undefined;
};

// Runs every git call behind one function; never throws, since `sync` degrades to a change without its diff.
export const git = (args: string[], options: GitOptions): SpawnSyncReturns<string> => {
  const binary = resolvedGit();

  if (binary === undefined) {
    return {
      pid: 0,
      output: [null, '', ''],
      stdout: '',
      stderr: '',
      status: null,
      signal: null,
      error: new Error('git was not found on PATH, and the hooks this tool installs need one.'),
    };
  }

  return spawnSync(binary, args, { ...options, encoding: 'utf8' });
};
