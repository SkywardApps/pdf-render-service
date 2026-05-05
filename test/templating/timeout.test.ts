import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - 150ms script timeout', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('terminates a runaway expression and stringifies the timeout error into the output', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              text: '{{ (function(){ while(true){} })() }}',
            },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(1);
    expect(result.pdf.textPerPage[0].toLowerCase()).toMatch(/timeout|timed out|error/);
  });

  it('does NOT abort the whole render when one expression throws or times out', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              text: '{{ (function(){ while(true){} })() }}',
            },
            { type: 'text', text: 'still-renders' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('still-renders');
  });
});
