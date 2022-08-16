import {createServer} from 'http';
import { server } from './Server';
import { Font } from '@react-pdf/renderer';
import winston from 'winston';

/// Register custom fonts.  The default fonts that are
// built-in to react-pdf don't seem to have italics or bold variations, so we may need to expand this out
// a ton (and also bring the fonts locally).
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: './fonts/Roboto/Roboto-Regular.ttf',
      fontWeight: 'normal', // Default, does not have to be specified
      fontStyle: 'normal',  // Default, does not have to be specified
    },
    {
      src: './fonts/Roboto/Roboto-Bold.ttf',
      fontWeight: 'bold' // Also accepts numeric values, ex. 700
    },
    {
      src: './fonts/Roboto/Roboto-Italic.ttf',
      fontStyle: 'italic'
    },
    {
      src: './fonts/Roboto/Roboto-BoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'bold',
    },
  ]
});

Font.register({
  family: 'Teko',
  fonts: [
    {
      src: './fonts/Teko/Teko-Light.ttf',
      fontWeight: 300
    },
    {
      src: './fonts/Teko/Teko-Regular.ttf',
      fontWeight: 'normal', // Default, does not have to be specified
      fontStyle: 'normal',  // Default, does not have to be specified
    },
    {
      src: './fonts/Teko/Teko-Medium.ttf',
      fontWeight: 500
    },
    {
      src: './fonts/Teko/Teko-SemiBold.ttf',
      fontWeight: 600
    },
    {
      src: './fonts/Teko/Teko-Bold.ttf',
      fontWeight: 'bold'
    },
  ]
});

Font.register({
  family: 'Noto Sans',
  fonts: [
    {
      src: './fonts/Noto Sans/NotoSans-Thin.ttf',
      fontWeight: 100
    },
    {
      src: './fonts/Noto Sans/NotoSans-ThinItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 100
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraLight.ttf',
      fontWeight: 200
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraLightItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 200
    },
    {
      src: './fonts/Noto Sans/NotoSans-Light.ttf',
      fontWeight: 300
    },
    {
      src: './fonts/Noto Sans/NotoSans-LightItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 300
    },
    {
      src: './fonts/Noto Sans/NotoSans-Regular.ttf'
    },
    {
      src: './fonts/Noto Sans/NotoSans-Italic.ttf',
      fontStyle: 'italic'
    },
    {
      src: './fonts/Noto Sans/NotoSans-Medium.ttf',
      fontWeight: 500
    },
    {
      src: './fonts/Noto Sans/NotoSans-MediumItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 500
    },
    {
      src: './fonts/Noto Sans/NotoSans-SemiBold.ttf',
      fontWeight: 600
    },
    {
      src: './fonts/Noto Sans/NotoSans-SemiBoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 600
    },
    {
      src: './fonts/Noto Sans/NotoSans-Bold.ttf',
      fontWeight: 700
    },
    {
      src: './fonts/Noto Sans/NotoSans-BoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 700
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraBold.ttf',
      fontWeight: 800
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraBoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 800
    },
    {
      src: './fonts/Noto Sans/NotoSans-Black.ttf',
      fontWeight: 900
    },
    {
      src: './fonts/Noto Sans/NotoSans-BlackItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 900
    }
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

