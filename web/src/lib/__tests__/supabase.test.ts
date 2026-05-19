jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({ from: jest.fn() }),
}));

const VALID_URL = 'https://abcdef.supabase.co';
const VALID_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

function setEnv(url: string | undefined, key: string | undefined): void {
  if (url !== undefined) {
    process.env['VITE_SUPABASE_URL'] = url;
  } else {
    delete process.env['VITE_SUPABASE_URL'];
  }
  if (key !== undefined) {
    process.env['VITE_SUPABASE_ANON_KEY'] = key;
  } else {
    delete process.env['VITE_SUPABASE_ANON_KEY'];
  }
}

afterEach(() => {
  jest.resetModules();
  delete process.env['VITE_SUPABASE_URL'];
  delete process.env['VITE_SUPABASE_ANON_KEY'];
});

describe('supabase client', () => {
  it('resolves and exports a SupabaseClient when env vars are valid', async () => {
    setEnv(VALID_URL, VALID_KEY);

    jest.resetModules();
    const mod = await import('@/lib/supabase');

    expect(mod.supabase).toBeDefined();
    expect(typeof mod.supabase.from).toBe('function');
  });

  it('throws with VITE_SUPABASE_URL in message when URL is missing', async () => {
    setEnv(undefined, VALID_KEY);

    jest.resetModules();
    await expect(import('@/lib/supabase')).rejects.toThrow('VITE_SUPABASE_URL');
  });

  it('throws with VITE_SUPABASE_URL in message when URL is empty string', async () => {
    setEnv('', VALID_KEY);

    jest.resetModules();
    await expect(import('@/lib/supabase')).rejects.toThrow('VITE_SUPABASE_URL');
  });

  it('throws with VITE_SUPABASE_URL in message when URL contains <', async () => {
    setEnv('<your-url>', VALID_KEY);

    jest.resetModules();
    await expect(import('@/lib/supabase')).rejects.toThrow('VITE_SUPABASE_URL');
  });

  it('throws with VITE_SUPABASE_URL in message when URL contains TODO', async () => {
    setEnv('TODO', VALID_KEY);

    jest.resetModules();
    await expect(import('@/lib/supabase')).rejects.toThrow('VITE_SUPABASE_URL');
  });

  it('throws with VITE_SUPABASE_ANON_KEY in message when anon key is missing', async () => {
    setEnv(VALID_URL, undefined);

    jest.resetModules();
    await expect(import('@/lib/supabase')).rejects.toThrow('VITE_SUPABASE_ANON_KEY');
  });

  it('throws with VITE_SUPABASE_ANON_KEY in message when anon key is empty string', async () => {
    setEnv(VALID_URL, '');

    jest.resetModules();
    await expect(import('@/lib/supabase')).rejects.toThrow('VITE_SUPABASE_ANON_KEY');
  });

  it('exports the same supabase reference on repeated imports (singleton)', async () => {
    setEnv(VALID_URL, VALID_KEY);

    jest.resetModules();
    const mod1 = await import('@/lib/supabase');
    const mod2 = await import('@/lib/supabase');

    expect(mod1.supabase).toBe(mod2.supabase);
  });
});
