import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - fast path dereferences', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('resolves a top-level data field', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { name: 'Alice' },
      pages: [{ type: 'page', children: [{ type: 'text', text: '{{data.name}}' }] }],
    });
    expect(result.pdf.textPerPage[0]).toContain('Alice');
  });

  it('resolves a deeply-nested dotted path', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { user: { profile: { fullName: 'Eve Doe' } } },
      pages: [
        {
          type: 'page',
          children: [{ type: 'text', text: 'Hello {{data.user.profile.fullName}}' }],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Hello Eve Doe');
  });

  it('resolves multiple substitutions in one string', async () => {
    const result = await renderPdf(server, {
      title: 't',
      data: { first: 'Jane', last: 'Smith' },
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: '{{data.first}} {{data.last}}' },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('Jane Smith');
  });

  it('resolves top-level request fields like `title`', async () => {
    const result = await renderPdf(server, {
      title: 'My Doc',
      pages: [
        {
          type: 'page',
          children: [{ type: 'text', text: 'Doc title is "{{title}}"' }],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('My Doc');
  });
});
