import {
  Style,
  StandardPageSize,
  Orientation,
} from '@react-pdf/types';

export type ElementTypes = 'view'|'image'|'text'|'list'|'shadow'|'page';

export interface ElementDeclaration {
  type: ElementTypes;
  fixed: boolean;
  break:boolean;
  condition?:string | undefined;
}


export interface ListElementDeclaration extends ElementDeclaration
{
  header:ElementDeclaration;
  footer:ElementDeclaration;
  basis:string;
  loop:ElementDeclaration;
}

export interface StylableElementDeclaration extends ElementDeclaration {
  style: Style;
  classes: string[];
  debug:boolean;
}

export interface PageElementDeclaration extends StylableElementDeclaration
{
  // The paper size to use
  size: StandardPageSize | undefined;
  // Determines page orientation. Valid values are "portrait" or "landscape".
  orientation: Orientation | undefined;
  // Child elements to lay out on the page
  children: ElementDeclaration[];
}

export interface ViewElementDeclaration extends StylableElementDeclaration
{
  wrap:boolean;
  children: ElementDeclaration[];
}

export interface TextElementDeclaration extends StylableElementDeclaration
{
  wrap:boolean;
  text:string;
  children: TextElementDeclaration[] | undefined;
}

export interface ImageElementDeclaration extends StylableElementDeclaration
{
  src:string;
  cache:boolean;
}
