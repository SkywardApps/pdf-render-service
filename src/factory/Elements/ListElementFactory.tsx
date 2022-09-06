import { ListElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import React from 'react';
import { ILogger } from '../../ILogger';

export const iteratedItemName = '$item';
export const iteratedIndexName = '$index';
export const iteratedParentName = '$parent';

/// Create a new list element based on the declaration
export const createListElement = (element: ListElementDeclaration, factory:IElementFactory, context:IElementContext, logger:ILogger): React.ReactElement | React.ReactElement[] => {
    const { header, loop, footer, basis } = element;
    // If a header was supplied, create it
    // Make sure it is fixed in place (unless explicitly set not to be)
    const headerElement = header ? factory.createElement(Object.assign({}, header, {fixed:true})) : <></>;
    // Do the same for the footer
    const footerElement = footer ? factory.createElement(Object.assign({}, footer, {fixed:true})) : <></>;
    // Determine what array we need to loop over
    const dataBasis = context.dereference(basis) as any[];
    logger.debug(`<List> dataBasis=${basis}`);

    // Map our dataBasis to all elements
    const innerElements2D = dataBasis.map((elementData, index) => {
        // push a new scope with the iterated item as part of it, plus some supporting values
        context.pushData({[iteratedIndexName]:index, [iteratedItemName]:elementData, [iteratedParentName]:context.scope[iteratedItemName]});
        // Create the inner item for this element, using the above scope
        let items = [];
        if (Array.isArray(loop)) {
            items = loop.map((loopChild) => factory.createElement(loopChild))
        } else {
            const item = factory.createElement(loop);
            items.push(item);
        }
        // Remove the scope
        context.popData();
        return items;
    }) as React.ReactElement[][];
    const innerElements = innerElements2D.reduce((total, cur) => {
        total.push(...cur);
        return total;
    }, [] as React.ReactElement[])
    return (
        <>
            {headerElement}
            {innerElements}
            {footerElement}
        </>
    );
  };