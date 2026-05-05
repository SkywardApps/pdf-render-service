import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - error recovery', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('stringifies a thrown error into the rendered text instead of failing the request', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              text: '{{ (function(){ throw new Error("BOOM") })() }}',
            },
          ],
        },
      ],
    });
    expect(result.status).toBe(200);
    expect(result.pdf.numPages).toBe(1);
    expect(result.pdf.textPerPage[0].toLowerCase()).toMatch(/error|boom/);
  });

  it('rendering continues for sibling elements after a template error', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'before' },
            {
              type: 'text',
              text: '{{ data.does.not.exist.deep }}',
            },
            { type: 'text', text: 'after' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('before');
    expect(result.pdf.textPerPage[0]).toContain('after');
  });

  it('handles missing data fields without crashing the render', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: {},
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              text: 'value: {{ data.missing.value || "fallback" }}',
            },
            { type: 'text', text: 'still-here' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('still-here');
  });
});
