import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

export * from '@testing-library/react';
export { userEvent };

interface RenderWithDndOptions extends Omit<RenderOptions, 'wrapper'> {}

export function renderWithDnd(
  ui: ReactNode,
  items: string[] = [],
  options: RenderWithDndOptions = {},
) {
  return render(
    <DndContext>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {ui}
      </SortableContext>
    </DndContext>,
    options,
  );
}
