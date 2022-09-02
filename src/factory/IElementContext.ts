import { PdfRequest } from '../wire/PdfRequest';
import { Style } from '@react-pdf/types';

export interface IElementContext
{
  readonly scope:any;
  readonly config: PdfRequest;

  // Add a new scope onto the stack
  pushData(localData:any):void;

  // Remove the top scope from the stack
  popData():void;

  // Given a list of class names to apply and an element-level style declaration, derive the final style
  buildFinalStyle(classes: string[], style: Style): Style;

  // Given a string that may have interpolation templates embedded, and any extra local variables to give access to,
  // substitute any templates and return the result
  finalizeString(text:string) : string;

  // Given a string that may have interpolation templates embedded, return a new lambda that will accept any extra
  //  local variables to give access to, and then substitute any templates and return the result.
  // This is used in places where the actual rendering of the text may be deferred, mainly for example in getting
  // access to the real page number
  finalizeStringDeferred(text:string) : (locals?:any) => string;

  // Dereference is used to interpret a plan js string.  Used mainly for the 'basis' property of a loop
  dereference(name: string) : any;
}
