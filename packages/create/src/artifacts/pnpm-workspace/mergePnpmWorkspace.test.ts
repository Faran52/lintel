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
import { mergePnpmWorkspace } from './mergePnpmWorkspace';

interface AnswerOverrides {
  target?: TargetId;
}

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

describe('mergePnpmWorkspace', () => {
  it('writes the emitted block alone when there is no existing file', () => {
    expect(mergePnpmWorkspace(null, answersFor({}))).toBe(emitPnpmWorkspace(answersFor({})));
  });

  it('prepends the emitted block to an existing file with no allowBuilds key', () => {
    const merged = mergePnpmWorkspace('onlyBuiltDependencies:\n  - foo\n', answersFor({}));

    expect(merged).toBe(`${emitPnpmWorkspace(answersFor({}))}onlyBuiltDependencies:\n  - foo\n`);
  });

  it('drops the ignoredBuiltDependencies block a scaffolder wrote', () => {
    const existing = 'ignoredBuiltDependencies:\n  - sharp\n  - unrs-resolver\nonlyBuiltDependencies:\n  - foo\n';
    const merged = mergePnpmWorkspace(existing, answersFor({}));

    expect(merged).not.toContain('ignoredBuiltDependencies');
    expect(merged).toContain('onlyBuiltDependencies:\n  - foo\n');
  });

  it('leaves an existing allowBuilds block alone rather than reasserting over it', () => {
    const existing = "allowBuilds:\n  'sharp': true\n  'unrs-resolver': true\n  'custom-pkg': true\n";

    expect(mergePnpmWorkspace(existing, answersFor({}))).toBe(existing);
  });

  it('keeps content that follows the dropped block, not just what precedes it', () => {
    const existing = 'ignoredBuiltDependencies:\n  - sharp\nonlyBuiltDependencies:\n  - foo\n';
    const merged = mergePnpmWorkspace(existing, answersFor({}));

    expect(merged).toContain('onlyBuiltDependencies:\n  - foo\n');
  });
});
