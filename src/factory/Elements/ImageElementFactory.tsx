import { ImageElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { Image } from '@react-pdf/renderer';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import { finalizeBoolean } from '../../helpers/FinalizeHelpers';

/// Create a brand new image element from the declaration passed in.
export const createImageElement = async (element: ImageElementDeclaration, factory:IElementFactory, context:IElementContext, stack: string[], logger:ILogger): Promise<React.ReactElement> => {
    const { style, src, classes, debug } = element;
    // Construct the style to apply
    const finalStyle = context.buildFinalStyle(classes ?? [], style ?? {});
    // Interpret what the src is
    const finalSrc = context.finalizeString(src);
    
    logger.debug(`<Image> src ${src} => {finalSrc}`);

    const isFixed = finalizeBoolean(element.fixed, context);
    const mustBreak = finalizeBoolean(element.break, context);
    const canCache = finalizeBoolean(element.cache??"true", context);

    return <Image key={v4()} src={finalSrc} style={finalStyle} debug={context.config.debug || debug} break={mustBreak} fixed={isFixed} cache={canCache}/>;
  };

