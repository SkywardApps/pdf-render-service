import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';

describe('error response contract', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns 400 with a "Render Stack:" breadcrumb when an element fails to infer', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ type: 'view', children: [{ /* no discriminator, no type */ } as Record<string, unknown>] }],
        },
      ],
    });
    expect(res.status).toBe(400);
    const body = res.text();
    expect(body).toMatch(/Error/);
    expect(body).toMatch(/Render Stack:/);
    expect(body).toMatch(/document\[0\]/);
  });

  it('renderStack includes the document, page, and offending child paths', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'view',
              children: [
                {
                  type: 'view',
                  children: [{ text: 'oops', src: 'https://example.com/x.png' }],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(res.status).toBe(400);
    const body = res.text();
    expect(body).toMatch(/Render Stack:/);
    expect(body).toMatch(/document\[0\]/);
    expect(body).toMatch(/view/);
  });

  it('reports conflicting discriminators in the error message', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ text: 'has-text', src: 'has-src.png' } as Record<string, unknown>],
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/text|src/i);
  });

  it('reports an unknown explicit element type', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [{ type: 'not-a-real-type' } as Record<string, unknown>],
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/factory/i);
  });

  describe('renderStack breadcrumb annotations', () => {
    it('annotates an element with [key=...] when `key` is set', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            key: 'mainPage',
            children: [{ /* no discriminator → inference fails */ } as Record<string, unknown>],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/page\[key=mainPage\]/);
    });

    it('annotates an element with [comment=...] when `comment` is set (and no `key`)', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            comment: 'invoice header section',
            children: [{} as Record<string, unknown>],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/page\[comment=invoice header section\]/);
    });

    it('prefers [key=...] over [comment=...] when both are set', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            key: 'pageK',
            comment: 'pageC',
            children: [{} as Record<string, unknown>],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/page\[key=pageK\]/);
      expect(res.text()).not.toMatch(/comment=pageC/);
    });

    it('annotates a `text` element with [text=...] when failing inside its subtree', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              {
                type: 'text',
                text: 'visible-anchor-text',
                children: [{} as Record<string, unknown>],
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/text\[text=visible-anchor-text\]/);
    });

    it('annotates a `list` element with [basis=...] when its own basis evaluation fails', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              {
                type: 'list',
                basis: 'undefined.does.not.exist',
                loop: { type: 'text', text: 'x' },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/list\[basis=undefined\.does\.not\.exist\]/);
    });

    it('truncates long text/comment annotations to 50 chars', async () => {
      const longText = 'a'.repeat(80);
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              {
                type: 'text',
                text: longText,
                children: [{} as Record<string, unknown>],
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/text\[text=a{50}\]/);
      expect(res.text()).not.toMatch(/text\[text=a{60,}\]/);
    });
  });

  describe('discriminator conflict matrix', () => {
    it('detects text + children conflict', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              { text: 'has-text', children: [] } as Record<string, unknown>,
            ],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/children/i);
    });

    it('detects src + children conflict', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              { src: 'data:image/png;base64,iVBOR', children: [] } as Record<string, unknown>,
            ],
          },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/children/i);
    });

    it('detects text + basis+loop conflict', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              {
                text: 'has-text',
                basis: 'data.items',
                loop: { type: 'text', text: 'x' },
              } as Record<string, unknown>,
            ],
          },
        ],
        data: { items: [] },
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/basis/i);
    });

    it('detects children + basis+loop conflict', async () => {
      const res = await server.postJson({
        title: 't',
        pages: [
          {
            type: 'page',
            children: [
              {
                children: [],
                basis: 'data.items',
                loop: { type: 'text', text: 'x' },
              } as Record<string, unknown>,
            ],
          },
        ],
        data: { items: [] },
      });
      expect(res.status).toBe(400);
      expect(res.text()).toMatch(/basis/i);
    });
  });
});
