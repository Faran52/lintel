import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  TARGET_IDS,
  type TargetId,
} from '../../model/answers/answers';
import { targetFor } from '../../model/targets';

import { STYLE_ENTRY_CANDIDATES, styleEntryPath } from './styleEntryPath';

const answersFor = (target: TargetId): Answers => {
  return { ...DEFAULT_ANSWERS, target };
};

describe('styleEntryPath', () => {
  it("takes the project's own entry over the target's default", () => {
    expect(styleEntryPath(answersFor('webextension'), ['src/styles/tailwind.css']))
      .toBe('src/styles/tailwind.css');
  });

  it('falls back to the target default when the project has none', () => {
    expect(styleEntryPath(answersFor('webextension'), [])).toBe('src/style.css');
    expect(styleEntryPath(answersFor('next'), [])).toBe('src/app/globals.css');
  });

  /**
   * A default missing from the candidate list is a project whose own entry could never be found, so it would be
   * handed a second one beside it. That is the defect this exists for, and it is a coupling a test has to hold.
   */
  it('can discover every default a target declares', () => {
    const declared = TARGET_IDS
      .map((target) => {
        return targetFor(answersFor(target)).styleEntry;
      })
      .filter((entry) => {
        return entry !== undefined;
      });

    expect(declared.length).toBeGreaterThan(0);
    expect(STYLE_ENTRY_CANDIDATES).toEqual(expect.arrayContaining(declared));
  });
});

/**
 * A project can hold several of these at once. One keeping the standard's entry and a `styles/global.css` beside it
 * was read as the second, which moved the Tailwind import out of the file every consumer already pulls in.
 */
describe('a project holding more than one candidate', () => {
  it("takes the target's own entry over another the project also has", () => {
    expect(styleEntryPath(
      answersFor('webextension'),
      ['src/styles/global.css', 'src/style.css'],
    )).toBe('src/style.css');
  });

  it('takes the discovered one when the target default is absent', () => {
    expect(styleEntryPath(
      answersFor('webextension'),
      ['src/styles/global.css'],
    )).toBe('src/styles/global.css');
  });
});
