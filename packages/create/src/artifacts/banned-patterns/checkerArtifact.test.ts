import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
import { ASSETS_ROOT } from '../../run/shipped-assets/shippedAssets';

import { checkerArtifact } from './checkerArtifact';

interface AnswerOverrides {
  target?: TargetId;
  typeSafety?: TypeSafety;
}

// The file the artifact copies from, read the way `contentOf` reads it.
const SHIPPED = join(ASSETS_ROOT, 'scripts/checkBannedPatterns.ts');

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

const transformOf = (answers: Answers): ((source: string, current: string | null) => string) => {
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
      return transformOf(answersFor({ typeSafety: 'relaxed' }))('// a checker with no anchor\n', null);
    }).toThrow('no longer contains the anchor');
  });

  it('throws when the skip-list anchor has drifted out of the shipped checker', () => {
    expect(() => {
      return transformOf(answersFor({ target: 'react-native' }))('// a checker with no anchor\n', null);
    }).toThrow('no longer contains the anchor');
  });

  it('leaves the strict floor untouched for a target with nothing to exempt', () => {
    const source = "const TYPE_SAFETY: TypeSafety = 'strict';\nconst PROJECT_SKIPPED: string[] = [];\n";

    expect(transformOf(answersFor({}))(source, null)).toBe(source);
  });
});

/**
 * The file holds two things: the pattern list, which is the standard, and `PROJECT_SKIPPED`, which is the project's.
 * It was `preserve: true`, so both froze and the caught-value carve-out released in 1.4.4 reached every new project
 * and no existing one. Emitting it instead would have deleted a project's exemptions and the reasons beside them.
 */
describe('the checker merge', () => {
  const shippedFor = (answers: Answers): string => {
    return transformOf(answers)(readFileSync(SHIPPED, 'utf8'), null);
  };

  it("keeps a project's exemptions while taking the standard's patterns", () => {
    const answers = answersFor({});
    const project = shippedFor(answers).replace(
      'const PROJECT_SKIPPED: string[] = [',
      [
        'const PROJECT_SKIPPED: string[] = [',
        '  // the wire vocabulary, argued in type-standards.md',
        "  'src/lib/protocol/protocol.ts',",
      ].join('\n'),
    );

    const merged = transformOf(answers)(readFileSync(SHIPPED, 'utf8'), project);

    expect(merged).toContain("'src/lib/protocol/protocol.ts',");
    expect(merged).toContain('the wire vocabulary, argued in type-standards.md');
    // And the standard's own half is the shipped one, not whatever the project froze.
    expect(merged).toContain('CAUGHT_VALUE');
  });

  it('takes the shipped blocks whole on a first write', () => {
    expect(shippedFor(answersFor({}))).toContain('const PROJECT_SKIPPED');
  });
});

/**
 * The three ways the carry-over declines and leaves the shipped text: a project whose file no longer declares the
 * block at all, and either side left unterminated by an edit that broke it.
 */
describe('the checker merge when a block cannot be found', () => {
  it('takes the shipped block when the project no longer declares one', () => {
    const shipped = readFileSync(SHIPPED, 'utf8');
    const merged = transformOf(answersFor({}))(shipped, '// a checker with no project blocks\n');

    expect(merged).toContain('const PROJECT_SKIPPED');
    expect(merged).toContain('const PROJECT_BANNED');
  });

  it('takes the shipped block when the project left one unterminated', () => {
    const shipped = readFileSync(SHIPPED, 'utf8');
    const broken = 'const PROJECT_BANNED: BannedPattern[] = [\n  { name: "ours" },\n';
    const merged = transformOf(answersFor({}))(shipped, broken);

    expect(merged).toContain('const PROJECT_BANNED: BannedPattern[] = [];');
  });
});
