import {
  Style,
  StandardPageSize,
  Orientation,
} from '@react-pdf/types';

export type ElementTypes = 'view'|'image'|'text'|'list'|'shadow'|'page';

export type StyleWithShadow = Style & {
  shadowColor?:string,
  shadowOpacity?:number,
  shadowTranslateX?:number,
  shadowTranslateY?:number,
  shadowTranslate?:number,
};

export type StyleWithEvaluation = {
  [Property in keyof Style]: Style[Property] | string;
};

export interface ElementDeclaration {
  type?: ElementTypes;
  fixed?: boolean;
  break?:boolean;
  condition?:string | undefined;
  key?:string;
  comment?:string;
}


export interface ListElementDeclaration extends ElementDeclaration
{
  type?: 'list';
  header?:AnyElementDeclaration;
  footer?:AnyElementDeclaration;
  basis:string;
  loop: AnyElementDeclaration | AnyElementDeclaration[];
}

export interface StylableElementDeclaration extends ElementDeclaration {
  style?: StyleWithEvaluation;
  classes?: string[];
  debug?:boolean;
}

export interface PageElementDeclaration extends StylableElementDeclaration
{
  type?: 'page';
  // The paper size to use
  size?: StandardPageSize | undefined;
  // Determines page orientation. Valid values are "portrait" or "landscape".
  orientation?: Orientation | undefined;
  // Child elements to lay out on the page
  children: AnyElementDeclaration[];
}

export interface ViewElementDeclaration extends StylableElementDeclaration
{
  type?: 'view';
  wrap?:boolean;
  children: AnyElementDeclaration[];
}

export interface ShadowElementDeclaration extends StylableElementDeclaration
{
  type?: 'shadow';
  wrap?:boolean;
  text?:string;
  style?:StyleWithShadow;
}

export interface TextElementDeclaration extends StylableElementDeclaration
{
  type?: 'text';
  wrap?:boolean;
  text?:string;
  children?: TextElementDeclaration[] | undefined;
}

export interface ImageElementDeclaration extends StylableElementDeclaration
{
  type?: 'image';
  src:string;
  cache?:boolean;
}

export type AnyElementDeclaration = ImageElementDeclaration | TextElementDeclaration | ShadowElementDeclaration | ViewElementDeclaration | ListElementDeclaration;