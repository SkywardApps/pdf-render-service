export type ElementTypes = 'view'|'image'|'text';

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
  style: any;
  classes: string[];
  debug:boolean;
}

export interface PageElementDeclaration extends StylableElementDeclaration
{
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
