import { IncomingMessage, ServerResponse } from 'http';
import { renderToBuffer } from '@react-pdf/renderer';
import { PdfRequest } from './wire/PdfRequest';
import { ElementFactory } from './factory/ElementFactory';
import { ILogger } from './ILogger';
import { validatePdfRequest } from './validatePdfRequest';

/// This represents the handling of incoming PDF creation requests
export class PdfController
{
    private body = '';

    public constructor(private request: IncomingMessage, private res: ServerResponse, private logger:ILogger, private config: {
        ValidateApiPayloads: boolean; 
        GoogleApiKey: string 
    }) { }

    // Handle the streaming in of a POST body
    public readonly onData: (chunk: any) => void = (data) => {
        this.body += data;
        // If the data is greater than 30MB, don't accept it
        // I'll be impressed if we get 30MB requests, but it could
        // happen since we allow inline images via the data-uri method
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (this.body.length > 30 * 1e6) {
            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
            this.logger.error('Terminated excessively large post');
            this.request.connection.destroy();
        }
    };

    // What to do once the data has completed being read
    public readonly onEnd = async () => {
        try{
            this.logger.info(`${Date.now().toString()} Completed receiving request POST ${this.request.url}` );
            // The incoming data is expected to be a standard json request
            let start = Date.now();
            const postBody = JSON.parse(this.body) as PdfRequest;
            let end = Date.now();
            this.logger.info(`${(end-start)/1000} Parsed request POST ${this.request.url}` );

            start = Date.now();
            if((this.config.ValidateApiPayloads || postBody.strict) && !validatePdfRequest(postBody))
			{
                this.logger.info('Validating the payload');
				// Capture the validation errors and throw the exception.
				const errors = validatePdfRequest.errors;
				this.logger.error(`Errors validating an uploaded pdf request`, {
					errors
				});
                this.res.statusCode = 400;
                this.res.end(`The request was not valid: ${JSON.stringify(errors, null, 2)}.`);
                return;
			}
            end = Date.now();
            this.logger.info(`${(end-start)/1000} Validated request POST ${this.request.url}`);

            let rootNode:React.ReactElement|null = null;
            start = Date.now();
            // server code
            // Create the factory that will generate nodes based on incoming json
            const factory = new ElementFactory(postBody, this.logger, this.config.GoogleApiKey);

            try{
                // Transform the incoming json into a react PDF element tree
                rootNode = await factory.generate();
                end = Date.now();
                this.logger.info(`${(end-start)/1000} Generated request POST ${this.request.url}` );
            }
            catch (err) {
                this.logger.error(`There was an error thrown from the generation process for POST ${this.request.url}`);
                if(err instanceof Error)
                {
                    this.logger.error(err);
                    this.res.statusCode = 400;
                    let errorMessage = `Error (${err.name}) rendering the file: ${err.message}`;
                    if((err as any).renderStack)
                    {
                        errorMessage += '\nRender Stack: ' + ((err as any).renderStack as string[]).join(' > ');
                    }
                    this.res.end(errorMessage);
                }
                else
                {
                    this.res.statusCode = 500;
                    this.res.end(`Error rendering the file: ${err}.`);
                }
                return;
            }

            let pdfBytes: Buffer;
            try {
                start = Date.now();
                // Turn this react element tree into the PDF bytes in memory, so
                // nothing is written to disk.
                pdfBytes = await renderToBuffer(rootNode);
                end = Date.now();
                this.logger.info(`${(end-start)/1000} Rendered request POST ${this.request.url}` );
            }
            catch (err) {
                this.logger.error(`There was an error thrown from the rendering process for POST ${this.request.url}`);

                const errAny = err as any;
                if(errAny.message)
                {
                    this.logger.error(errAny.message);
                }
                this.res.statusCode = 500;
                this.res.end(`Error rendering the file: ${err}.`);
                return;
            }

            start = Date.now();
            // Set the filename to be the title, getting rid of invalid characters
            const safeFileName = factory.finalizeString(postBody.title ?? 'document').replace(/[^A-Za-z0-9_.-]/g, '_');
            // set Content-type and send data
            this.res.setHeader('Content-type', 'application/pdf');
            this.res.setHeader('Content-disposition', `attachment; filename="${safeFileName}.pdf"`);
            this.logger.info(`Setting filename to ${safeFileName}`)
            this.res.end(pdfBytes);
            end = Date.now();
            this.logger.info(`${(end-start)/1000} Transmitted request POST ${this.request.url}` );
        }
        catch(e)
        {
            // If there was an error in the generating code, send an error.
            const errAny = e as any;
            this.logger.error(errAny);
            this.res.statusCode = 500;
            if(errAny.toString)
            {
                this.res.end(`Error generating the pdf: ${errAny.toString()}.`);
            }
            else
            {
                this.res.end(`Error generating the pdf: ${errAny}.`);
            }
            return;
        }
    };
}