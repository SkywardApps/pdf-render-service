import Ajv from 'ajv';
import { AnyValidateFunction } from 'ajv/dist/types';
import PdfRequestSchema from './resources/PdfRequest.json';
import { PdfRequest } from './wire/PdfRequest';

const ajv = new Ajv({
    allowUnionTypes: true,
    schemas: [PdfRequestSchema]
});

// Cast this as not undefined since we will throw if it is undefined
const validatePdfRequest = ajv.getSchema<PdfRequest>('PdfRequest') as AnyValidateFunction<PdfRequest>;

if (!validatePdfRequest) {
    throw new Error('Error creating the schema for PdfRequest');
}

export {validatePdfRequest};
