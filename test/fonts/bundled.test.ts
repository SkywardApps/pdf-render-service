import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';

describe('bundled fonts', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('lists Roboto with regular, bold, italic, and bold-italic variants', async () => {
    const res = await server.get('/fonts');
    const body = res.json() as Array<{
      family: string;
      configurations: { weight: string; style: string }[];
    }>;
    const roboto = body.find((f) => f.family === 'Roboto');
    expect(roboto).toBeDefined();
    const variants = roboto!.configurations.map((c) => `${c.weight}/${c.style}`).sort();
    expect(variants).toContain('normal/normal');
    expect(variants).toContain('bold/normal');
    expect(variants).toContain('normal/italic');
    expect(variants).toContain('bold/italic');
  });

  it('lists Teko with the documented weight variants', async () => {
    const res = await server.get('/fonts');
    const body = res.json() as Array<{
      family: string;
      configurations: { weight: string; style: string }[];
    }>;
    const teko = body.find((f) => f.family === 'Teko');
    expect(teko).toBeDefined();
    const weights = teko!.configurations.map((c) => c.weight).sort();
    expect(weights).toEqual(expect.arrayContaining(['light', 'normal', 'medium', 'semibold', 'bold']));
  });

  it('lists Noto Sans with weights from thin to heavy', async () => {
    const res = await server.get('/fonts');
    const body = res.json() as Array<{
      family: string;
      configurations: { weight: string; style: string }[];
    }>;
    const noto = body.find((f) => f.family === 'Noto Sans');
    expect(noto).toBeDefined();
    const weights = new Set(noto!.configurations.map((c) => c.weight));
    expect(weights.has('thin')).toBe(true);
    expect(weights.has('ultralight')).toBe(true);
    expect(weights.has('light')).toBe(true);
    expect(weights.has('normal')).toBe(true);
    expect(weights.has('medium')).toBe(true);
    expect(weights.has('semibold')).toBe(true);
    expect(weights.has('bold')).toBe(true);
    expect(weights.has('ultrabold')).toBe(true);
    expect(weights.has('heavy')).toBe(true);
  });
});
