import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - special locals', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('pageNumber and totalPages', () => {
    it('are available in `text` element bodies', async () => {
      const result = await renderPdf(server, {
        title: 't',
        pages: [
          {
            type: 'page',
            children: [{ type: 'text', text: '{{pageNumber}}/{{totalPages}}' }],
          },
        ],
      });
      expect(result.pdf.textPerPage[0]).toContain('1/1');
    });

    it('are available in `shadow` element bodies', async () => {
      const result = await renderPdf(server, {
        title: 't',
        pages: [
          {
            type: 'page',
            children: [{ type: 'shadow', text: '{{pageNumber}}/{{totalPages}}' }],
          },
        ],
      });
      expect(result.pdf.textPerPage[0]).toContain('1/1');
    });
  });

  describe('$item / $index inside list iterations', () => {
    it('exposes the current item value and index', async () => {
      const result = await renderPdf(server, {
        title: 't',
        data: { items: ['x', 'y', 'z'] },
        pages: [
          {
            type: 'page',
            children: [
              {
                type: 'list',
                basis: 'data.items',
                loop: { type: 'text', text: '[{{$index}}|{{$item}}]' },
              },
            ],
          },
        ],
      });
      const text = result.pdf.textPerPage[0];
      expect(text).toContain('[0|x]');
      expect(text).toContain('[1|y]');
      expect(text).toContain('[2|z]');
    });
  });

  describe('appliedStyle inside style values', () => {
    it('lets a templated style value reference class-derived state', async () => {
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
                style: { fontSize: '{{ appliedStyle.fontSize * 2 }}' as unknown as number },
                text: 'doubled',
              },
            ],
          },
        ],
      });
      expect(result.pdf.textPerPage[0]).toContain('doubled');
    });
  });
});
