import {createServer} from 'http';
import { server } from './Server';
import winston from 'winston';


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

// If a port was specified, use it, otherwise default to 9000
const listenPort = process.env.PORT || 9000;

// Start our server and listen on the port
const serverInstance = createServer((request,res) => server(request, res, logger));
serverInstance.setTimeout();
serverInstance.listen(listenPort);

logger.info(`Server listening on port ${listenPort}`);

