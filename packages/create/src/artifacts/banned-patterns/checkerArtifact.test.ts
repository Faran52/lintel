import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  type TargetId,
  type TypeSafety,
} from '../../model/answers/answers';

import { checkerArtifact } from './checkerArtifact';

interface AnswerOverrides {
  target?: TargetId;
  typeSafety?: TypeSafety;
}

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

const transformOf = (answers: Answers): ((source: string) => string) => {
  const { content } = checkerArtifact(answers);

  if (!('sources' in content) || content.transform === undefined) {
    throw new Error('the checker artifact must carry a transform');
  }

  return content.transform;
};

// Guards against anchor drift: a silent miss would ship the wrong floor. buildArtifacts.test.ts covers the matched
// cases.
describe('checkerArtifact', () => {
  it('throws when the type-safety anchor has drifted out of the shipped checker', () => {
    expect(() => {
      return transformOf(answersFor({ typeSafety: 'relaxed' }))('// a checker with no anchor\n');
    }).toThrow('no longer contains the anchor');
  });

  it('throws when the skip-list anchor has drifted out of the shipped checker', () => {
    expect(() => {
      return transformOf(answersFor({ target: 'react-native' }))('// a checker with no anchor\n');
    }).toThrow('no longer contains the anchor');
  });

  it('leaves the strict floor untouched for a target with nothing to exempt', () => {
    const source = "const TYPE_SAFETY: TypeSafety = 'strict';\nconst PROJECT_SKIPPED: string[] = [];\n";

    expect(transformOf(answersFor({}))(source)).toBe(source);
  });
});
