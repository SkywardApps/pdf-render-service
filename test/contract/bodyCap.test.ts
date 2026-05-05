import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';

describe('body cap contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('accepts a request just under 30MB', async () => {
    const padding = 'a'.repeat(25 * 1024 * 1024);
    const res = await server.postJson({
      title: 't',
      data: { padding },
      pages: [{ type: 'page', children: [{ type: 'text', text: 'ok' }] }],
    });
    expect(res.status).toBe(200);
    expect(res.body.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  }, 60000);

  // The server destroys the TCP connection rather than returning a status, so
  // the observable signal is "fetch() rejected OR returned a clearly-empty
  // body". We accept either to stay portable across OS-level fetch behaviors.
  it('destroys the connection when the body exceeds 30MB', async () => {
    const padding = 'a'.repeat(31 * 1024 * 1024);
    const payload = {
      title: 't',
      data: { padding },
      pages: [{ type: 'page', children: [{ type: 'text', text: 'ok' }] }],
    };
    let networkErrored = false;
    try {
      const res = await server.postJson(payload);
      networkErrored = res.status >= 400 || res.body.length === 0;
    } catch {
      networkErrored = true;
    }
    expect(networkErrored).toBe(true);
  }, 60000);
});
