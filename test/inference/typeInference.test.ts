import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

const PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==';

describe('type inference contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('infers depth-1 element as a page even without `type`', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [{ children: [{ type: 'text', text: 'depth-one-page' }] }],
    });
    expect(result.pdf.numPages).toBe(1);
    expect(result.pdf.textPerPage[0]).toContain('depth-one-page');
  });

  it('infers `text` from the `text` property at deeper depths', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [{ type: 'page', children: [{ text: 'inferred-text' }] }],
    });
    expect(result.pdf.textPerPage[0]).toContain('inferred-text');
  });

  it('infers `image` from the `src` property at deeper depths', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ src: PNG_DATA_URI, style: { width: 10, height: 10 } }],
        },
      ],
    });
    expect(result.pdf.numPages).toBe(1);
  });

  it('infers `view` from the `children` property at deeper depths', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ children: [{ type: 'text', text: 'inside-view' }] }],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('inside-view');
  });

  it('infers `list` from `basis` + `loop` at deeper depths', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['alpha', 'beta', 'gamma'] },
      pages: [
        {
          type: 'page',
          children: [
            {
              basis: 'data.items',
              loop: { type: 'text', text: '{{$item}}' },
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('alpha');
    expect(result.pdf.textPerPage[0]).toContain('beta');
    expect(result.pdf.textPerPage[0]).toContain('gamma');
  });

  it('rejects a `link` with no explicit type (no inference path)', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ href: 'https://example.com' }],
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/inferred|type/i);
  });

  it('renders a `link` correctly when `type: "link"` is explicit', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'link', href: 'https://example.com', text: 'click-here' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('click-here');
  });

  it('treats a bare `text` element as `text` (not `shadow`); shadow needs explicit type', async () => {
    const inferred = await renderPdf(server, {
      title: 't',
      pages: [{ type: 'page', children: [{ text: 'no-shadow' }] }],
    });
    expect(inferred.pdf.textPerPage[0]).toContain('no-shadow');

    const explicit = await renderPdf(server, {
      title: 't',
      pages: [{ type: 'page', children: [{ type: 'shadow', text: 'with-shadow' }] }],
    });
    expect(explicit.pdf.textPerPage[0]).toContain('with-shadow');
  });
});
