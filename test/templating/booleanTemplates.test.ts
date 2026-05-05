import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - boolean fields accept template strings', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('honors a `break: "true"` template string by forcing a page break', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { shouldBreak: true },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'first-page' },
            {
              type: 'view',
              break: '{{data.shouldBreak ? "true" : "false"}}' as unknown as boolean,
              children: [{ type: 'text', text: 'second-page' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(2);
    expect(result.pdf.textPerPage[0]).toContain('first-page');
    expect(result.pdf.textPerPage[1]).toContain('second-page');
  });

  it('treats `break: "false"` as falsy and does not break', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { shouldBreak: false },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'first' },
            {
              type: 'view',
              break: '{{data.shouldBreak ? "true" : "false"}}' as unknown as boolean,
              children: [{ type: 'text', text: 'second' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(1);
    expect(result.pdf.textPerPage[0]).toContain('first');
    expect(result.pdf.textPerPage[0]).toContain('second');
  });

  it('honors literal boolean values for `break`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'p1' },
            {
              type: 'view',
              break: true,
              children: [{ type: 'text', text: 'p2' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(2);
  });
});
