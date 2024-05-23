import React from 'react';
import {  Document } from '@react-pdf/renderer';
import { PdfRequest } from '../wire/PdfRequest';
import { ElementDeclaration, ElementTypes, StyleWithEvaluation } from '../wire/ElementDeclaration';
import { staticElementRegistry } from './ElementRegistry';
import { IElementContext } from './IElementContext';
import { IElementFactory } from './IElementFactory';
import { VM } from 'vm2';
import { ILogger } from '../ILogger';
import { Style } from '@react-pdf/types';
import { fontIsRegistered, loadReferencedFonts } from '../fontManagement';
import { createElementKey } from './createElementKey';

// The factory is responsible for processing json and generating React elements to represent it.
export class ElementFactory implements IElementContext, IElementFactory
{
  public readonly config:PdfRequest;

  public constructor(config: PdfRequest, private logger: ILogger, private googleApiKey: string)
  {
    // apply defaults
    this.config = Object.assign({
      debug : false,
      size : 'Legal',
      pages : [],
      data : {},
      styles : {},
      title : 'PDF Document',
      prerender: false,
    }, config);
  }
  
  shouldPrerender(): unknown {
    return this.config.prerender ?? false;
  }

  async loadReferencedFonts(fontFamily: string): Promise<void> 
  {
    await loadReferencedFonts([fontFamily], this.googleApiKey, this.logger);
  }
  
  fontIsRegistered(fontFamily: string): boolean 
  {
    return fontIsRegistered(fontFamily);
  }

  // Because we have some basic logic constructs, we push extra local variables onto
  // a stack for inline templating to access
  private localDataStacks:any[] = [];

  // Add a new scope onto the stack
  pushData(localData: any): void
  {
    this.localDataStacks.push(localData);
  }

  // Remove the top scope from the stack
  popData(): void
  {
    this.localDataStacks.pop();
  }

  // Get the current scope
  get scope():any
  {
    // if there isn't a local scope, just copy the global one
    if(this.localDataStacks.length === 0)
      return {...this.config};

    // otherwise merge them, overwriting the global scope with local data
    return {...this.localDataStacks[this.localDataStacks.length-1], ...this.config};
  }

  // Convert the data provided into React Elements
  public generate = async (): Promise<React.ReactElement> => {
    this.logger.debug('Rendering document');
    const title = this.finalizeString(this.config.title ?? 'document');
    // The top level is always a document, and children should always be pages
    const pages: (React.ReactElement | React.ReactElement[])[] = [];
    for(let pageIndex = 0; pageIndex < this.config.pages.length; pageIndex++)
    {
      const pageConfig = this.config.pages[pageIndex];
      pages.push(await this.createElement(pageConfig, [`document[${pageIndex}]`]));
    }

    try{
      return (
        <Document title={title}>{pages}</Document>
      );
    }
    catch(err)
    {
      this.logger.error('Error thrown from render function', err);
      throw err;
    }
  };

  // A private utility method that lets you take an input object, and generate a copy by running
  // a transformation lambda on it
  private objectMap = (obj:{[key:string]:any}, transform:(key:string, value:any)=>any) => Object.assign({}, ...Object.entries(obj).map(([k, v]) => ({[k]: transform(k, v)})));


  // Given a declaration of an element, determine its real type and generate a React equivalent
  public createElement = async (element: ElementDeclaration, stack: string[]): Promise<React.ReactElement | React.ReactElement[]> => {
    this.logger.debug(`Creating ${element.type}`)

    // If this has a condition, validate it
    if(element.condition)
    {
      const result = this.dereference(element.condition);
      this.logger.debug(`<IFF> condition=${element.condition} -> ${result}`);
      // If there is a condition and it has NOT been met, don't render this item or its children
      if(!result)
      {
        return <></>;
      }
    }

    let elementType = element.type;
    if(!elementType)
    {
      // Add some shortcuts
      if(stack.length === 1)
      {
        elementType = 'page';
      }
      else
      {
        elementType = this.inferElementType(element);
      }
    }
    
    try
    {
      if(!staticElementRegistry.typeRegistry[elementType])
      {
        this.logger.error(`No factory found for element of type ${elementType}`);
        throw new Error(`No factory found for element of type ${elementType}`);
      }

      const rendered = await staticElementRegistry.typeRegistry[elementType](element, this, this, stack, this.logger);
      if(!rendered)
      {
        this.logger.error(`Attempted to render ${elementType} but got ${rendered}`, element);
        throw new Error(`Attempted to render ${elementType} but got ${rendered}`);
      }
      return rendered;
    }
    catch(err)
    {
      console.error('Recaught an error in createElement');
      // IF there isn't already a render stack attached, attach it.
      const anyError = err as any;
      if(!anyError.renderStack)
      {
        let currentItemKey = createElementKey(elementType, element);
        anyError.renderStack = [...stack, currentItemKey];
      }
      throw err;
    }
  };

