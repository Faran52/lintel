import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  type TargetId,
} from '../../model/answers/answers';

import { emitPnpmWorkspace } from './emitPnpmWorkspace';

interface AnswerOverrides {
  target?: TargetId;
}

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

describe('emitPnpmWorkspace', () => {
  it('allows the two builds every target needs, sorted', () => {
    expect(emitPnpmWorkspace(answersFor({ target: 'react' }))).toBe(
      "allowBuilds:\n  'sharp': true\n  'unrs-resolver': true\n",
    );
  });

  it('merges in the builds a target needs beyond the shared two, sorted with them', () => {
    const output = emitPnpmWorkspace(answersFor({ target: 'angular' }));

    expect(output).toBe(
      'allowBuilds:\n'
      + "  '@parcel/watcher': true\n"
      + "  'esbuild': true\n"
      + "  'lmdb': true\n"
      + "  'msgpackr-extract': true\n"
      + "  'sharp': true\n"
      + "  'unrs-resolver': true\n",
    );
  });
});
