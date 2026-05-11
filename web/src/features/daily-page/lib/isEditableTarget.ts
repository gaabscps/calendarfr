/**
 * Detects whether an event target is an editable element.
 *
 * Used to prevent keyboard shortcuts and swipe gestures from
 * firing when the user is typing inside an input, textarea,
 * or contenteditable element (e.g., Tiptap editor).
 *
 * Covers: AC-015 (keyboard shortcut guard), AC-018 (swipe guard).
 */

/**
 * Allow-list of <input> types that bear a text cursor.
 * Non-text types (checkbox, radio, range, submit, button, etc.) are excluded
 * because they do not accept free-text keyboard input.
 */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
]);

/**
 * Returns true if the target is an editable focusable element:
 * - <input> whose type is in the text-bearing allow-list
 * - <textarea>
 * - An element with contenteditable="true" or a descendant thereof,
 *   where the *closest* [contenteditable] ancestor is "true" (not "false").
 *   This correctly handles Tiptap node-views that set contenteditable="false"
 *   inside an outer contenteditable="true" editor: the inner barrier wins.
 *
 * Returns false for null, regular divs, hidden inputs, checkbox/radio/range,
 * and elements nested inside contenteditable="false" node-views.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) {
    return false;
  }

  // target is an Element (guard above checked instanceof Element)
  const el = target;

  // <input> elements: only text-bearing types accept keyboard text input.
  // Use an allow-list (.toLowerCase() defensive for non-standard casing).
  if (el.tagName === 'INPUT') {
    const input = el as HTMLInputElement;
    return TEXT_INPUT_TYPES.has(input.type.toLowerCase());
  }

  // <textarea> is always editable
  if (el.tagName === 'TEXTAREA') {
    return true;
  }

  // Walk up the DOM to the *closest* element with any [contenteditable] attr.
  // If that element is "true", the target is inside an editable context.
  // If it is "false" (e.g., Tiptap node-view), the barrier wins → not editable.
  const ce = el.closest('[contenteditable]');
  return ce?.getAttribute('contenteditable') === 'true';
}
