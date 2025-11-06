export interface Style {
  //Flexbox

  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around',
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline',
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch',
  flex?: number,
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse',
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse',
  flexFlow?: number,
  flexGrow?: number,
  flexShrink?: number,
  flexBasis?: number,
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-around' | 'space-between' | 'space-evenly',
  order?: number,

  // Layout?:never,

  bottom?: number | string,
  display?: 'flex' | 'none',
  left?: number | string,
  position?: 'absolute' | 'relative',
  right?: number | string,
  top?: number | string,

  // Dimension?:never,

  height?: number | string,
  maxHeight?: number | string,
  maxWidth?: number | string,
  minHeight?: number | string,
  minWidth?: number | string,
  width?: number | string,

  // Color?:never,

  backgroundColor?: string,
  color?: string,
  opacity?: number,

  // Text?:never,

  fontSize?: number | string,
  fontFamily?: string,
  fontStyle?: string | 'normal',
  fontWeight?: number | 'thin' | 'hairline' | 'ultralight' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'demibold' | 'bold' | 'ultrabold' | 'extrabold' | 'heavy' | 'black',
  letterSpacing?: number | string,
  lineHeight?: number | string,
  maxLines?: number, //?
  textAlign?: 'left' | 'right' | 'center' | 'justify', //?
  textDecoration?: 'line-through' | 'underline' | 'none',
  textDecorationColor?: string,
  textDecorationStyle?: 'dashed' | 'dotted' | 'solid' | string, //?
  textIndent?: any, //?
  textOverflow?: any, //?
  textTransform?: 'capitalize' | 'lowercase' | 'uppercase',

  // Sizing/positioning?:never,

  objectFit?: string,
  objectPosition?: number | string,
  objectPositionX?: number | string,
  objectPositionY?: number | string,

  // Margin/padding?:never,

  margin?: number | string,
  marginHorizontal?: number | string,
  marginVertical?: number | string,
  marginTop?: number | string,
  marginRight?: number | string,
  marginBottom?: number | string,
  marginLeft?: number | string,
  padding?: number | string,
  paddingHorizontal?: number | string,
  paddingVertical?: number | string,
  paddingTop?: number | string,
  paddingRight?: number | string,
  paddingBottom?: number | string,
  paddingLeft?: number | string,

  // Transformations?:never,

  transform?: string,
  transformOrigin?: number | string,
  transformOriginX?: number | string,
  transformOriginY?: number | string,

  // Borders?:never,

  border?: number | string,
  borderWidth?: number,
  borderColor?: string,
  borderStyle?: 'dashed' | 'dotted' | 'solid',
  borderTop?: number | string,
  borderTopColor?: string,
  borderTopStyle?: 'dashed' | 'dotted' | 'solid', // ?
  borderTopWidth?: number | string,
  borderRight?: number | string,
  borderRightColor?: string,
  borderRightStyle?: 'dashed' | 'dotted' | 'solid', //?
  borderRightWidth?: number | string,
  borderBottom?: number | string,
  borderBottomColor?: string,
  borderBottomStyle?: 'dashed' | 'dotted' | 'solid', //?
  borderBottomWidth?: number | string,
  borderLeft?: number | string,
  borderLeftColor?: string,
  borderLeftStyle?: 'dashed' | 'dotted' | 'solid', //?
  borderLeftWidth?: number | string,
  borderTopLeftRadius?: number | string,
  borderTopRightRadius?: number | string,
  borderBottomRightRadius?: number | string,
  borderBottomLeftRadius?: number | string,
  borderRadius?: number | string
}

export type FontWeight =
| number
| 'thin'
| 'ultralight'
| 'light'
| 'normal'
| 'medium'
| 'semibold'
| 'bold'
| 'ultrabold'
| 'heavy';

export type Orientation = 'portrait' | 'landscape';

export type StandardPageSize =
  | '4A0'
  | '2A0'
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'A9'
  | 'A10'
  | 'B0'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'B4'
  | 'B5'
  | 'B6'
  | 'B7'
  | 'B8'
  | 'B9'
  | 'B10'
  | 'C0'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4'
  | 'C5'
  | 'C6'
  | 'C7'
  | 'C8'
  | 'C9'
  | 'C10'
  | 'RA0'
  | 'RA1'
  | 'RA2'
  | 'RA3'
  | 'RA4'
  | 'SRA0'
  | 'SRA1'
  | 'SRA2'
  | 'SRA3'
  | 'SRA4'
  | 'EXECUTIVE'
  | 'FOLIO'
  | 'LEGAL'
  | 'LETTER'
  | 'TABLOID'
  | 'ID1';

export type StaticSize = number | string;

// From PageProps
export type PageSize = string | [number, number] | { width: number; height: number };
  