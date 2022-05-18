import {createServer} from 'http';
import { server } from './Server';
import { Font } from '@react-pdf/renderer';
import winston from 'winston';

/// Register roboto.  This is an example for custom fonts.  The default fonts that are
// built-in to react-pdf don't seem to have italics or bold variations, so we may need to expand this out
// a ton (and also bring the fonts locally).
// All the examples seem to expect the 'src' of the font to be an online url, rather than a local file,
// but that may not be a strict requirement.
Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: './fonts/Roboto-Regular.ttf',
        fontWeight: 'normal', // Default, does not have to be specified
        fontStyle: 'normal',  // Default, does not have to be specified
      },
      {
        src: './fonts/Roboto-Bold.ttf',
        fontWeight: 'bold' // Also accepts numeric values, ex. 700
      },
      {
        src: './fonts/Roboto-Italic.ttf',
        fontStyle: 'italic'
      },
      {
        src: './fonts/Roboto-BoldItalic.ttf',
        fontStyle: 'italic',
        fontWeight: 'bold',
      },
    ]
  })

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

