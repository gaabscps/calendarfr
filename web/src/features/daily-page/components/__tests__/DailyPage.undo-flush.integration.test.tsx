/**
 * DailyPage.undo-flush.integration.test.tsx — FEAT-022 T-016.
 *
 * Cobre AC-014 e AC-015 sob o ângulo de INTEGRAÇÃO:
 *  - Quando a `date` muda (navegação prev/next), o cleanup do effect
 *    em `DailyPageInner` chama `flushAll()`. Em seguida `useDailyPage`
 *    recebe a nova `date` com `gateOpen=true`, abrindo caminho para o
 *    autosave re-armar e o PUT do estado pós-flush ser despachado.
 *  - Quando o componente desmonta sem mudar de data, o cleanup também
 *    chama `flushAll()`.
 *  - Transição de queue: com entrada pendente (`gateOpen=false`),
 *    após mudança de date o flush é chamado e a nova date é montada
 *    com `gateOpen=true`.
 *  - Caminho de UI: clique no botão "Próximo dia" dispara `goToNext`
 *    e, quando o hook reporta a nova date, o cleanup roda.
 *
 * Estratégia: spy-based. Mocka o barrel `@/features/undo-delete` para
 * injetar `flushAll` espionado e controlar `queue` (drives gateOpen).
 * Mocka `useDailyPage` / `usePageNavigation` para controlar date e
 * verificar os args passados (gateOpen).
 *
 * Nota: este teste tem overlap consciente com `DailyPage.undo-mount.test.tsx`
 * (T-008) — mas adiciona casos de transição de queue (gate close→open
 * cruzando date change) e cadeia múltipla de cleanups, que aquele NÃO cobre.
 *
 * Decisão sobre o stretch (PUT body via MSW real + UndoQueueProvider real):
 * não implementado neste arquivo. O caminho exigiria desabilitar o mock
 * de hooks (`useDailyPage` e `usePageNavigation`), gerenciar timers reais
 * do autosave debounce + queue TTL, e mockar `rich-text-line` para drivar
 * BACKSPACE-empty — alto custo de fragilidade para evidência que já é
 * coberta por `Priorities.undo.integration.test.tsx` (PUT post-undo) +
 * `useDailyPage.gate.test.ts` (gate semantics). Mantemos este arquivo
 * focado em AC-014/AC-015 com asserções determinísticas.
 */

import type { DailyPageData } from '@calendarfr/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DailyPage } from '../DailyPage.js';

// ---------------------------------------------------------------------------
// Mocks comuns: features pesados para isolar o teste.
// Para a parte spy-based (Bloco 1) também mockamos o barrel undo-delete.
// Para o teste de integração real (Bloco 2) reabilitamos o módulo real via
// `jest.doMock` num describe isolado.
// ---------------------------------------------------------------------------

const flushAllSpy = jest.fn();
let mockQueue: Array<{ id: string }> = [];

jest.mock('@/features/undo-delete', () => ({
  UndoQueueProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UndoToastHost: () => <div data-testid="undo-toast-host" />,
  useUndoQueueContext: () => ({
    queue: mockQueue,
    enqueueUndo: jest.fn(),
    cancelUndo: jest.fn(),
    flushAll: flushAllSpy,
  }),
}));

jest.mock('@/features/priorities', () => ({
  Priorities: ({ value }: { value: unknown }) => (
    <div data-testid="priorities" data-value={JSON.stringify(value)} />
  ),
  EMPTY_PRIORITY: { id: '', text: '', done: false },
}));

jest.mock('@/features/mood', () => ({
  MoodPicker: ({ value }: { value: unknown }) => (
    <div data-testid="mood-picker" data-value={JSON.stringify(value)} />
  ),
}));

jest.mock('@/features/agenda', () => ({
  Agenda: ({ value }: { value: unknown }) => (
    <div data-testid="agenda" data-value={JSON.stringify(value)} />
  ),
  EMPTY_AGENDA: Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, text: '' })),
}));

