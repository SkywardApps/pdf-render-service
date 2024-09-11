import * as fs from "fs";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
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

let SECRETS = {
    GOOGLEAPIKEY: process.env.GOOGLEAPIKEY,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET
}


const secretsManagerClient = new SecretsManagerClient({ region: "us-east-1" }); // Replace with your region

// Function to fetch secret by ARN and parse the JSON value
async function getSecretValue(secretArn: string): Promise<any> {
    try {
        const command = new GetSecretValueCommand({
            SecretId: secretArn,
        });

        const response = await secretsManagerClient.send(command);
        if (response.SecretString) {
            // If the secret is a JSON string, parse it
            const secretValue = JSON.parse(response.SecretString);
            SECRETS = {
                ...SECRETS,
                ...secretValue
            };
            return;
        } else {
            throw new Error("Secret is in binary form, not supported in this example.");
        }
    } catch (err) {
        console.error("Error fetching secret:", err);
        throw err;
    }
}

let secretsTask = Promise.resolve();
if(process.env.APPSETTINGS_OVERRIDE_SECRET_ARN)
{
    secretsTask = getSecretValue(process.env.APPSETTINGS_OVERRIDE_SECRET_ARN);
}


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
            GoogleApiKey: SECRETS.GOOGLEAPIKEY ?? 'UNKNOWN',
            ValidateApiPayloads: true
        });

        const result = await server.process(event.body!);

        if(typeof(result.statusCode) !== 'string')
        {
            return {
                statusCode: result.statusCode,
                body: result.body
            };
        }

        const bucketName = SECRETS.STORAGE_BUCKET;

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
