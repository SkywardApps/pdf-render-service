import {
  Style,
  StandardPageSize,
  Orientation,
} from '@react-pdf/types';
import { PageElementDeclaration, StyleWithEvaluation } from './ElementDeclaration';

// This defines the expected incoming request format
export interface PdfRequest {
  // The title is used both for the title meta-property in the pdf, and the returned file name
  title: string | undefined;
  
  // The paper size to use
  size: StandardPageSize | undefined;

  // Determines page orientation. Valid values are "portrait" or "landscape".
  orientation: Orientation | undefined;

  // Whether to draw debugging rects around all items
  debug: boolean | undefined;

  // A collection of named styles that can be referenced
  styles: {
    [key: string]: StyleWithEvaluation;
  } | undefined;

  // Any data model to bind to templates
  data: any | undefined;

  // The layout and construction of the pages themselves. May reference styles or data.
  pages: PageElementDeclaration[];

  // Allow the request to opt-in to strict type-checking.
  strict?: boolean;
}
