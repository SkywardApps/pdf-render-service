import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - condition', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('skips an element subtree when condition is falsy', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { showAdmin: false },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'always' },
            {
              type: 'view',
              condition: 'data.showAdmin',
              children: [{ type: 'text', text: 'admin-only' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('always');
    expect(result.pdf.textPerPage[0]).not.toContain('admin-only');
  });

  it('renders an element when condition is truthy', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { showAdmin: true },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              condition: 'data.showAdmin',
              children: [{ type: 'text', text: 'admin-only' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('admin-only');
  });

  it('honors JS expressions in condition', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { count: 5 },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              condition: 'data.count > 3',
              children: [{ type: 'text', text: 'many' }],
            },
            {
              type: 'view',
              condition: 'data.count < 3',
              children: [{ type: 'text', text: 'few' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('many');
    expect(result.pdf.textPerPage[0]).not.toContain('few');
  });

  it('skips a list element entirely when condition is falsy', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { items: ['a', 'b'], shouldRun: false },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'before' },
            {
              type: 'list',
              condition: 'data.shouldRun',
              basis: 'data.items',
              loop: { type: 'text', text: 'item:{{$item}}' },
            },
            { type: 'text', text: 'after' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('before');
    expect(result.pdf.textPerPage[0]).toContain('after');
    expect(result.pdf.textPerPage[0]).not.toContain('item:a');
  });
});
