require('@testing-library/jest-dom');

// ─── console.error interceptor ───────────────────────────────────────────────
//
// React warnings (prop forwarding, act, hooks, key) viram falha de teste.
// Cada um é bug real — bloqueia a regressão no PR em vez de virar noise no log.
const originalConsoleError = console.error;
console.error = (...args) => {
  const first = args[0];

  if (typeof first === 'string' && first.startsWith('Warning:')) {
    throw new Error(`Console.error caught (treat as test failure):\n${first}`);
  }

  originalConsoleError(...args);
};

// ─── MSW lifecycle ──────────────────────────────────────────────────────────
//
// Server intercepta TODAS as requests HTTP nos testes. Por padrão, requests
// não-handled disparam erro (onUnhandledRequest: 'error'). Isso garante que
// nenhum teste vaze pra rede de verdade silenciosamente.

const { server } = require('./test-utils/msw/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(async () => {
  server.close();
  // Fecha o connection pool do undici — sem isso, o agent HTTP global mantém
  // sockets keep-alive e Jest não desliga até o timeout.
  try {
    const { getGlobalDispatcher } = require('undici');
    const dispatcher = getGlobalDispatcher();
    if (dispatcher && typeof dispatcher.close === 'function') {
      await dispatcher.close();
    }
  } catch {
    // undici não instalado ou já fechado — ignora.
  }
});

// ─── Mocks globais ──────────────────────────────────────────────────────────
//
// Mocks de react-router-dom para evitar necessidade de Router wrapper em cada teste.
// Testes que precisam de comportamento específico podem sobrescrever com jest.mock().

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));
