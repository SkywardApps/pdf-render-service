import { IElementContext } from '../factory/IElementContext';

export const finalizeBoolean = (initialValue:any, context:IElementContext) : boolean =>
{
  if(typeof initialValue === 'string')
  {
    return context.finalizeString('' + initialValue) === 'true';
  }
  return initialValue;
}