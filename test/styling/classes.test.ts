import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';
import { findItem } from '../fixtures/pdfReader';

describe('styling - class precedence and inline overrides', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('renders with named classes applied via `classes` array', async () => {
    const result = await renderPdf(server, {
      title: 't',
      styles: {
        big: { fontSize: 24 },
      },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', classes: ['big'], text: 'BIG' },
            { type: 'text', text: 'normal' },
          ],
        },
      ],
    });
    const big = findItem(result.pdf, 0, 'BIG');
    const normal = findItem(result.pdf, 0, 'normal');
    expect(big).toBeDefined();
    expect(normal).toBeDefined();
    expect(big!.height).toBeGreaterThan(normal!.height);
  });

  it('applies later classes after earlier ones (positional precedence)', async () => {
    const result = await renderPdf(server, {
      title: 't',
      styles: {
        big: { fontSize: 24 },
        small: { fontSize: 8 },
      },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', classes: ['big', 'small'], text: 'WINS-SMALL' },
            { type: 'text', classes: ['small', 'big'], text: 'WINS-BIG' },
          ],
        },
      ],
    });
    const small = findItem(result.pdf, 0, 'WINS-SMALL');
    const big = findItem(result.pdf, 0, 'WINS-BIG');
    expect(small).toBeDefined();
    expect(big).toBeDefined();
    expect(big!.height).toBeGreaterThan(small!.height);
  });

  it('inline `style` overrides class-derived properties', async () => {
    const result = await renderPdf(server, {
      title: 't',
      styles: {
        big: { fontSize: 24 },
      },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              classes: ['big'],
              style: { fontSize: 8 },
              text: 'INLINE-WINS',
            },
            { type: 'text', text: 'baseline' },
          ],
        },
      ],
    });
    const inline = findItem(result.pdf, 0, 'INLINE-WINS');
    const baseline = findItem(result.pdf, 0, 'baseline');
    expect(inline).toBeDefined();
    expect(baseline).toBeDefined();
    expect(inline!.height).toBeLessThanOrEqual(baseline!.height + 0.5);
  });

  it('renders templated style values', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { sizeNumber: 22 },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              style: { fontSize: '{{data.sizeNumber}}' as unknown as number },
              text: 'TEMPLATED',
            },
            { type: 'text', text: 'baseline' },
          ],
        },
      ],
    });
    const templated = findItem(result.pdf, 0, 'TEMPLATED');
    const baseline = findItem(result.pdf, 0, 'baseline');
    expect(templated).toBeDefined();
    expect(baseline).toBeDefined();
    expect(templated!.height).toBeGreaterThan(baseline!.height);
  });

  it('appliedStyle reflects the class-merged state inside style values', async () => {
    const result = await renderPdf(server, {
      title: 't',
      styles: {
        base: { fontSize: 10 },
      },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              classes: ['base'],
              style: {
                fontSize: '{{ appliedStyle.fontSize * 2 }}' as unknown as number,
              },
              text: 'DOUBLED',
            },
            { type: 'text', text: 'plain' },
          ],
        },
      ],
    });
    const doubled = findItem(result.pdf, 0, 'DOUBLED');
    const plain = findItem(result.pdf, 0, 'plain');
    expect(doubled).toBeDefined();
    expect(plain).toBeDefined();
    expect(doubled!.height).toBeGreaterThan(plain!.height);
  });
});
