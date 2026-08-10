import {
  chmod,
  mkdir,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execPath } from 'node:process';

import { vi } from 'vitest';

/**
 * A stand-in for a command the pipeline shells out to.
 *
 * Both stages that shell out run a bare name with `shell: false`, so putting one directory on
 * `PATH` is the whole seam. `PATH` holds node's own directory as well because the shebang needs
 * it, and nothing else: a package manager the machine happens to have installed must not answer
 * for one it does not.
 */
export const plantBinary = async (dir: string, name: string, body: string[]): Promise<void> => {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), ['#!/usr/bin/env node', ...body].join('\n'), 'utf8');
  await chmod(join(dir, name), 0o755);
  vi.stubEnv('PATH', `${dir}:${dirname(execPath)}`);
};
