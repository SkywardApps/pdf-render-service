import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

const PNG_RED_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('image element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('renders an image given a data: URI', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ src: PNG_RED_1x1, style: { width: 20, height: 20 } }],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(1);
    expect(result.body.length).toBeGreaterThan(500);
  });

  it('renders an image with cache disabled', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { src: PNG_RED_1x1, cache: false, style: { width: 20, height: 20 } },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(1);
  });

  it('templates the src from data', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { logo: PNG_RED_1x1 },
      pages: [
        {
          type: 'page',
          children: [
            { src: '{{data.logo}}', style: { width: 20, height: 20 } },
            { type: 'text', text: 'after-image' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('after-image');
  });
});
