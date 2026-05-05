import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('link element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('renders link text when type:"link" is explicit', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'link', href: 'https://example.com', text: 'Visit Example' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Visit Example');
  });

  it('templates href and text', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { url: 'https://example.com/page', label: 'Click {{data.label}}' },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'link',
              href: '{{data.url}}',
              text: 'Click here',
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Click here');
  });

  it('renders children when no text is provided', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'link',
              href: 'https://example.com',
              children: [{ type: 'text', text: 'wrapped-content' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('wrapped-content');
  });

  it('renders `text` and ignores `children` when both are provided (text wins for link)', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'link',
              href: 'https://example.com',
              text: 'KEPT-LINK',
              children: [{ type: 'text', text: 'IGNORED' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('KEPT-LINK');
    expect(result.pdf.textPerPage[0]).not.toContain('IGNORED');
  });
});
