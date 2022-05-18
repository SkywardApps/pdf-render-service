import ReactPDF from '@react-pdf/renderer';
import { ElementDeclaration } from './ElementDeclaration';

// This defines the expected incoming request format
export interface PdfRequest {
  // The title is used both for the title meta-property in the pdf, and the returned file name
  title: string;
  // The paper size to use
  size: string;
  // Whether to draw debugging rects around all items
  debug: boolean;
  // A collection of named styles that can be referenced
  styles: {
    [key: string]: ReactPDF.Style;
  };
  // Any data model to bind to templates
  data: any;
  // The layout and construction of the pages themselves. May reference styles or data.
  pages: ElementDeclaration[];
}
