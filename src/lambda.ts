import * as fs from "fs";
import { S3Client, PutObjectCommand, PutObjectCommandInput, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import winston from 'winston';
import { Handler, APIGatewayProxyEventV2, APIGatewayProxyResultV2  } from 'aws-lambda';
import { listFonts } from './fontManagement';
import { PdfController } from './PdfController';
import uuid from "uuid";

// Create a logger to track activity
const logger = winston.createLogger({
  level:'warning',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      level:'info'
    }),
    new winston.transports.File({
        filename: 'pdf-renderer.log',
        format: winston.format.json(),
        level:'warning'
    })
  ]
});

export const handler: Handler = async (event: APIGatewayProxyEventV2, context): Promise<APIGatewayProxyResultV2> => {
    if(event.requestContext.http.method.toLowerCase() == 'get' && event.requestContext.http.path == '/')
    {
        return {
            statusCode: 200,
            body: "SUCCESS"
        };
    }

    if(event.requestContext.http.method.toLowerCase() == 'get' && event.requestContext.http.path == '/fonts')
    {
        const fonts = listFonts();
        return {
            statusCode: 200,
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify(fonts)
        };
    }
    
    if(event.requestContext.http.method.toLowerCase() == 'post')
    {
        // Create the controller that'll actually process the request.
        const server = new PdfController(logger, {
            GoogleApiKey: process.env.GOOGLEAPIKEY ?? 'UNKNOWN',
            ValidateApiPayloads: process.env.VALIDATEAPIPAYLOADS === 'strict'
        });

        const result = await server.process(event.body!);

        if(typeof(result.statusCode) !== 'string')
        {
            return {
                statusCode: result.statusCode,
                body: result.body
            };
        }

        logger.warn("Unexpected request", {method: event.requestContext.http.method, url:event.requestContext.http.path});

        const bucketName = process.env.STORAGE_BUCKET;

        const pathname = result.statusCode; 
        const destinationPath = `${uuid()}/${result.fileName}.pdf`;

        const s3Client = new S3Client({ region: "us-east-1" });
        const fileStream = fs.createReadStream(pathname);
        const uploadParams: PutObjectCommandInput = {
            Bucket: bucketName,
            Key: destinationPath,
            Body: fileStream,
            // Set the file to expire after 300 seconds (5 minutes)
            Expires: new Date(Date.now() + 300 * 1000),
        };
    
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);


        const signedCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: destinationPath,
        });
    
        // Generate a presigned URL that will expire in 30 seconds
        const presignedUrl = await getSignedUrl(s3Client, signedCommand, { expiresIn: 30 });
        console.log(`Presigned URL: ${presignedUrl}`);

        return {
            statusCode: 302,
            headers: {
              'Location': presignedUrl,
            }
        };
    }

    //  In any other case, reply with a 404 not found error
    return {
        statusCode: 404,
        body: JSON.stringify({method: event.requestContext.http.method, url:event.requestContext.http.path})
    };
};
