import { act, renderHook } from '@testing-library/react';

import { useFoldState } from '../useFoldState.js';

describe('useFoldState', () => {
  it('starts in folded state', () => {
    const { result } = renderHook(() => useFoldState());
    expect(result.current.state).toBe('folded');
  });

  it('requestOpen transitions folded → animating-open', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    expect(result.current.state).toBe('animating-open');
  });

  it('onAnimationOpenComplete transitions animating-open → unfolded', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    act(() => result.current.onAnimationOpenComplete());
    expect(result.current.state).toBe('unfolded');
  });

  it('requestClose transitions unfolded → animating-close', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    act(() => result.current.onAnimationOpenComplete());
    act(() => result.current.requestClose());
    expect(result.current.state).toBe('animating-close');
  });

  it('onAnimationCloseComplete transitions animating-close → folded', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    act(() => result.current.onAnimationOpenComplete());
    act(() => result.current.requestClose());
    act(() => result.current.onAnimationCloseComplete());
    expect(result.current.state).toBe('folded');
  });

  it('requestOpen is ignored during animating-open (race guard)', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    expect(result.current.state).toBe('animating-open');
    act(() => result.current.requestOpen());
    expect(result.current.state).toBe('animating-open');
  });

  it('requestOpen is ignored during animating-close (race guard)', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    act(() => result.current.onAnimationOpenComplete());
    act(() => result.current.requestClose());
    expect(result.current.state).toBe('animating-close');
    act(() => result.current.requestOpen());
    expect(result.current.state).toBe('animating-close');
  });

  it('requestClose is ignored during animating-open (race guard)', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    expect(result.current.state).toBe('animating-open');
    act(() => result.current.requestClose());
    expect(result.current.state).toBe('animating-open');
  });

  it('requestClose is ignored during animating-close (race guard)', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    act(() => result.current.onAnimationOpenComplete());
    act(() => result.current.requestClose());
    expect(result.current.state).toBe('animating-close');
    act(() => result.current.requestClose());
    expect(result.current.state).toBe('animating-close');
  });

  it('requestOpen is ignored when already unfolded', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.requestOpen());
    act(() => result.current.onAnimationOpenComplete());
    expect(result.current.state).toBe('unfolded');
    act(() => result.current.requestOpen());
    expect(result.current.state).toBe('unfolded');
  });

  it('requestClose is ignored when already folded', () => {
    const { result } = renderHook(() => useFoldState());
    expect(result.current.state).toBe('folded');
    act(() => result.current.requestClose());
    expect(result.current.state).toBe('folded');
  });

  it('onAnimationOpenComplete is no-op when not in animating-open', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.onAnimationOpenComplete());
    expect(result.current.state).toBe('folded');
  });

  it('onAnimationCloseComplete is no-op when not in animating-close', () => {
    const { result } = renderHook(() => useFoldState());
    act(() => result.current.onAnimationCloseComplete());
    expect(result.current.state).toBe('folded');
  });
});
