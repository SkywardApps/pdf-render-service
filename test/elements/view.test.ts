import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('view element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('renders nested children in declaration order', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              children: [
                { type: 'text', text: 'one' },
                { type: 'text', text: 'two' },
                { type: 'text', text: 'three' },
              ],
            },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text.indexOf('one')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('one')).toBeLessThan(text.indexOf('two'));
    expect(text.indexOf('two')).toBeLessThan(text.indexOf('three'));
  });

  it('renders an empty view with no children without crashing', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'view', children: [] },
            { type: 'text', text: 'after-empty-view' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('after-empty-view');
  });

  it('skips a view subtree when condition is falsy', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { showSecret: false },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              condition: 'data.showSecret',
              children: [{ type: 'text', text: 'SECRET' }],
            },
            { type: 'text', text: 'visible' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('visible');
    expect(result.pdf.textPerPage[0]).not.toContain('SECRET');
  });

  it('renders a view subtree when condition is truthy', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { showSecret: true },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              condition: 'data.showSecret',
              children: [{ type: 'text', text: 'SECRET' }],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('SECRET');
  });

  it('supports flexbox row layout via style', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              style: { display: 'flex', flexDirection: 'row' },
              children: [
                { type: 'text', text: 'left' },
                { type: 'text', text: 'right' },
              ],
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('left');
    expect(result.pdf.textPerPage[0]).toContain('right');
  });
});
