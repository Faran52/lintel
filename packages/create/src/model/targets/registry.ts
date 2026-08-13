import { angular } from './angular';
import { astro } from './astro';
import { next } from './next';
import { react } from './react';
import { reactNative } from './reactNative';
import { solid } from './solid';
import { svelte } from './svelte';
import { vue } from './vue';
import { webextension } from './webextension';

import type { Answers, TargetId } from '../answers/answers';
import type { TargetRecord } from './record';

/**
 * A record per target, built from the answers rather than looked up, because one target's record is not decided by
 * its id alone: an extension composes a browser and, optionally, a framework, and those move most of the fields on it.
 * The seven that vary by nothing at all ignore the argument, which keeps the emitters reading one shape and free of
 * `switch (target)`.
 */
export type TargetBuilder = (answers: Answers) => TargetRecord;

export const TARGETS: Record<TargetId, TargetBuilder> = {
  'react': () => {
    return react;
  },
  'next': () => {
    return next;
  },
  'vue': () => {
    return vue;
  },
  'svelte': svelte,
  'solid': () => {
    return solid;
  },
  'angular': () => {
    return angular;
  },
  'astro': astro,
  'webextension': webextension,
  'react-native': () => {
    return reactNative;
  },
};

export const targetFor = (answers: Answers): TargetRecord => {
  return TARGETS[answers.target](answers);
};
