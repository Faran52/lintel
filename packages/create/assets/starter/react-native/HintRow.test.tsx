import { render, screen } from '@testing-library/react-native';

import { HintRow } from './HintRow';

vi.mock('@/hooks/useTheme', async () => {
  const { Colors } = await vi.importActual<typeof import('@/constants/theme')>('@/constants/theme');

  return {
    useTheme: () => {
      return Colors.light;
    },
  };
});

describe('HintRow', () => {
  // Both parameters carry a default, which is a branch each.
  it('falls back to its own title and hint', async () => {
    await render(<HintRow />);

    expect(screen.getByText('Try editing')).toBeTruthy();
    expect(screen.getByText('app/index.tsx')).toBeTruthy();
  });

  it('shows the title and hint it is given', async () => {
    await render(<HintRow title="Dev tools" hint="press d" />);

    expect(screen.getByText('Dev tools')).toBeTruthy();
    expect(screen.getByText('press d')).toBeTruthy();
  });
});
