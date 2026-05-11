import type { Meta, StoryObj } from '@storybook/react';

import { RichTextLine } from '@/features/rich-text-line';

import { PaperSheet } from './PaperSheet';

const meta = {
  title: 'Shared/PaperSheet',
  component: PaperSheet,
  tags: ['autodocs'],
} satisfies Meta<typeof PaperSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Página em branco do planner',
  },
};

export const LongContent: Story = {
  args: {
    children: (
      <>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.
        </p>
        <p>
          Ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
        <p>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
          anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem.
        </p>
        <p>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
          consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
        </p>
        <p>
          Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
          velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam.
        </p>
      </>
    ),
  },
};

export const WithoutPadding: Story = {
  args: {
    padded: false,
    children: 'Sem padding interno',
  },
};

export const WithoutRules: Story = {
  args: {
    ruled: false,
    children: 'Sem linhas pautadas',
  },
};

/**
 * RuledWithEditor — visual inspection story for 24px grid alignment.
 * Renders 3 rows of RichTextLine inside a ruled+padded PaperSheet so
 * that reviewers can confirm text sits on the paper lines after the
 * background-size: 100% 24px change (AC-015).
 */
export const RuledWithEditor: Story = {
  args: {
    ruled: true,
    padded: true,
    children: (
      <div>
        <div>
          <RichTextLine value="Texto de exemplo na linha do papel" onChange={() => undefined} />
        </div>
        <div>
          <RichTextLine value="Segunda linha — alinhamento verificado" onChange={() => undefined} />
        </div>
        <div>
          <RichTextLine value="Terceira linha — grid de 24px" onChange={() => undefined} />
        </div>
      </div>
    ),
  },
};
