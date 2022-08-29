import React from 'react';
import {  Document } from '@react-pdf/renderer';
import ReactPDF from '@react-pdf/renderer';
import { PdfRequest } from '../wire/PdfRequest';
import { ElementDeclaration, ElementTypes } from '../wire/ElementDeclaration';
import { staticElementRegistry } from './ElementRegistry';
import { IElementContext } from './IElementContext';
import { IElementFactory } from './IElementFactory';
import { VM } from 'vm2';
import { ILogger } from '../ILogger';

// The factory is responsible for processing json and generating React elements to represent it.
export class ElementFactory implements IElementContext, IElementFactory
{
  public readonly config:PdfRequest;

  public constructor(config: PdfRequest, private logger: ILogger)
  {
    // apply defaults
    this.config = Object.assign({
      debug : false,
      size : 'Legal',
      pages : [],
      data : {},
      styles : {},
      title : 'PDF Document'
    }, config);
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
  public generate = (): React.ReactElement => {
    this.logger.debug('Rendering document');
    const title = this.finalizeString(this.config.title);
    // The top level is always a document, and children should always be pages
    try{
      return (
        <Document title={title}>{
            this.config.pages.map(pageConfig =>
              this.createElement(pageConfig)
              )
            }
        </Document>
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
  public createElement = (element: ElementDeclaration): React.ReactElement | React.ReactElement[] => {
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
      elementType = this.inferElementType(element);
    }
    
    if(!staticElementRegistry.typeRegistry[elementType])
    {
      this.logger.error(`No factory found for element of type ${elementType}`);
      throw new Error(`No factory found for element of type ${elementType}`);
    }

    const rendered = staticElementRegistry.typeRegistry[elementType](element, this, this, this.logger);
    if(!rendered)
    {
      this.logger.error(`Attempted to render ${elementType} but got ${rendered}`, element);
      throw new Error(`Attempted to render ${elementType} but got ${rendered}`);
    }
    return rendered;
  };

  // Given a list of class names to apply and an element-level style declaration, derive the final style
  public buildFinalStyle = (classes: string[], style: ReactPDF.Style ) :  ReactPDF.Style => {
    const finalStyle = {};
    (classes || []).forEach(cls => Object.assign(finalStyle, this.config.styles[cls]));
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

  private inferElementType(element: ElementDeclaration) : ElementTypes {
    let elementType: ElementTypes | undefined = undefined;

    if ((element as any).text) {
      elementType = 'text';
    }

    if ((element as any).src) {
      if (!!elementType) {
        this.logger.error(`Inferred a node type of ${elementType} but also found a 'src' attribute`);
        throw new Error(`Inferred a node type of ${elementType} but also found a 'src' attribute`);
      }
      elementType = 'image';
    }

    if ((element as any).children) {
      if (!!elementType) {
        this.logger.error(`Inferred a node type of ${elementType} but also found a 'children' attribute`);
        throw new Error(`Inferred a node type of ${elementType} but also found a 'children' attribute`);
      }
      elementType = 'view';
    }

    if ((element as any).basis && (element as any).loop) {
      if (!!elementType) {
        this.logger.error(`Inferred a node type of ${elementType} but also found a 'basis' attribute`);
        throw new Error(`Inferred a node type of ${elementType} but also found a 'basis' attribute`);
      }
      elementType = 'list';
    }

    if ((element as any).basis && (element as any).loop) {
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




