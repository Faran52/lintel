import { render, screen } from '@testing-library/react-native';
import { version } from 'expo/package.json';

import { WebBadge } from './WebBadge';

// Hoisted because a mock factory is lifted above every other binding in the file.
const { mockScheme } = vi.hoisted(() => {
  return { mockScheme: vi.fn() };
});

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');

  return new Proxy(actual, {
    get: (target, key): unknown => {
      return key === 'useColorScheme' ? mockScheme : Reflect.get(target, key);
    },
  });
});

vi.mock('@/hooks/useTheme', async () => {
  const { Colors } = await vi.importActual<typeof import('@/constants/theme')>('@/constants/theme');

  return {
    useTheme: () => {
      return Colors.light;
    },
  };
});

// The whole tree, because the only thing that differs between schemes is an image source.
const badgeTree = async (scheme: string): Promise<string> => {
  mockScheme.mockReturnValue(scheme);

  const view = await render(<WebBadge />);
  const tree = JSON.stringify(view.toJSON());

  await view.unmount();

  return tree;
};

describe('WebBadge', () => {
  it('prints the expo version it was generated against', async () => {
    mockScheme.mockReturnValue('light');

    await render(<WebBadge />);

    // The "v" prefix and the number are separate text nodes, so this matches across both.
    expect(screen.getByText(new RegExp(version.replaceAll('.', '\\.')))).toBeTruthy();
  });

  it('takes a different badge in each colour scheme', async () => {
    expect(await badgeTree('dark')).not.toBe(await badgeTree('light'));
  });
});
