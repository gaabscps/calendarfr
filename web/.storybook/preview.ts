import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

import type { Preview } from '@storybook/react';
import { createElement } from 'react';

import { GlobalStyles } from '../src/shared/components/theme';

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement('div', null, createElement(GlobalStyles, null), createElement(Story, null)),
  ],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#fff9f0' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
};

export default preview;
