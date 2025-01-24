import Ajv from 'ajv';
import { AnyValidateFunction } from 'ajv/dist/types';
import PdfRequestSchema from './resources/PdfRequest.json';
import { PdfRequest } from './wire/PdfRequest';
import { VM } from 'vm2';
import { ElementDeclaration, AnyElementDeclaration, ImageElementDeclaration, TextElementDeclaration, ListElementDeclaration, PageElementDeclaration } from './wire/ElementDeclaration';
import axios from 'axios';
import { loadReferencedFonts, fontIsRegistered } from './fontManagement';
import { ILogger } from './ILogger';

const ajv = new Ajv({
    allowUnionTypes: true,
    schemas: [PdfRequestSchema]
});

// Cast this as not undefined since we will throw if it is undefined
const validatePdfRequest = ajv.getSchema<PdfRequest>('PdfRequest') as AnyValidateFunction<PdfRequest>;

if (!validatePdfRequest) {
    throw new Error('Error creating the schema for PdfRequest');
}

interface ValidationError {
    path: string[];
    message: string;
    severity: 'error' | 'warning';
}

interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

async function validatePdfRequestEnhanced(request: PdfRequest, logger: ILogger): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // First run the schema validation
    if (!validatePdfRequest(request)) {
        return {
            isValid: false,
            errors: (validatePdfRequest.errors || []).map(err => ({
                path: err.instancePath.split('/').filter(p => p),
                message: err.message || 'Unknown validation error',
                severity: 'error'
            }))
        };
    }

    // Validate all elements recursively
    for (let i = 0; i < request.pages.length; i++) {
        await validateElement(request.pages[i] as AnyElementDeclaration, ['pages', i.toString()], request, errors, logger);
    }

    // Validate style definitions
    if (request.styles) {
        for (const [styleName, style] of Object.entries(request.styles)) {
            validateStyle(style, ['styles', styleName], errors);
        }
    }

    return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        errors
    };
}

async function validateElement(
    element: AnyElementDeclaration, 
    path: string[], 
    request: PdfRequest,
    errors: ValidationError[],
    logger: ILogger
): Promise<void> {
    // Validate common properties
    if (element.condition) {
        validateTemplateExpression(element.condition, [...path, 'condition'], request.data, errors);
    }

    // Validate style if present
    if ('style' in element && element.style) {
        validateStyle(element.style, [...path, 'style'], errors);
    }

    // Validate classes exist
    if ('classes' in element && element.classes) {
        for (const className of element.classes) {
            if (!request.styles?.[className]) {
                errors.push({
                    path: [...path, 'classes'],
                    message: `Referenced class "${className}" is not defined in styles`,
                    severity: 'error'
                });
            }
        }
    }

    // Type-specific validation
    switch (element.type) {
        case 'image':
            await validateImageElement(element as ImageElementDeclaration, path, errors);
            break;
        case 'text':
            await validateTextElement(element as TextElementDeclaration, path, request, errors, logger);
            break;
        case 'list':
            validateListElement(element as ListElementDeclaration, path, request, errors);
            break
    }

    // Recursively validate children
    if ('children' in element && element.children) {
        for (let i = 0; i < element.children.length; i++) {
            await validateElement(
                element.children[i] as AnyElementDeclaration,
                [...path, 'children', i.toString()],
                request,
                errors,
                logger
            );
        }
    }
}

