import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';

describe('templating - sandbox security limits', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('does not execute eval() inside the sandbox', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: 'before [{{ eval("1 + 1") }}] after' },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).toContain('before');
    expect(text).toContain('after');
    expect(text).not.toMatch(/\[\s*2\s*\]/);
    expect(text.toLowerCase()).toMatch(/error|disabled|undefined|not.*function/);
  });

  it('does not allow require() inside the sandbox', async () => {
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: '{{ require("fs").readFileSync("/etc/passwd") }}' },
          ],
        },
      ],
    });
    const text = result.pdf.textPerPage[0];
    expect(text).not.toContain('root:');
    expect(text).not.toContain('/bin/bash');
    expect(text.toLowerCase()).toMatch(/error|undefined|not.*function|require/);
  });

  it('does not expose process.env inside the sandbox', async () => {
    process.env.SECRET_TEST_VALUE = 'this-should-not-leak';
    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'text', text: '[{{ process.env.SECRET_TEST_VALUE }}]' },
          ],
        },
      ],
    });
    delete process.env.SECRET_TEST_VALUE;
    expect(result.pdf.textPerPage[0]).not.toContain('this-should-not-leak');
  });
});
