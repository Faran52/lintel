import { screen } from '@testing-library/react-native';

import { renderScreen } from '@mocks/renderScreen';

import Home from './app/index';

// `isDevice` is a plain property, so it is served from a hoisted mutable the tests write rather than spied on.
const { device } = vi.hoisted(() => {
  return { device: { isDevice: true } };
});

vi.mock('expo-device', () => {
  return {
    get isDevice() {
      return device.isDevice;
    },
  };
});

describe('Home', () => {
  it('renders its heading', async () => {
    // `render` returns a promise as of @testing-library/react-native 14.
    await renderScreen(<Home />);

    expect(screen.getByText('Welcome to Expo')).toBeTruthy();
  });

  it('names the three things a new project does first', async () => {
    await renderScreen(<Home />);

    expect(screen.getByText('Try editing')).toBeTruthy();
    expect(screen.getByText('Dev tools')).toBeTruthy();
    expect(screen.getByText('Fresh start')).toBeTruthy();
  });

  // `getDevMenuHint` picks its wording from the platform and from whether this is real hardware.
  it('tells a real device to shake it', async () => {
    device.isDevice = true;

    await renderScreen(<Home />);

    expect(screen.getByText(/shake device/)).toBeTruthy();
  });

  it('gives a simulator the keyboard shortcut instead', async () => {
    device.isDevice = false;

    await renderScreen(<Home />);

    expect(screen.getByText(/press/)).toBeTruthy();
  });
});
