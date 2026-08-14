import { SETUP_TESTS_CANDIDATES } from '../../artifacts/banned-patterns/checkerArtifact';
import { type ProjectShape } from '../../artifacts/project-shape/projectShape';
import { STYLE_ENTRY_CANDIDATES } from '../../artifacts/style-entry/styleEntryPath';
import { allPresent } from '../utils/fsUtils';

/**
 * Reads a directory for every file `artifacts/` has more than one spelling of, which is the one place that lookup
 * happens. `sync` and `runPipeline` both call this rather than each running the lookups it remembers: the second had
 * only the setup file, so a project's own stylesheet was ignored on every `--skip-scaffold` run. See `ProjectShape`.
 */
export const readProjectShape = async (cwd: string): Promise<ProjectShape> => {
  const [setupTests, styleEntries] = await Promise.all([
    allPresent(cwd, SETUP_TESTS_CANDIDATES),
    allPresent(cwd, STYLE_ENTRY_CANDIDATES),
  ]);

  return { setupTests, styleEntries };
};