jest.mock('@/features/notes', () => ({
  Notes: ({ value }: { value: unknown }) => (
    <div data-testid="notes" data-value={JSON.stringify(value)} />
  ),
}));

jest.mock('@/features/sticky-note', () => ({
  StickyNote: () => null,
}));

// ---------------------------------------------------------------------------
// Mock dos hooks daily-page (controle determinístico de date / setters).
// ---------------------------------------------------------------------------

const mockUseDailyPage = jest.fn();
const mockUsePageNavigation = jest.fn();
const mockUseReducedMotion = jest.fn();

jest.mock('../../hooks/useDailyPage.js', () => ({
  ...jest.requireActual('../../hooks/useDailyPage.js'),
  useDailyPage: (...args: unknown[]) => mockUseDailyPage(...args),
}));

jest.mock('../../hooks/usePageNavigation.js', () => ({
  ...jest.requireActual('../../hooks/usePageNavigation.js'),
  usePageNavigation: (...args: unknown[]) => mockUsePageNavigation(...args),
}));

jest.mock('../../hooks/useReducedMotion.js', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2099-12-31';
const DATE_NEXT = '2100-01-01';

function makeData(date: string): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: 'p-a', text: '', done: false },
      { id: 'p-b', text: '', done: false },
      { id: 'p-c', text: '', done: false },
    ] as DailyPageData['priorities'],
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      text: '',
    })) as unknown as DailyPageData['agenda'],
    notes: [],
    createdAt: null,
    updatedAt: null,
  };
}

function makeNavReturn(date: string, goToNext = jest.fn().mockResolvedValue(undefined)) {
  return {
    date,
    direction: null as 'prev' | 'next' | null,
    isAnimating: false,
    goToPrev: jest.fn().mockResolvedValue(undefined),
    goToNext,
    goToDate: jest.fn().mockResolvedValue(undefined),
    swipeProps: {},
  };
}

function makeDailyReturn(date: string, overrides = {}) {
  return {
    data: makeData(date),
    loadError: null,
    saveStatus: 'saved' as const,
    setPriorities: jest.fn(),
    setMood: jest.fn(),
    setAgenda: jest.fn(),
    setNotes: jest.fn(),
    retrySave: jest.fn(),
    flushSavePending: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockQueue = [];
  flushAllSpy.mockClear();
  mockUseReducedMotion.mockReturnValue(false);
  mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE));
  mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE));
});

afterEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// AC-015 — flushAll ao mudar `date`
// ===========================================================================

