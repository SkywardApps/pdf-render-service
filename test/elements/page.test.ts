import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

const LETTER = { width: 612, height: 792 };
const LEGAL = { width: 612, height: 1008 };
const A4 = { width: 595.28, height: 841.89 };

const within = (actual: number, expected: number, tolerance = 1) =>
  Math.abs(actual - expected) <= tolerance;

describe('page element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('honors the request-level `size`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      size: 'LETTER',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'a' }] }],
    });
    const { width, height } = result.pdf.pageSizes[0];
    expect(within(width, LETTER.width)).toBe(true);
    expect(within(height, LETTER.height)).toBe(true);
  });

  it('honors the request-level `size: "A4"`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      size: 'A4',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'a' }] }],
    });
    const { width, height } = result.pdf.pageSizes[0];
    expect(within(width, A4.width)).toBe(true);
    expect(within(height, A4.height)).toBe(true);
  });

  it('per-page `size` overrides request-level `size`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      size: 'LETTER',
      pages: [
        { type: 'page', size: 'LEGAL', children: [{ type: 'text', text: 'a' }] },
        { type: 'page', children: [{ type: 'text', text: 'b' }] },
      ],
    });
    expect(result.pdf.numPages).toBe(2);
    expect(within(result.pdf.pageSizes[0].width, LEGAL.width)).toBe(true);
    expect(within(result.pdf.pageSizes[0].height, LEGAL.height)).toBe(true);
    expect(within(result.pdf.pageSizes[1].width, LETTER.width)).toBe(true);
    expect(within(result.pdf.pageSizes[1].height, LETTER.height)).toBe(true);
  });

  it('honors `orientation: "landscape"`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      size: 'LETTER',
      orientation: 'landscape',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'a' }] }],
    });
    const { width, height } = result.pdf.pageSizes[0];
    expect(width).toBeGreaterThan(height);
    expect(within(width, LETTER.height)).toBe(true);
    expect(within(height, LETTER.width)).toBe(true);
  });

  it('per-page `orientation` overrides request-level orientation', async () => {
    const result = await renderPdf(server, {
      title: 't',
      size: 'LETTER',
      orientation: 'portrait',
      pages: [
        { type: 'page', orientation: 'landscape', children: [{ type: 'text', text: 'a' }] },
        { type: 'page', children: [{ type: 'text', text: 'b' }] },
      ],
    });
    expect(result.pdf.pageSizes[0].width).toBeGreaterThan(result.pdf.pageSizes[0].height);
    expect(result.pdf.pageSizes[1].height).toBeGreaterThan(result.pdf.pageSizes[1].width);
  });

  it('renders without crashing when request-level `debug: true`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      debug: true,
      pages: [{ type: 'page', children: [{ type: 'text', text: 'debug-mode' }] }],
    });
    expect(result.pdf.textPerPage[0]).toContain('debug-mode');
  });

  it('renders multiple pages in declaration order', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        { type: 'page', children: [{ type: 'text', text: 'first' }] },
        { type: 'page', children: [{ type: 'text', text: 'second' }] },
        { type: 'page', children: [{ type: 'text', text: 'third' }] },
      ],
    });
    expect(result.pdf.numPages).toBe(3);
    expect(result.pdf.textPerPage[0]).toContain('first');
    expect(result.pdf.textPerPage[1]).toContain('second');
    expect(result.pdf.textPerPage[2]).toContain('third');
  });
});
