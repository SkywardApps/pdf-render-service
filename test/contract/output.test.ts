import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { singleTextPage } from '../fixtures/payloads';
import { renderPdf } from '../fixtures/renderPdf';

describe('output contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('responds with Content-Type application/pdf', async () => {
    const result = await renderPdf(server, singleTextPage('hello'));
    expect(result.headers['content-type']).toContain('application/pdf');
  });

  it('starts with the %PDF- magic bytes', async () => {
    const result = await renderPdf(server, singleTextPage('hello'));
    expect(result.body.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('uses the request title in Content-Disposition', async () => {
    const result = await renderPdf(server, {
      title: 'Quarterly_Report',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x' }] }],
    });
    expect(result.headers['content-disposition']).toContain('filename="Quarterly_Report.pdf"');
  });

  it('sanitizes title characters outside [A-Za-z0-9_.-] to underscore', async () => {
    const result = await renderPdf(server, {
      title: 'foo bar/baz?:*"<>|',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x' }] }],
    });
    const cd = result.headers['content-disposition'];
    expect(cd).toContain('filename="foo_bar_baz_______.pdf"');
  });

  it('falls back to "document" when title is omitted', async () => {
    const result = await renderPdf(server, {
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x' }] }],
    });
    expect(result.headers['content-disposition']).toContain('filename="document.pdf"');
  });

  it('resolves templated title with data interpolation before sanitizing', async () => {
    const result = await renderPdf(server, {
      title: 'Report-{{data.id}}',
      data: { id: '42' },
      pages: [{ type: 'page', children: [{ type: 'text', text: 'x' }] }],
    });
    expect(result.headers['content-disposition']).toContain('filename="Report-42.pdf"');
  });
});
