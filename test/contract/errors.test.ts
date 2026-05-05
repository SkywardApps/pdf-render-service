import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';

describe('error response contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns 400 with a "Render Stack:" breadcrumb when an element fails to infer', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ type: 'view', children: [{ /* no discriminator, no type */ } as Record<string, unknown>] }],
        },
      ],
    });
    expect(res.status).toBe(400);
    const body = res.text();
    expect(body).toMatch(/Error/);
    expect(body).toMatch(/Render Stack:/);
    expect(body).toMatch(/document\[0\]/);
  });

  it('renderStack includes the document, page, and offending child paths', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              children: [
                {
                  type: 'view',
                  children: [{ text: 'oops', src: 'https://example.com/x.png' }],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(res.status).toBe(400);
    const body = res.text();
    expect(body).toMatch(/Render Stack:/);
    expect(body).toMatch(/document\[0\]/);
    expect(body).toMatch(/view/);
  });

  it('reports conflicting discriminators in the error message', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ text: 'has-text', src: 'has-src.png' } as Record<string, unknown>],
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/text|src/i);
  });

  it('reports an unknown explicit element type', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ type: 'not-a-real-type' } as Record<string, unknown>],
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/factory/i);
  });
});
