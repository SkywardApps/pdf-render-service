import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { startServer, TestServer } from '../fixtures/server';
import { singleTextPage } from '../fixtures/payloads';
import { renderPdf } from '../fixtures/renderPdf';

// The service used to write every PDF to ${tmpdir()}/pdf-renderer/<uuid>.pdf
// and never delete it. Point os.tmpdir() at an empty directory for this file
// (vitest runs each file in its own process) and check nothing lands there.
const TMP_VARS = ['TMPDIR', 'TMP', 'TEMP'] as const;

describe('temporary files', () => {
  let server: TestServer;
  let scratch: string;
  const saved: Partial<Record<(typeof TMP_VARS)[number], string>> = {};

  beforeAll(async () => {
    scratch = mkdtempSync(path.join(tmpdir(), 'pdf-render-tmp-test-'));
    for (const name of TMP_VARS) {
      saved[name] = process.env[name];
      process.env[name] = scratch;
    }
    expect(tmpdir()).toBe(scratch);
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
    for (const name of TMP_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
    rmSync(scratch, { recursive: true, force: true });
  });

  it('leaves the temp directory empty after successful renders', async () => {
    for (let i = 0; i < 3; i++) {
      const result = await renderPdf(server, singleTextPage(`render ${i}`));
      expect(result.pdf.numPages).toBe(1);
    }
    expect(readdirSync(scratch, { recursive: true })).toEqual([]);
  });

  it('leaves the temp directory empty after a failed render', async () => {
    const res = await server.postJson({
      title: 't',
      pages: [{ type: 'page', children: [{ type: 'view', children: [{} as Record<string, unknown>] }] }],
    });
    expect(res.status).toBe(400);
    expect(readdirSync(scratch, { recursive: true })).toEqual([]);
  });
});
