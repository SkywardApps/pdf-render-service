import { IncomingMessage, ServerResponse } from 'http';
import { PdfController } from './PdfController';
import { ILogger } from './ILogger';
import { listFonts } from './fontManagement';

// This method handles the incoming request and routing -- there's really only one endpoint,
// so we haven't set up anything complex.
export const server = (request: IncomingMessage, res: ServerResponse, logger:ILogger) => {
    // We need to make sure this can be called cross-origin for situations like 
    // our PDF WSYWIG editor
    const headers:{[index:string]:any} = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
        'Access-Control-Max-Age': 2592000, // 30 days
        /** add other headers as per requirement */
    };
    
    // If we get an options request, a browser is doing a CORS inquiry, so reply
    // with the headers to allow it
    if (request.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    // We treat a GET as a basic health check; we may want to flesh this out with more 
    // data like a real status request
    if (request.method === 'GET' && request.url == '/') {
        res.writeHead(200, headers);
        res.end("SUCCESS");
        return;
    }

    if(request.method === 'GET' && request.url == '/fonts') {
        const fonts = listFonts();
        res.setHeader('Content-type', 'application/json');
        res.writeHead(200, headers);
        res.end(JSON.stringify(fonts));
        return;
    }

    // Create the controller that'll actually process the request.
    const server = new PdfController(request, res, logger, {
        GoogleApiKey: process.env.GOOGLEAPIKEY ?? 'UNKNOWN',
        ValidateApiPayloads: process.env.VALIDATEAPIPAYLOADS === 'strict'
    });

    // In theory there could be a PUT or DELETE so verify 
    if (request.method == 'POST') {
        logger.info(`Incoming request POST ${request.url}` );
        // Apply all the CORS headers
        Object.keys(headers).forEach(header => res.setHeader(header, headers[header]));
        // hook up our controller to process the incoming data
        request.on('data', server.onData);
        request.on('end', server.onEnd);
        // trust that the controller will reply.
        return;
    }

    logger.warn("Unexpected request", {method: request.method, url:request.url});

    //  In any other case, reply with a 404 not found error
    res.writeHead(404, headers);
    res.end();
    return;
};
