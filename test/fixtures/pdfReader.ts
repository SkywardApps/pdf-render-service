import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface TextItem {
  str: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ParsedPdf {
  numPages: number;
  textPerPage: string[];
  itemsPerPage: TextItem[][];
  rawText: string;
  pageSizes: { width: number; height: number }[];
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  if (!buffer.subarray(0, 5).toString('utf8').startsWith('%PDF-')) {
    throw new Error(
      `parsePdf: buffer does not start with %PDF- (got "${buffer.subarray(0, 16).toString('utf8')}")`
    );
  }

  const data = new Uint8Array(buffer);
  const doc = await getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  const textPerPage: string[] = [];
  const itemsPerPage: TextItem[][] = [];
  const pageSizes: { width: number; height: number }[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes.push({ width: viewport.width, height: viewport.height });
    const content = await page.getTextContent();
    const pieces: string[] = [];
    const items: TextItem[] = [];
    for (const item of content.items) {
      if ('str' in item) {
        pieces.push(item.str);
        const transform = (item as { transform?: number[] }).transform ?? [0, 0, 0, 0, 0, 0];
        items.push({
          str: item.str,
          width: (item as { width?: number }).width ?? 0,
          height: (item as { height?: number }).height ?? 0,
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
        });
      }
    }
    textPerPage.push(pieces.join(' '));
    itemsPerPage.push(items);
  }

  await doc.destroy();

  return {
    numPages: doc.numPages,
    textPerPage,
    itemsPerPage,
    rawText: textPerPage.join('\n'),
    pageSizes,
  };
}

export function findItem(pdf: ParsedPdf, pageIdx: number, needle: string): TextItem | undefined {
  return pdf.itemsPerPage[pageIdx]?.find((it) => it.str.includes(needle));
}

export function expectTextOnPage(pdf: ParsedPdf, pageIdx: number, needle: string): void {
  const page = pdf.textPerPage[pageIdx];
  if (page === undefined) {
    throw new Error(
      `Expected text "${needle}" on page index ${pageIdx} but document only has ${pdf.numPages} pages`
    );
  }
  if (!page.includes(needle)) {
    throw new Error(
      `Expected text "${needle}" on page ${pageIdx + 1} but extracted text was: "${page}"`
    );
  }
}

export function expectTextOnEveryPage(pdf: ParsedPdf, needle: string): void {
  for (let i = 0; i < pdf.numPages; i++) {
    if (!pdf.textPerPage[i].includes(needle)) {
      throw new Error(
        `Expected text "${needle}" on every page; missing on page ${i + 1}. Extracted: "${pdf.textPerPage[i]}"`
      );
    }
  }
}
