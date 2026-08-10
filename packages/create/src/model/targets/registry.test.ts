import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';

import {
  describe,
  expect,
  it,
} from 'vitest';

import { ASSETS_ROOT } from '../../run/shipped-assets/shippedAssets';
import { TARGET_IDS } from '../answers/answers';

import { targetFor, TARGETS } from './registry';

import type { TargetRecord } from './record';

// Every `assets/` path a record names; `pipeline.ts` reads each straight off the record with `readFile`, so a typo here
// becomes an ENOENT partway through a generate rather than a failing test.
const assetPathsOf = (target: TargetRecord): string[] => {
  return [
    ...(target.starterFiles ?? []).map((file) => {
      return file.source;
    }),
    ...(target.starterTests ?? []).map((test) => {
      return test.source;
    }),
    ...(target.birthTemplate === undefined ? [] : [target.birthTemplate.source]),
    ...(target.testSetup === undefined ? [] : [target.testSetup]),
    ...target.stateRules.map((rule) => {
      return `claude-rules/${rule}`;
    }),
    // Not on the record: `ruleArtifacts` derives both from the id, so a target added without them emits a path to a
    // file that isn't there.
    `claude-rules/repo-structure.${target.id}.md`,
    `claude-rules/testing.${target.id}.md`,
  ];
};

describe('TARGETS', () => {
  it('holds one record per known target id, keyed by its own id', () => {
    TARGET_IDS.forEach((id) => {
      expect(TARGETS[id].id).toBe(id);
    });
  });

  it('holds exactly the eight known targets, no more and no fewer', () => {
    const byName = (left: string, right: string): number => {
      return left.localeCompare(right, 'en');
    };

    expect(Object.keys(TARGETS).sort(byName)).toEqual([...TARGET_IDS].sort(byName));
  });

  it.each(TARGET_IDS)('names only shipped assets on the %s record', async (id) => {
    const paths = assetPathsOf(TARGETS[id]);

    // Resolved together and asserted on the whole list, so a run names every missing file at once rather than only the
    // first.
    const missing = await Promise.all(paths.map(async (path) => {
      try {
        await access(join(ASSETS_ROOT, path), constants.R_OK);

        return '';
      }
      catch {
        return path;
      }
    }));

    expect(missing.filter(Boolean)).toEqual([]);
  });
});

describe('targetFor', () => {
  it('returns the record matching the id it is asked for', () => {
    expect(targetFor('svelte')).toBe(TARGETS.svelte);
    expect(targetFor('svelte').id).toBe('svelte');
  });

  it('returns a different record for a different id', () => {
    expect(targetFor('react')).not.toBe(targetFor('vue'));
  });
});
