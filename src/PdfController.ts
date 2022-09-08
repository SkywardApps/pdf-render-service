import { IncomingMessage, ServerResponse } from 'http';
import ReactPDF from '@react-pdf/renderer';
import { PdfRequest } from './wire/PdfRequest';
import { ElementFactory } from './factory/ElementFactory';
import { v4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import {tmpdir} from 'os';
import {promisify} from 'util';
import { ILogger } from './ILogger';
import { validatePdfRequest } from './validatePdfRequest';

// We prefer async-await where we can
const mkdir = promisify(fs.mkdir);

/// This represents the handling of incoming PDF creation requests
export class PdfController
{
    public constructor(private request: IncomingMessage, private res: ServerResponse, private logger:ILogger, private config: { GoogleApiKey: string }) { }

    private body = '';

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
            if(!validatePdfRequest(postBody))
			{
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

            // Create a temporary folder for our output, if needed
            const tmpPath = path.normalize(`${tmpdir()}/pdf-renderer`)
            try{
                await mkdir(tmpPath, { recursive: true });
            }
            catch(err)
            {
                // We get an exception if the directory already exists, but this
                // is the only safe way to handle it.  If we check if it exists before, there's
                // no guarantee that won't change anyway, so we'd still have to handle this
                // error.
                const errAny = err as any;
                if(errAny?.code !== 'EEXIST')
                    throw err;
            }

            // Generate a random name in our tmp directory for this PDF
            const pathname = path.normalize(`${tmpPath}/${v4()}.pdf`);
            this.logger.info(`Writing to ${pathname}`);

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

            try {
                start = Date.now();
                // Turn this react element tree into an actual PDF file
                // There doesn't seem to be an in-memory version of this, so
                // write it to the disk and then return the file on-disk to the client
                await ReactPDF.render(rootNode, pathname);
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
            // Now that it's written to disk, we have to read it back
            fs.readFile(pathname, (err, data) => {
                try{
                    // If there was an error reading, pass it back.  We do a 500 error here
                    // rather than Skyward's standard API response because the normal path
                    // returns file bytes, not an API response, so the client would have a
                    // hard time distinguishing.
                    if (err) {
                        this.logger.error(err);
                        this.res.statusCode = 500;
                        this.res.end(`Error getting the file: ${err}.`);
                        return;
                    }
                    else {
                        // Set the filename to be the title, getting rid of invalid characters
                        const safeFileName = factory.finalizeString(postBody.title ?? 'document').replace(/[^A-Za-z0-9_.-] /g, '_');
                        // set Content-type and send data
                        this.res.setHeader('Content-type', 'application/pdf');
                        this.res.setHeader('Content-disposition', `attachment; filename="${safeFileName}.pdf"`);
                        this.logger.info(`Setting filename to ${safeFileName}`)
                        this.res.end(data);
                        end = Date.now();
                        this.logger.info(`${(end-start)/1000} Transmitted request POST ${this.request.url}` );
                        return;
                    }
                }
                catch(e)
                {
                    // If there was an error in the responding code, instead send an error.
                    // There's a possibility this will be invalid if for some reason we get part way
                    // through responding above.
                    const errAny = e as any;
                    this.logger.error(errAny);
                    this.res.statusCode = 500;
                    if(errAny.toString)
                    {
                        this.res.end(`Error getting the file: ${errAny.toString()}.`);
                    }
                    else
                    {
                        this.res.end(`Error getting the file: ${errAny}.`);
                    }
                    return;
                }
            });
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