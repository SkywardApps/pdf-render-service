import { IElementFactory } from './IElementFactory';
import { IElementContext } from './IElementContext';
import { createImageElement } from './Elements/ImageElementFactory';
import { createTextElement } from './Elements/TextElementFactory';
import { createViewElement } from './Elements/ViewElementFactory';
import { createListElement } from './Elements/ListElementFactory';
import { createPageElement } from './Elements/PageElementFactory';
import { createShadowElement } from './Elements/ShadowElementFactory';
import { ILogger } from '../ILogger';

// Define the function signature that we use to create elements
export type ElementFactoryFunction = (e: any, factory:IElementFactory, context:IElementContext, stack: string[], logger:ILogger) => Promise<React.ReactElement | React.ReactElement[]>;
type ElementTypeRegistry = {
    [key:string]: ElementFactoryFunction;
};

// One static registry to rule them all.
// Future development may result in some kind of scoping for this registry, but for now we just have the singleton
class ElementRegistry
{
    // Record the existance of an element type and the function we can use to generate it
    public register(typename:string, factory:ElementFactoryFunction)
    {
        this.typeRegistry[typename] = factory;
    }

    // Instantiate a specific element
    public create(typename:string, e:any, factory:IElementFactory, context:IElementContext, stack: string[], logger:ILogger) {
        this.typeRegistry[typename](e, factory, context, stack, logger);
    }

    public readonly typeRegistry: ElementTypeRegistry = {};
}

// Here we explicitly register all elements we want to be available.
export const staticElementRegistry: ElementRegistry = new ElementRegistry();
staticElementRegistry.register('image', createImageElement);
staticElementRegistry.register('text', createTextElement);
staticElementRegistry.register('view', createViewElement);
staticElementRegistry.register('list', createListElement);
staticElementRegistry.register('shadow', createShadowElement);
staticElementRegistry.register('page', createPageElement);

