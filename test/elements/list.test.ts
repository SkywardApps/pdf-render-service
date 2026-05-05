import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';
import { expectTextOnEveryPage } from '../fixtures/pdfReader';

describe('list element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('iterates over the basis array, emitting one element per item', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['alpha', 'beta', 'gamma'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items',
              loop: { type: 'text', text: '* {{$item}}' },
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('alpha');
    expect(text).toContain('beta');
    expect(text).toContain('gamma');
    expect(text.indexOf('alpha')).toBeLessThan(text.indexOf('beta'));
    expect(text.indexOf('beta')).toBeLessThan(text.indexOf('gamma'));
  });

  it('exposes $index as the 0-based iteration index', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['a', 'b', 'c'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items',
              loop: { type: 'text', text: '{{$index}}-{{$item}}' },
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('0-a');
    expect(text).toContain('1-b');
    expect(text).toContain('2-c');
  });

  it('exposes $parent referring to the enclosing iterations $item in nested lists', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: {
        groups: [
          { name: 'g1', items: ['x', 'y'] },
          { name: 'g2', items: ['z'] },
        ],
      },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.groups',
              loop: {
                type: 'list',
                basis: '$item.items',
                loop: { type: 'text', text: '{{$parent.name}}/{{$item}}' },
              },
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('g1/x');
    expect(text).toContain('g1/y');
    expect(text).toContain('g2/z');
  });

  it('renders an optional header before the iterations', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['a', 'b'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items',
              header: { type: 'text', text: 'HEADER-MARK' },
              loop: { type: 'text', text: 'item:{{$item}}' },
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('HEADER-MARK');
    expect(text.indexOf('HEADER-MARK')).toBeLessThan(text.indexOf('item:a'));
  });

  it('renders an optional footer after the iterations', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['a', 'b'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items',
              loop: { type: 'text', text: 'item:{{$item}}' },
              footer: { type: 'text', text: 'FOOTER-MARK' },
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('FOOTER-MARK');
    expect(text.indexOf('item:b')).toBeLessThan(text.indexOf('FOOTER-MARK'));
  });

  it('repeats the header on every page that the list spans', async () => {
    const items = Array.from({ length: 6 }, (_, i) => `row-${i}`);
    const result = await renderPdf(server, {
      title: 't',
      data: { items },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items',
              header: { type: 'text', text: 'REPEATED-HEADER' },
              loop: {
                type: 'view',
                break: true,
                children: [{ type: 'text', text: '{{$item}}' }],
              },
            },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBeGreaterThan(1);
    expectTextOnEveryPage(result.pdf, 'REPEATED-HEADER');
  });

  it('accepts a `loop` body that is an array of elements', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['a', 'b'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items',
              loop: [
                { type: 'text', text: 'before-{{$item}}' },
                { type: 'text', text: 'after-{{$item}}' },
              ],
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('before-a');
    expect(text).toContain('after-a');
    expect(text).toContain('before-b');
    expect(text).toContain('after-b');
  });

  it('accepts an inline-expression `basis` that resolves to an array', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['x', 'y', 'z'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'list',
              basis: 'data.items.filter(s => s !== "y")',
              loop: { type: 'text', text: '{{$item}}' },
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('x');
    expect(text).toContain('z');
    expect(text).not.toContain('y');
  });
});