async function validateImageElement(
    element: ImageElementDeclaration,
    path: string[],
    errors: ValidationError[]
): Promise<void> {
    const src = element.src;
    
    // Validate URL format
    try {
        if (src.startsWith('data:')) {
            // Validate data URI format
            if (!src.match(/^data:image\/(jpeg|png|gif|webp);base64,/)) {
                errors.push({
                    path: [...path, 'src'],
                    message: 'Invalid data URI format for image. Must be a base64 encoded image with proper mime type.',
                    severity: 'error'
                });
            }
        } else {
            // Validate URL format
            new URL(src);
            
            // Optionally verify image exists
            try {
                await axios.head(src);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                errors.push({
                    path: [...path, 'src'],
                    message: `Image URL appears to be inaccessible: ${message}`,
                    severity: 'warning'
                });
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({
            path: [...path, 'src'],
            message: `Invalid image source URL: ${message}`,
            severity: 'error'
        });
    }
}

async function validateTextElement(
    element: TextElementDeclaration,
    path: string[],
    request: PdfRequest,
    errors: ValidationError[],
    logger: ILogger
): Promise<void> {
    // Validate text templates
    if (element.text) {
        validateTemplateExpression(element.text, [...path, 'text'], request.data, errors);
    }

    // Validate font usage if specified in style
    if (element.style?.fontFamily) {
        const fontFamily = element.style.fontFamily.toString();
        try {
            if (!fontIsRegistered(fontFamily)) {
                await loadReferencedFonts([fontFamily], request.googleApiKey || '', logger);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push({
                path: [...path, 'style', 'fontFamily'],
                message: `Invalid or inaccessible font family: ${message}`,
                severity: 'error'
            });
        }
    }
}

function validateListElement(
    element: ListElementDeclaration,
    path: string[],
    request: PdfRequest,
    errors: ValidationError[]
): void {
    // Validate basis expression
    try {
        const vm = new VM({
            timeout: 150,
            eval: false,
            wasm: false,
            sandbox: { data: request.data }
        });
        
        const result = vm.run(element.basis);
        if (!Array.isArray(result)) {
            errors.push({
                path: [...path, 'basis'],
                message: `List basis must evaluate to an array, got ${typeof result}`,
                severity: 'error'
            });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({
            path: [...path, 'basis'],
            message: `Error evaluating list basis: ${message}`,
            severity: 'error'
        });
    }
}

function validateStyle(
    style: Record<string, any>,
    path: string[],
    errors: ValidationError[]
): void {
    // Validate color formats
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'textDecorationColor'];
    for (const prop of colorProps) {
        if (prop in style) {
            const color = style[prop]?.toString();
            if (!isValidColor(color)) {
                errors.push({
                    path: [...path, prop],
                    message: `Invalid color format: ${color}. Must be a valid CSS color.`,
                    severity: 'error'
                });
            }
        }
    }

    // Validate numeric values with units
    const numericProps = ['fontSize', 'lineHeight', 'width', 'height', 'margin', 'padding'];
    for (const prop of numericProps) {
        if (prop in style) {
            const value = style[prop]?.toString();
            if (!isValidNumericValue(value)) {
                errors.push({
                    path: [...path, prop],
                    message: `Invalid numeric value: ${value}. Must be a number or a valid CSS unit value.`,
                    severity: 'error'
                });
            }
        }
    }
}

function validateTemplateExpression(
    expr: string,
    path: string[],
    data: any,
    errors: ValidationError[]
): void {
    try {
        const vm = new VM({
            timeout: 150,
            eval: false,
            wasm: false,
            sandbox: { data }
        });
        
        vm.run(`\`${expr}\``);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({
            path,
            message: `Invalid template expression "${expr}": ${message}`,
            severity: 'error'
        });
    }
}

function isValidColor(color: string): boolean {
    // Basic color name
    if (/^[a-zA-Z]+$/.test(color)) return true;
    // Hex color
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) return true;
    // RGB/RGBA
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/.test(color)) return true;
    // HSL/HSLA
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/.test(color)) return true;
    return false;
}

function isValidNumericValue(value: string): boolean {
    // Pure number
    if (/^\d+$/.test(value)) return true;
    // Number with valid CSS unit
    if (/^\d+(\.\d+)?(px|em|rem|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)$/.test(value)) return true;
    return false;
}

export { validatePdfRequest, validatePdfRequestEnhanced, ValidationError, ValidationResult, validateElement, validateImageElement, validateTextElement, validateListElement, validateStyle, validateTemplateExpression, isValidColor, isValidNumericValue };
