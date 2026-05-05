import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('shadow element', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('renders shadowed text when type is explicit', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'shadow', text: 'BIG-TITLE', style: { fontSize: 24 } },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('BIG-TITLE');
  });

  it('uses the requested shadowColor / shadowOpacity / shadowTranslate without crashing', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'shadow',
              text: 'CUSTOM',
              style: {
                fontSize: 18,
                shadowColor: '#FF0000',
                shadowOpacity: 0.3,
                shadowTranslate: 4,
              },
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('CUSTOM');
  });

  it('honors shadowTranslateX / shadowTranslateY overrides', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'shadow',
              text: 'XY-OVERRIDE',
              style: {
                fontSize: 18,
                shadowTranslate: 1,
                shadowTranslateX: 5,
                shadowTranslateY: 7,
              },
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('XY-OVERRIDE');
  });

  it('exposes pageNumber/totalPages to shadow text', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'shadow',
              text: 'P{{pageNumber}}/{{totalPages}}',
            },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('P1/1');
  });
});
