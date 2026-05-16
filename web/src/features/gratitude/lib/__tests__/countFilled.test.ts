import { countFilled } from '../countFilled.js';

describe('countFilled', () => {
  it('returns 0 for empty array', () => {
    expect(countFilled([])).toBe(0);
  });

  it('returns 0 for all empty text', () => {
    expect(
      countFilled([
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
      ]),
    ).toBe(0);
  });

  it('counts 1 when only first slot is filled', () => {
    expect(
      countFilled([
        { id: 'a', text: '<p>café</p>' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
      ]),
    ).toBe(1);
  });

  it('counts 2 when first and third filled', () => {
    expect(
      countFilled([
        { id: 'a', text: '<p>café</p>' },
        { id: 'b', text: '' },
        { id: 'c', text: '<p>sol</p>' },
      ]),
    ).toBe(2);
  });

  it('counts 3 when all slots filled', () => {
    expect(
      countFilled([
        { id: 'a', text: '<p>café</p>' },
        { id: 'b', text: '<p>sol</p>' },
        { id: 'c', text: '<p>música</p>' },
      ]),
    ).toBe(3);
  });

  it('treats whitespace-only text as empty', () => {
    expect(
      countFilled([
        { id: 'a', text: '   ' },
        { id: 'b', text: '<p>  </p>' },
      ]),
    ).toBe(0);
  });

  it('treats HTML tags with only whitespace content as empty', () => {
    expect(countFilled([{ id: 'a', text: '<p></p>' }])).toBe(0);
  });
});
