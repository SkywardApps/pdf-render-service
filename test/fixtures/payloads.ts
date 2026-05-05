import { PdfRequest } from '../../src/wire/PdfRequest';
import {
  AnyElementDeclaration,
  PageElementDeclaration,
} from '../../src/wire/ElementDeclaration';

export type PdfRequestLike = Partial<PdfRequest> & {
  pages: (PageElementDeclaration | Record<string, unknown>)[];
};

export function makeRequest(overrides: PdfRequestLike): PdfRequestLike {
  return overrides;
}

export function singleTextPage(text: string, extra: Partial<PageElementDeclaration> = {}): PdfRequestLike {
  return {
    title: 'test',
    pages: [
      {
        type: 'page',
        ...extra,
        children: [{ type: 'text', text }],
      } as PageElementDeclaration,
    ],
  };
}

export function pageWithChildren(
  children: AnyElementDeclaration[],
  extra: Partial<PageElementDeclaration> = {}
): PdfRequestLike {
  return {
    title: 'test',
    pages: [
      {
        type: 'page',
        ...extra,
        children,
      } as PageElementDeclaration,
    ],
  };
}

export function pagesWithChildren(
  pages: { children: AnyElementDeclaration[]; extra?: Partial<PageElementDeclaration> }[]
): PdfRequestLike {
  return {
    title: 'test',
    pages: pages.map(
      (p) =>
        ({
          type: 'page',
          ...p.extra,
          children: p.children,
        }) as PageElementDeclaration
    ),
  };
}
