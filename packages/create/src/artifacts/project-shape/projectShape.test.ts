import {
  describe,
  expect,
  it,
} from 'vitest';

import { EMPTY_PROJECT, projectSpelling } from './projectShape';

describe('projectSpelling', () => {
  const CANDIDATES = ['src/styles/global.css', 'src/style.css'];

  /**
   * The defect this exists for: a project holding both the standard's entry and one that sorts earlier was read as
   * the earlier one, which moved the Tailwind import out of the file every consumer already pulls in.
   */
  it("takes the target's own over another the project also has, whatever the order", () => {
    expect(projectSpelling('src/style.css', CANDIDATES)).toBe('src/style.css');
    expect(projectSpelling('src/style.css', [...CANDIDATES].reverse())).toBe('src/style.css');
  });

  // The project arranged its files differently, so its own is the one its other files already name.
  it("takes the project's first when the target's own is not among them", () => {
    expect(projectSpelling('src/index.css', CANDIDATES)).toBe('src/styles/global.css');
  });

  // Birth: nothing on disk to prefer, so the target's default is the answer, which is what `EMPTY_PROJECT` gives.
  it('takes the default when the project holds none of them', () => {
    expect(projectSpelling('src/style.css', [])).toBe('src/style.css');
    expect(projectSpelling('src/style.css', EMPTY_PROJECT.styleEntries)).toBe('src/style.css');
  });

  // A target declaring no entry of its own still keeps whatever the project has.
  it('answers a project file for a target with no default, and undefined for neither', () => {
    expect(projectSpelling(undefined, CANDIDATES)).toBe('src/styles/global.css');
    expect(projectSpelling(undefined, [])).toBeUndefined();
  });
});
