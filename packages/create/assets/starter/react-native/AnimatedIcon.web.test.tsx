import { render } from '@testing-library/react-native';

import { AnimatedIcon, AnimatedSplashOverlay } from './AnimatedIcon.web';

describe('AnimatedIcon (web)', () => {
  it('renders the logo and its glow', async () => {
    const view = await render(<AnimatedIcon />);

    expect(view.toJSON()).toBeTruthy();
  });
});

describe('AnimatedSplashOverlay (web)', () => {
  // The web build has no splash screen to cover, so the overlay is deliberately nothing.
  it('renders nothing at all', async () => {
    const view = await render(<AnimatedSplashOverlay />);

    expect(view.toJSON()).toBeNull();
  });
});
