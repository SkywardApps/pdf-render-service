import { TextElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { Text } from '@react-pdf/renderer';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import { finalizeBoolean } from '../../helpers/FinalizeHelpers';
import { createElementKey } from "../createElementKey";

// Create a simple text element
export const createTextElement = async (element: TextElementDeclaration, factory:IElementFactory, context:IElementContext, stack: string[], logger:ILogger): Promise<React.ReactElement> => {
  const { style, text, classes, debug, children} = element;
  const key = createElementKey('text', element);
  
  // Calculate the final style to apply considering any class names included
  const finalStyle = context.buildFinalStyle(classes ?? [], style ?? {});
  const mustBreak = finalizeBoolean(element.break, context);
  const canWrap = finalizeBoolean(element.wrap ?? 'true', context);
  const isFixed = finalizeBoolean(element.fixed, context);

  // We create a render function, rather than just a simple string, so that we can account for
  // dynamic functionality, such as including page numbers.
  const renderFunction = context.finalizeStringDeferred(text ?? "");
  logger.debug(`<Text> ${text}`);
  if(children?.length && text?.length)
  {
    logger.error('Text element provided with both a text property and a children property. Text will be discarded.');
  }

  if(finalStyle.fontFamily && !context.fontIsRegistered(finalStyle.fontFamily))
  {
    await context.loadReferencedFonts(finalStyle.fontFamily)
  }

  if(children?.length)
  {
    const renderedChildren = [];
    for(let idx = 0; idx < children.length; ++ idx)
    {
      const child = children[idx];
      renderedChildren.push(await factory.createElement(child, [...stack, key+`.child[${idx}]`]));
    }

    return <Text
      key={v4()}
      style={finalStyle}
      wrap={canWrap}
      debug={context.config.debug || debug}
      fixed={isFixed}
      break={mustBreak}
    >
      {renderedChildren}
    </Text>;
  }

  const preRendered = context.shouldPrerender() ? renderFunction({pageNumber:100, totalPages:100}) : undefined;
  return (
    <Text
      key={v4()}
      style={finalStyle}
      wrap={canWrap}
      debug={context.config.debug || debug}
      fixed={isFixed}
      break={mustBreak}
      render={({pageNumber, totalPages}) => {
        return renderFunction({pageNumber, totalPages}) || '';
      }}
    >
      {preRendered}
    </Text>
  );
};



