import { TextElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import { View, Text } from '@react-pdf/renderer';
import { Style } from '@react-pdf/types';
import React from 'react';
import { ILogger } from '../../ILogger';
import { v4 } from 'uuid';
import { finalizeBoolean } from '../../helpers/FinalizeHelpers';

type StyleWithShadow = Style & {
    shadowColor?:string,
    shadowOpacity?:number,
    shadowTranslateX?:number,
    shadowTranslateY?:number,
    shadowTranslate?:number,
};

export const defaultShadowColor = '#000000';
export const defaultShadowOpacity = 0.5;
export const defaultShadowTranslate = 1;

// Create a shadow element, which is basically a text element but with a drop-shadow applied using special style properties
// Extra style properties supported:
//  * shadowColor (default black)
//  * shadowOpacity (default 0.5)
//  * shadowTranslate (default 1)
export const createShadowElement = (element: TextElementDeclaration, factory:IElementFactory, context:IElementContext, logger:ILogger): React.ReactElement => {
    const { style, text, classes, debug} = element;
    const finalStyle = context.buildFinalStyle(classes, style) as StyleWithShadow;
    const renderFunction = context.finalizeStringDeferred(text);
    logger.debug(`<Shadow> ${text}`);

    const mustBreak = finalizeBoolean(element.break, context);
    const canWrap = finalizeBoolean(element.wrap, context);
    const isFixed = finalizeBoolean(element.fixed, context);

    // What we do here is:
    // Create a wrapping view container that is positioned relatively
    // Add a text element as a child. This sizes the parent container, basically.
    // Add a second text element absolutely positioned, with the exact same content, so it is positioned at the same place as the text.  This is then translated
    //   slightly and make dark and transparent (per the 'shadow' properties)
    return (
        <View
            key={v4()}
            style={finalStyle}
            wrap={canWrap}
            fixed={isFixed}
            break={mustBreak}
            debug={context.config.debug || debug}
        >
            <Text
                fixed={isFixed}
                style={{
                    color:finalStyle?.shadowColor || defaultShadowColor,
                    opacity:finalStyle?.shadowOpacity || defaultShadowOpacity,
                    position:'absolute',
                    top:0,
                    left:0,
                    transform:`translateX(${finalStyle?.shadowTranslateX || finalStyle?.shadowTranslate || defaultShadowTranslate})`
                                +` translateY(${finalStyle?.shadowTranslateY || finalStyle?.shadowTranslate || defaultShadowTranslate})`
                }}
                render={({pageNumber, totalPages}) => {
                    return renderFunction({pageNumber, totalPages});
                }}
            />
            <Text
                fixed={isFixed}
                render={({pageNumber, totalPages}) => {
                    return renderFunction({pageNumber, totalPages});
                }}
            />
        </View>
    );
  };
