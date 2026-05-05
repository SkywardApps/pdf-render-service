import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';

describe('validation contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  afterEach(() => {
    delete process.env.VALIDATEAPIPAYLOADS;
  });

  it('accepts a malformed payload (extra props) when neither strict flag is set', async () => {
    const res = await server.postJson({
      title: 't',
      bogusUnknownField: 12345,
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x' }] }],
    });
    expect(res.status).toBe(200);
  });

  it('rejects a malformed payload when request opts in via strict: true', async () => {
    const res = await server.postJson({
      strict: true,
      title: 't',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x', NOTAREALFIELD: 5 }] }],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/The request was not valid/);
  });

  it('rejects a malformed payload when env VALIDATEAPIPAYLOADS=strict', async () => {
    process.env.VALIDATEAPIPAYLOADS = 'strict';
    const res = await server.postJson({
      title: 't',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x', NOTAREALFIELD: 5 }] }],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/The request was not valid/);
  });

  it('does not validate when VALIDATEAPIPAYLOADS is set to anything other than strict', async () => {
    process.env.VALIDATEAPIPAYLOADS = 'loose';
    const res = await server.postJson({
      title: 't',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x', NOTAREALFIELD: 5 }] }],
    });
    expect(res.status).toBe(200);
  });

  it('returns 500 with parse error when body is not valid JSON', async () => {
    const res = await server.postRaw('this is not json', { 'content-type': 'application/json' });
    expect(res.status).toBe(500);
    expect(res.text()).toMatch(/Error generating the pdf/);
  });
});