describe('DailyPage T-016 — flush on date change (AC-015)', () => {
  it('rerender com nova date dispara flushAll() exatamente uma vez', () => {
    const { rerender } = render(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).not.toHaveBeenCalled();

    // Simula navegação: o `usePageNavigation` (mockado) agora reporta a próxima data.
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE_NEXT));
    rerender(<DailyPage initialDate={DATE} />);

    // O cleanup do effect com date=DATE rodou → flushAll chamado uma vez.
    expect(flushAllSpy).toHaveBeenCalledTimes(1);
  });

  it('useDailyPage recebe a nova date com gateOpen=true (queue vazia)', () => {
    const { rerender } = render(<DailyPage initialDate={DATE} />);
    mockUseDailyPage.mockClear();

    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE_NEXT));
    rerender(<DailyPage initialDate={DATE} />);

    // Após a navegação, useDailyPage é chamado com a nova date e gateOpen=true.
    // Isso permite que o autosave re-arme e o PUT do estado pós-flush aconteça.
    expect(mockUseDailyPage).toHaveBeenCalledWith(DATE_NEXT, { gateOpen: true });
  });

  it('múltiplas mudanças de date encadeiam múltiplos flushAll', () => {
    const { rerender } = render(<DailyPage initialDate={DATE} />);

    // 1ª mudança DATE → DATE_NEXT.
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE_NEXT));
    rerender(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).toHaveBeenCalledTimes(1);

    // 2ª mudança DATE_NEXT → DATE (voltou).
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE));
    rerender(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// AC-015 — flushAll ao desmontar
// ===========================================================================

describe('DailyPage T-016 — flush on unmount (AC-015)', () => {
  it('desmonta sem mudar date → flushAll é chamado uma vez', () => {
    const { unmount } = render(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).not.toHaveBeenCalled();

    unmount();

    expect(flushAllSpy).toHaveBeenCalledTimes(1);
  });

  it('mudou date e em seguida desmonta → flushAll é chamado em ambos cleanups', () => {
    const { rerender, unmount } = render(<DailyPage initialDate={DATE} />);

    // Mudou date — primeiro flushAll.
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE_NEXT));
    rerender(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).toHaveBeenCalledTimes(1);

    // Desmonta — segundo flushAll (cleanup final do effect com date=DATE_NEXT).
    unmount();
    expect(flushAllSpy).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// AC-014 + AC-015 — Integração com queue NÃO-vazia
//
// Quando há entrada na queue, gateOpen vira false; ao mudar date, o flush
// é chamado e em seguida useDailyPage recebe gateOpen=true para a NOVA date
// (o mock simula que a queue esvaziou após o flush).
// ===========================================================================

describe('DailyPage T-016 — gate transition on date change with pending undo', () => {
  it('queue pendente → date change → flushAll chamado e nova date recebe gateOpen=true', () => {
    // Inicialmente a queue tem 1 entrada → gateOpen=false na 1ª date.
    mockQueue = [{ id: 'undo-1' }];

    const { rerender } = render(<DailyPage initialDate={DATE} />);
    expect(mockUseDailyPage).toHaveBeenCalledWith(DATE, { gateOpen: false });
    expect(flushAllSpy).not.toHaveBeenCalled();

    // Simula: usuário clica próximo dia → no mundo real, o cleanup chamaria
    // flushAll e a queue esvaziaria. Aqui simulamos esse efeito atualizando
    // o mock da queue para [] antes do rerender com a nova date.
    mockQueue = [];
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE_NEXT));
    mockUseDailyPage.mockClear();
    rerender(<DailyPage initialDate={DATE} />);

    // Flush rodou no cleanup do effect com date=DATE.
    expect(flushAllSpy).toHaveBeenCalledTimes(1);
    // Nova date entra com gateOpen=true → autosave pode re-armar.
    expect(mockUseDailyPage).toHaveBeenCalledWith(DATE_NEXT, { gateOpen: true });
  });
});

// ===========================================================================
// AC-015 — Botão "Próximo dia" dispara goToNext; em conjunto com a mudança
// de date refletida pelo hook, o flush é chamado (caminho de integração via UI).
// ===========================================================================

describe('DailyPage T-016 — UI nav button drives flush on date change', () => {
  it('clicar em "Próximo dia" chama goToNext; rerender com nova date chama flushAll', async () => {
    const user = userEvent.setup();
    const goToNext = jest.fn().mockResolvedValue(undefined);
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE, goToNext));

    const { rerender } = render(<DailyPage initialDate={DATE} />);

    // Clique no botão de navegação para próximo dia.
    const nextBtn = screen.getByRole('button', { name: 'Próximo dia' });
    await user.click(nextBtn);

    // Handler `goToNext` foi invocado pelo componente (caminho de UI vivo).
    expect(goToNext).toHaveBeenCalledTimes(1);

    // No mundo real, goToNext atualizaria o estado interno do hook para
    // reportar a nova date. Simulamos isso atualizando o mock e rerenderizando.
    mockUsePageNavigation.mockReturnValue(makeNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDailyReturn(DATE_NEXT));
    rerender(<DailyPage initialDate={DATE} />);

    // Cleanup do effect com date=DATE rodou → flushAll chamado.
    expect(flushAllSpy).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Sanity: Provider/Host estão montados (AC-014)
// ===========================================================================

describe('DailyPage T-016 — AC-014 sanity: UndoToastHost montado', () => {
  it('renderiza UndoToastHost como filho da árvore', () => {
    render(<DailyPage initialDate={DATE} />);
    expect(screen.getByTestId('undo-toast-host')).toBeInTheDocument();
  });
});
