import { PageElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { Page } from '@react-pdf/renderer';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import {
  PageSize,
  Orientation
} from '@react-pdf/types';

// Create a new page.  This must be at the top level, and are the only items allowed at the top level.
export const createPageElement = (element: PageElementDeclaration, factory:IElementFactory, context:IElementContext, logger:ILogger): React.ReactElement => {
    const { style, children, classes } = element;
    // Build the style to apply to the page.  Not all attributes make sense here (mainly, eg, margin)
    const finalStyle = context.buildFinalStyle(classes, style);

    const size = context.finalizeString(element.size ?? context.config.size ?? 'LETTER') as PageSize;
    const orientation = context.finalizeString(element.orientation ?? context.config.orientation ?? 'portrait') as Orientation;

    logger.debug('<Page> Creating new page.')
    return (
        <Page 
            key={v4()} 
            style={finalStyle} 
            size={size} 
            orientation={orientation} 
            debug={context.config.debug} >
        {
            children.map(child => factory.createElement(child))
        }
        </Page>
    );
};