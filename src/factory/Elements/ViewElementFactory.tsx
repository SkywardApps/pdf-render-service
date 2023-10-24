import { ViewElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { View } from '@react-pdf/renderer';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import { finalizeBoolean } from '../../helpers/FinalizeHelpers';
import { createElementKey } from "../createElementKey";

// Create the basic view container, which can use css style flex layout to position its children
// tslint:disable-next-line: one-variable-per-declaration
export const createViewElement = async (element: ViewElementDeclaration, factory:IElementFactory, context:IElementContext, stack: string[], logger:ILogger): Promise<React.ReactElement> => {
  const { style, children, classes, debug } = element;
  const key = createElementKey('view', element);

  const mustBreak = finalizeBoolean(element.break, context);
  const canWrap = finalizeBoolean(element.wrap ?? 'true', context);
  const isFixed = finalizeBoolean(element.fixed, context);

  // Calculate the final style to apply considering any class names included
  const finalStyle = context.buildFinalStyle(classes ?? [], style ?? {});
  if(finalStyle.fontFamily && !context.fontIsRegistered(finalStyle.fontFamily))
  {
    await context.loadReferencedFonts(finalStyle.fontFamily)
  }

  logger.debug('<View>');

  const renderedChildren = [];
  for(let idx = 0; idx < children.length; ++ idx)
  {
    const child = children[idx];
    renderedChildren.push(await factory.createElement(child, [...stack, key+`.child[${idx}]`]));
  }

  return (
    <View key={v4()} style={finalStyle} wrap={canWrap} break={mustBreak} debug={context.config.debug || debug} fixed={isFixed}>
      {renderedChildren}
    </View>
  );
};