import { emitPackageJson, parsePackageJson } from './emitPackageJson';

import type { Answers } from '../../model/answers/answers';

/**
 * The same reconciliation the package stage runs, reached through the artifact list so `sync` runs it too. Every
 * dependency an answer implies is added and nothing a project declared is dropped, which is what `patchPackageJson`
 * already did for a `create` run and never did for a `sync` one.
 *
 * `name` is only consulted for a project that has no `package.json` at all, which is a birth run; a sync always has
 * one, and its own name is what stays.
 */
export const mergePackageJson = (current: string | null, answers: Answers, name: string): string => {
  return emitPackageJson(current === null ? { name } : parsePackageJson(current), answers);
};
