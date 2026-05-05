import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import nock from 'nock';
import { startServer, TestServer } from '../fixtures/server';
import { renderPdf } from '../fixtures/renderPdf';
import {
  disableNetwork,
  mockGoogleFontsDirectory,
  restoreNetwork,
} from '../fixtures/nockGoogleFonts';

describe('on-demand Google Fonts loading', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startServer();
    disableNetwork();
  });

  afterAll(async () => {
    restoreNetwork();
    await server.close();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // We use `link` here (and below) because LinkElementFactory awaits
  // `loadUnregisteredFonts`. PageElementFactory / ViewElementFactory /
  // TextElementFactory call it without `await`, which leaks the rejection
  // and crashes the worker before the response is observed.
  it('reports a clear error when GOOGLEAPIKEY is unset and the family is not bundled (link path awaits font load)', async () => {
    delete process.env.GOOGLEAPIKEY;
    mockGoogleFontsDirectory([]);
    const res = await server.postJson({
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            {
              type: 'link',
              href: '#',
              text: 'x',
              style: { fontFamily: 'NotABundledFamilyAtAll' },
            },
          ],
        },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.text()).toMatch(/font|google|api key/i);
  });

  it('registers a non-bundled family from the mocked Google Fonts directory and renders', async () => {
    process.env.GOOGLEAPIKEY = 'fake-key-for-tests';
    mockGoogleFontsDirectory([
      { family: 'TestSans', variants: ['regular', '700', 'italic'] },
    ]);

    const result = await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'link', href: '#', text: 'styled-link', style: { fontFamily: 'TestSans' } },
          ],
        },
      ],
    });
    expect(result.pdf.textPerPage[0]).toContain('styled-link');

    const fontsRes = await server.get('/fonts');
    const fonts = fontsRes.json() as Array<{ family: string }>;
    expect(fonts.map((f) => f.family)).toContain('TestSans');
  });

  it('does not refetch the directory for a family that is already registered', async () => {
    process.env.GOOGLEAPIKEY = 'fake-key-for-tests';
    const scope = mockGoogleFontsDirectory([
      { family: 'TestSans', variants: ['regular'] },
    ]);

    await renderPdf(server, {
      title: 't',
      pages: [
        {
          type: 'page',
          children: [
            { type: 'link', href: '#', text: 'cached', style: { fontFamily: 'TestSans' } },
          ],
        },
      ],
    });

    expect(scope.isDone()).toBe(false);
  });
});
