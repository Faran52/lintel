import { angular } from './angular';
import { next } from './next';
import { react } from './react';
import { reactNative } from './reactNative';
import { solid } from './solid';
import { svelte } from './svelte';
import { vue } from './vue';
import { webextension } from './webextension';

import type { TargetId } from '../answers/answers';
import type { TargetRecord } from './record';

export const TARGETS: Record<TargetId, TargetRecord> = {
  react,
  next,
  vue,
  svelte,
  solid,
  angular,
  webextension,
  'react-native': reactNative,
};

export const targetFor = (id: TargetId): TargetRecord => {
  return TARGETS[id];
};