  // Given a list of class names to apply and an element-level style declaration, derive the final style
  public buildFinalStyle = (classes: string[], style: StyleWithEvaluation ) :  Style => {
    const finalStyle = {};
    (classes || []).forEach(cls => Object.assign(finalStyle, this.config.styles?.[cls]));
    const convertedStyle = this.objectMap(style || {},
       (key, value) => typeof value === 'string' ? this.finalizeString(value, {appliedStyle:finalStyle, style}) : value);
    Object.assign(finalStyle, convertedStyle);
    return finalStyle;
  };

  // Given a string that may have interpolation templates embedded, and any extra local variables to give access to,
  // substitute any templates and return the result
  public finalizeString = (text:string, locals?:any) : string => {
    return this.finalizeStringDeferred(text)(locals);
  }

  // Given a string that may have interpolation templates embedded, return a new lambda that will accept any extra
  //  local variables to give access to, and then substitute any templates and return the result.
  // This is used in places where the actual rendering of the text may be deferred, mainly for example in getting
  // access to the real page number
  public finalizeStringDeferred = (text:string) : (locals?:any) => string => {
    const scope = {...this.localDataStacks[this.localDataStacks.length-1], ...this.config};
    return (locals?:any) => {
      let localText = text;
      // If there's nothing to substitue, bail out early
      if(!localText.match(/{{(\$?.+?)}}/))
      {
        return text;
      }

      locals = locals || {};
      const sandbox = {...locals, ...scope};

        // first, do any simple replacements
      localText = localText
        .replace(/{{([a-zA-Z_$][a-zA-Z0-9_.]+)}}/g, (subStr, script) => {
          return this.simpleDereference(script, sandbox);
        });

      // If there's nothing to substitue, bail out early
      if(!localText.match(/{{(\$?.+?)}}/))
      {
        return localText;
      }

      // Do the more intensive matching
      const vm = new VM({
        timeout:150,
        eval:false,
        wasm:false,
        sandbox
      });

      return localText
        .replace(/{{(\$?.+?)}}/g, (subStr, script) => {
          try
          {
            const result = vm.run(script);
            return result;
          }
          catch(err)
          {
            this.logger.error(`Error interpreting script "${script}"`, err);
            return String(err);
          }
        })
      };
  }

  public simpleDereference = (name: string, sandbox:any) => {
    // split any dot-notation into parts
    const parts = name.split('.');

    // We start pointing to the top-level data object
    let cursor = sandbox;

    // dereference down our '.' chain
    for (const key of parts) {
      cursor = cursor[key];
    }
    return cursor;
  };

  // Dereference is used to interpret a plan js string.  Used mainly for the 'basis' property of a loop
  public dereference = (name: string) => {
    const scope = {...this.localDataStacks[this.localDataStacks.length-1], ...this.config};
    const vm = new VM({
      timeout:150,
      eval:false,
      wasm:false,
      sandbox:scope
    });
    return vm.run(name);
  };

  /**
   * Attempt to infer what element type a node is by the presence of certain properties.
   * @param element The element to infer the type for.
   * @returns A strictly determined element type, or a thrown exception.
   */
  private inferElementType(element: ElementDeclaration) : ElementTypes {
    let elementType: ElementTypes | undefined = undefined;

    if ((element as any).text !== undefined) {
      elementType = 'text';
    }

    if ((element as any).src !== undefined) {
      if (!!elementType) {
        this.logger.error(`Inferred a node type of ${elementType} but also found a 'src' attribute`);
        throw new Error(`Inferred a node type of ${elementType} but also found a 'src' attribute`);
      }
      elementType = 'image';
    }

    if ((element as any).children !== undefined) {
      if (!!elementType) {
        this.logger.error(`Inferred a node type of ${elementType} but also found a 'children' attribute`);
        throw new Error(`Inferred a node type of ${elementType} but also found a 'children' attribute`);
      }
      elementType = 'view';
    }

    if ((element as any).basis && (element as any).loop !== undefined) {
      if (!!elementType) {
        this.logger.error(`Inferred a node type of ${elementType} but also found a 'basis' attribute`);
        throw new Error(`Inferred a node type of ${elementType} but also found a 'basis' attribute`);
      }
      elementType = 'list';
    }

    if (!elementType) {
      this.logger.error(`No node type could be inferred`);
      throw new Error(`No node type could be inferred`);
    }
    
    return elementType;
  }
}


