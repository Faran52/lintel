import {
  describe,
  expect,
  it,
} from 'vitest';

import { DEFAULT_ANSWERS } from '../answers/answers';

import { webextension } from './webextension';

describe('scaffold', () => {
  it('writes the exact argv for the default answers', () => {
    expect(webextension.scaffold('demo-app', DEFAULT_ANSWERS)).toEqual({
      kind: 'create',
      args: ['vite', 'demo-app', '--template', 'vanilla-ts', '--no-interactive', '--no-immediate'],
    });
  });
});
