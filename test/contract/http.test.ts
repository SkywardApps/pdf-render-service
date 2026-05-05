import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';

describe('http transport contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /', () => {
    it('returns 200 with plaintext SUCCESS', async () => {
      const res = await server.get('/');
      expect(res.status).toBe(200);
      expect(res.text()).toBe('SUCCESS');
    });

    it('exposes CORS headers', async () => {
      const res = await server.get('/');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('GET /fonts', () => {
    it('returns 200 with a JSON list of registered fonts', async () => {
      const res = await server.get('/fonts');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      const body = res.json() as Array<{ family: string; configurations: unknown[] }>;
      const families = body.map((f) => f.family);
      expect(families).toContain('Roboto');
      expect(families).toContain('Teko');
      expect(families).toContain('Noto Sans');
    });
  });

  describe('OPTIONS', () => {
    it('returns 204 with CORS headers', async () => {
      const res = await server.options('/');
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
      expect(res.headers['access-control-max-age']).toBe('2592000');
    });
  });

  describe('unknown methods and paths', () => {
    it('GET on an unknown path returns 404', async () => {
      const res = await server.get('/no-such-thing');
      expect(res.status).toBe(404);
    });

    it('PUT returns 404 (only POST/GET/OPTIONS are routed)', async () => {
      const res = await server.request({ method: 'PUT', body: 'ignored' });
      expect(res.status).toBe(404);
    });

    it('DELETE returns 404', async () => {
      const res = await server.request({ method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });
});
