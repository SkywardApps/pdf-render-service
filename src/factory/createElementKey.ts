import { ElementDeclaration, ImageElementDeclaration, ListElementDeclaration, TextElementDeclaration } from '../wire/ElementDeclaration';


/**
 * Create a 'key' representing a description of an element and potentially any identifying details.
 * @param elementType The type of the element.
 * @param element Any provided configuration for the element.
 * @returns A string similar to 'view[comment=blah]'
 */
export function createElementKey(elementType: string, element: ElementDeclaration) {
  let currentItemKey = elementType;
  if (element.key) {
    currentItemKey += `[key=${element.key}]`;
  }
  else if (element.comment) {
    currentItemKey += `[comment=${element.comment.substring(0, 50)}]`;
  }
  else if (isTextDeclaration(element) && element.text) {
    currentItemKey += `[text=${element.text.substring(0, 50)}]`;
  }
  else if (isImageDeclaration(element) && element.src) {
    currentItemKey += `[src=${element.src.substring(0, 50)}]`;
  }
  else if (isListDeclaration(element) && element.basis) {
    currentItemKey += `[basis=${element.basis.substring(0, 50)}]`;
  }
  return currentItemKey;
}

function isTextDeclaration(element: any): element is TextElementDeclaration {
  return !!element.text;
}

function isImageDeclaration(element: any): element is ImageElementDeclaration {
  return !!element.src;
}

function isListDeclaration(element: any): element is ListElementDeclaration {
  return !!element.basis;
}
