import { ListElementDeclaration } from '../../wire/ElementDeclaration';
import { IElementFactory } from '../IElementFactory';
import { IElementContext } from '../IElementContext';
import React from 'react';
import { ILogger } from '../../ILogger';
import { createElementKey } from "../createElementKey";

export const iteratedItemName = '$item';
export const iteratedIndexName = '$index';
export const iteratedParentName = '$parent';

/// Create a new list element based on the declaration
export const createListElement = async (element: ListElementDeclaration, factory:IElementFactory, context:IElementContext, stack: string[], logger:ILogger): Promise<React.ReactElement | React.ReactElement[]> => {
    const { header, loop, footer, basis } = element;
    const key = createElementKey('list', element);
    // If a header was supplied, create it
    // Make sure it is fixed in place (unless explicitly set not to be)
    const headerElement = header ? await factory.createElement(Object.assign({}, header, {fixed:true}), [...stack,  key+'.header']) : <></>;
    // Do the same for the footer
    const footerElement = footer ? await factory.createElement(Object.assign({}, footer, {fixed:true}), [...stack, key+'.footer']) : <></>;
    // Determine what array we need to loop over
    const dataBasis = context.dereference(basis) as any[];
    logger.debug(`<List> dataBasis=${basis}`);

    // Map our dataBasis to all elements
    const innerElements2D:  React.ReactElement[][] = [];
    
    for(let index = 0; index < dataBasis.length; ++index){
        const elementData = dataBasis[index];
        
        // push a new scope with the iterated item as part of it, plus some supporting values
        context.pushData({[iteratedIndexName]:index, [iteratedItemName]:elementData, [iteratedParentName]:context.scope[iteratedItemName]});
        // Create the inner item for this element, using the above scope
        let items = [];
        if (Array.isArray(loop)) {
            for(let idx = 0; idx < loop.length; ++idx)
            {
                const loopChild = loop[idx];
                items.push(await factory.createElement(loopChild, [...stack, key+`.loop[${idx}]`]));
            }
        } else {
            const item = await factory.createElement(loop, [...stack, key+'.loop']);
            items.push(item);
        }
        // Remove the scope
        context.popData();
        innerElements2D.push(items as React.ReactElement[]);
    };
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