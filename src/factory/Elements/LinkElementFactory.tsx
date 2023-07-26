import { LinkElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { Link, Text } from '@react-pdf/renderer';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import { finalizeBoolean } from '../../helpers/FinalizeHelpers';
import { createElementKey } from '../createElementKey';

// Create a link element


export const createLinkElement = async (element: LinkElementDeclaration, factory: IElementFactory, context: IElementContext, stack: string[], logger: ILogger): Promise<React.ReactElement> => {
  const { style, text, classes, debug, href, children } = element;

  // Calculate the final style to apply considering any class names included
  const finalStyle = context.buildFinalStyle(classes ?? [], style ?? {});
  const mustBreak = finalizeBoolean(element.break, context);
  const canWrap = finalizeBoolean(element.wrap, context);
  const isFixed = finalizeBoolean(element.fixed, context);
  const finalText = context.finalizeString(text ?? "");
  const finalHref = context.finalizeString(href ?? "");

  // We create a render function, rather than just a simple string, so that we can account for
  // dynamic functionality, such as including page numbers.
  logger.debug(`<Link> ${href} ${text}`);
  if(children?.length && text?.length)
  {
    logger.error('Text element provided with both a text property and a children property. Text will be discarded.');
  }

  if (finalStyle.fontFamily && !context.fontIsRegistered(finalStyle.fontFamily)) {
    await context.loadReferencedFonts(finalStyle.fontFamily);
  }

  const key = createElementKey('link', element);
  const renderedChildren = text?.length ? [<Text>{finalText}</Text>] : await Promise.all(children!.map(async (child, idx) => {
    return await factory.createElement(child, [...stack, key+`.child[${idx}]`]);
  }));

  return (
    <Link
      key={v4()}
      style={finalStyle}
      wrap={canWrap}
      debug={context.config.debug || debug}
      fixed={isFixed}
      break={mustBreak}
      src={finalHref}
    >{renderedChildren}</Link>
  );
};
