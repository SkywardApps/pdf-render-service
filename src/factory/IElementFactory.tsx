import React from 'react';
import { ElementDeclaration } from '../wire/ElementDeclaration';

// This interface represents a factory that can create elements given a declaration for a specific type.
export interface IElementFactory {
  // Given a declaration of an element, determine its real type and generate a React equivalent
  createElement(element: ElementDeclaration): React.ReactElement | React.ReactElement[];
}
