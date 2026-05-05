import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';
import { singleTextPage } from '../fixtures/payloads';

describe('smoke', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET / returns 200 SUCCESS', async () => {
    const res = await server.get('/');
    expect(res.status).toBe(200);
    expect(res.text()).toBe('SUCCESS');
  });

  it('POST / with a minimal text page returns a parseable PDF', async () => {
    const result = await renderPdf(server, singleTextPage('Hello World'));
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toContain('application/pdf');
    expect(result.pdf.numPages).toBe(1);
    expect(result.pdf.textPerPage[0]).toContain('Hello World');
  });
});
