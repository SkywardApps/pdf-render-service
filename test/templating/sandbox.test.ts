import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - sandboxed JS expressions', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('runs arithmetic and comparison expressions', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { x: 4 },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'result {{ data.x * 3 + 1 }}' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('result 13');
  });

  it('supports method calls like toFixed', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { cost: 7.123 },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: '${{ data.cost.toFixed(2) }}' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('$7.12');
  });

  it('supports map / filter on inline arrays', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              text: '{{ [1,2,3,4].filter(i => i > 2).map(i => "Index:" + (i+1)).join(",") }}',
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Index:4');
    expect(result.pdf.textPerPage[0]).toContain('Index:5');
  });

  it('exposes encodeURIComponent', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { q: 'a b/c?' },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'link',
              href: 'https://api.example.com?q={{encodeURIComponent(data.q)}}',
              text: 'Search',
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Search');
  });

  it('supports conditional expressions returning strings', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { active: true },
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'text',
              text: 'Status: {{ data.active ? "ON" : "OFF" }}',
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Status: ON');
  });
});
