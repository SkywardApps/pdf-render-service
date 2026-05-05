import { TestServer } from './server';
import { parsePdf, ParsedPdf } from './pdfReader';

export interface RenderResult {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  pdf: ParsedPdf;
}

export async function renderPdf(server: TestServer, payload: unknown): Promise<RenderResult> {
  const res = await server.postJson(payload);
  if (res.status !== 200) {
    throw new Error(
      `renderPdf: expected 200, got ${res.status}. Body: ${res.text()}`
    );
  }
  const pdf = await parsePdf(res.body);
  return {
    status: res.status,
    headers: res.headers,
    body: res.body,
    pdf,
  };
}
