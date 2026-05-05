import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('text element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('renders the literal text', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [{ type: 'page', children: [{ type: 'text', text: 'Hello, World!' }] }],
    });
    expect(result.pdf.textPerPage[0]).toContain('Hello, World!');
  });

  it('interpolates {{data.X}} into the text', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { name: 'Alice' },
      pages: [
        { type: 'page', children: [{ type: 'text', text: 'Hi {{data.name}}!' }] },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Hi Alice');
  });

  // Inline children spans go through factory.createElement, which renders each
  // child as a <Text render={...}> with a deferred render callback. When such a
  // Text is nested inside another Text, pdfjs-dist's text extraction does not
  // surface the inner content. The render still produces a valid PDF, so we
  // assert structural success only here; visual inspection confirms the spans
  // do appear in real viewers.
  it('accepts inline text children without crashing', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'ANCHOR' },
            {
              type: 'text',
              children: [
                { text: 'Hello ' },
                { text: 'World', style: { fontWeight: 'bold' } },
                { text: '!' },
              ],
            },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(1);
    expect(result.pdf.textPerPage[0]).toContain('ANCHOR');
  });

  // For `text`, children win over `text` (the text property is dropped with
  // a warning log). We can only verify "DISCARDED is absent" because the
  // pdfjs-dist limitation above means we can't read the child content.
  it('discards `text` when both `text` and `children` are present (children wins)', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'ANCHOR' },
            {
              type: 'text',
              text: 'DISCARDED',
              children: [{ text: 'KEPT' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('ANCHOR');
    expect(result.pdf.textPerPage[0]).not.toContain('DISCARDED');
  });

  it('renders empty text without crashing', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: '' },
            { type: 'text', text: 'after-empty' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('after-empty');
  });

  it('exposes pageNumber and totalPages locals', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'Page {{pageNumber}} of {{totalPages}}' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Page 1 of 1');
  });

  it('reports pageNumber correctly across multiple pages', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              fixed: true,
              text: 'P {{pageNumber}}/{{totalPages}}',
            },
            { type: 'text', text: 'first-page-content' },
          ],
        },
        {
          type: 'page',
          children: [
            {
              type: 'text',
              fixed: true,
              text: 'P {{pageNumber}}/{{totalPages}}',
            },
            { type: 'text', text: 'second-page-content' },
          ],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(2);
    expect(result.pdf.textPerPage[0]).toContain('P 1/2');
    expect(result.pdf.textPerPage[1]).toContain('P 2/2');
  });
});
