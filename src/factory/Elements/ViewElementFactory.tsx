import { ViewElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { View } from '@react-pdf/renderer';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import { finalizeBoolean } from '../../helpers/FinalizeHelpers';

// Create the basic view container, which can use css style flex layout to position its children
// tslint:disable-next-line: one-variable-per-declaration
export const createViewElement = (element: ViewElementDeclaration, factory:IElementFactory, context:IElementContext, logger:ILogger): React.ReactElement => {
  const { style, children, classes, debug } = element;

  const mustBreak = finalizeBoolean(element.break, context);
  const canWrap = finalizeBoolean(element.wrap, context);
  const isFixed = finalizeBoolean(element.fixed, context);

  // Calculate the final style to apply considering any class names included
  const finalStyle = context.buildFinalStyle(classes, style);

  logger.debug('<View>');
  return (
    <View key={v4()} style={finalStyle} wrap={canWrap} break={mustBreak} debug={context.config.debug || debug} fixed={isFixed}>
      {children.map(child => factory.createElement(child))}
    </View>
  );
};