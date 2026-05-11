/**
 * Branch coverage tests for dailyPageApi.ts — resolveApiBaseUrl branch (line 42).
 *
 * The branch at line 42 is: if globalThis.__VITE_API_URL__ is a non-empty string,
 * return it; otherwise fall back to 'http://localhost:3003'.
 *
 * The module is evaluated once at load time and API_BASE_URL is a constant.
 * To cover the truthy branch we use jest.resetModules() + re-import.
 *
 * NOTE: The dynamic import with query-string cache-buster trick does NOT work in
 * Jest (SWC CJS transform strips query strings). Instead we use jest.isolateModules()
 * to get a fresh module evaluation per test.
 */

describe('dailyPageApi — resolveApiBaseUrl __VITE_API_URL__ truthy branch (line 42)', () => {
  const GLOBAL = globalThis as { __VITE_API_URL__?: string };
  const HAD_ORIGINAL = Object.prototype.hasOwnProperty.call(GLOBAL, '__VITE_API_URL__');
  const ORIGINAL_VITE_URL = GLOBAL.__VITE_API_URL__;

  afterEach(() => {
    if (HAD_ORIGINAL && ORIGINAL_VITE_URL !== undefined) {
      GLOBAL.__VITE_API_URL__ = ORIGINAL_VITE_URL;
    } else {
      delete GLOBAL.__VITE_API_URL__;
    }
    jest.resetModules();
  });

  it('uses __VITE_API_URL__ when it is a non-empty string (line 42 truthy branch)', () => {
    (globalThis as { __VITE_API_URL__?: string }).__VITE_API_URL__ = 'http://my-custom-api:9000';

    // jest.isolateModules evaluates the module fresh with the updated global
    let apiBaseUrl: string | undefined;
    jest.isolateModules(() => {
      const mod = jest.requireActual('../dailyPageApi') as { API_BASE_URL: string };
      apiBaseUrl = mod.API_BASE_URL;
    });

    expect(apiBaseUrl).toBe('http://my-custom-api:9000');
  });

  it('falls back to localhost:3003 when __VITE_API_URL__ is an empty string', () => {
    (globalThis as { __VITE_API_URL__?: string }).__VITE_API_URL__ = '';

    let apiBaseUrl: string | undefined;
    jest.isolateModules(() => {
      const mod = jest.requireActual('../dailyPageApi') as { API_BASE_URL: string };
      apiBaseUrl = mod.API_BASE_URL;
    });

    expect(apiBaseUrl).toBe('http://localhost:3003');
  });

  it('falls back to localhost:3003 when __VITE_API_URL__ is undefined', () => {
    // exactOptionalPropertyTypes: set to undefined requires deleting the property
    delete (globalThis as { __VITE_API_URL__?: string }).__VITE_API_URL__;

    let apiBaseUrl: string | undefined;
    jest.isolateModules(() => {
      const mod = jest.requireActual('../dailyPageApi') as { API_BASE_URL: string };
      apiBaseUrl = mod.API_BASE_URL;
    });

    expect(apiBaseUrl).toBe('http://localhost:3003');
  });
});
