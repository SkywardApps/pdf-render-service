import { Font } from '@react-pdf/renderer';
import axios from 'axios';
import { ILogger } from './ILogger';

/**
 * An internal map of all the fonts we have already loaded, since there doesn't seem to be a system for it as part of react-pdf
 */
const registeredFonts: {
  [family: string]: { src: string; fontWeight: string; fontStyle: string; }[];
} = {};


/**
 * Register custom fonts.  Provide a family at a time, along with all valid style configurations
 */
export function registerFont(family: string, fonts: { src: string; fontWeight?: string; fontStyle?: string; }[]) {
  Font.register({
    family,
    fonts
  });

  // NOTE: We should validate the sources here because if they fail later, you can never fix it.
  registeredFonts[family] = fonts.map(f => ({ src: f.src, fontWeight: f.fontWeight ?? 'normal', fontStyle: f.fontStyle ?? 'normal' }));
}

/**
 * Get a list of all the fonts that have been registered with sources.  Note that this does not mean that the font was successfully loaded.
 */
export function listFonts() {
  return Object.entries(registeredFonts).map(([k, v]) => ({
    family: k,
    configurations: v.map(f => ({ weight: f.fontWeight, style: f.fontStyle }))
  })
  );
}

/**
 * Query if a particular font has already been registered
 */
export function fontIsRegistered(fontFamily: string)
{
  return !!registeredFonts[fontFamily];
}

  
interface IGoogleFontEntry {
  kind: string;
  family: string;
  variants: string[];
  subsets: string[];
  version: string;
  lastModified: string;
  files: {
    [weight: string]: string;
  };
}

export interface IGoogleFontResponse {
  kind: "webfonts#webfontList",
  items: IGoogleFontEntry[];
}

/**
 * Map the google method of describing style variants to ReactPDF's
 */
const mappedVariants: { [variant: string]: [string, string]} = {
  "100": ["thin", "normal"],
  "200": ["ultralight", "normal"],
  "300": ["light", "normal"],
  "400": ["normal", "normal"],
  "regular": ["normal", "normal"],
  "500": ["medium", "normal"],
  "600": ["semibold", "normal"],
  "700": ["bold", "normal"],
  "800": ["ultrabold", "normal"],
  "900": ["heavy", "normal"],
  "100italic": ["thin", "italic"],
  "200italic": ["ultralight", "italic"],
  "300italic": ["light", "italic"],
  "400italic": ["normal", "italic"],
  "italic": ["normal", "italic"],
  "500italic": ["medium", "italic"],
  "600italic": ["semibold", "italic"],
  "700italic": ["bold", "italic"],
  "800italic": ["ultrabold", "italic"],
  "900italic": ["heavy", "italic"],
};

/**
 * Load fonts from Google's web font repository. See https://developers.google.com/fonts/docs/developer_api
 * @param fonts The names of the font families to download
 * @param apiKey A valid API key to access the API
 * @param logger An ILogger for errors
 */
export async function loadReferencedFonts(fonts: string[], apiKey: string, logger: ILogger)
{
  let googleFontResponse: IGoogleFontResponse | undefined = undefined;
  for(const fontRequest of fonts)
  {
    try
    {
      const knownFonts = listFonts();
      const existingFont = knownFonts.find(ff => ff.family.toLowerCase() == fontRequest.toLowerCase());

      if(existingFont)
      {
        logger.debug(`Skipping ${fontRequest} as it is already loaded.`)
        continue;
      }
      
      // We only fetch the drectory once, as it contains all fonts and is rarely if ever updated.
      if(!googleFontResponse)
      {
        logger.info(`Loading ${fontRequest} from the google repo.`);
        const googleApiResponse = await axios.get<IGoogleFontResponse>('https://www.googleapis.com/webfonts/v1/webfonts?key='+apiKey);
        googleFontResponse = googleApiResponse.data;
      }

      const googleMatch = googleFontResponse.items.find(item => item.family.toLowerCase() == fontRequest.toLowerCase())
      if(!googleMatch)
      {
        logger.error(`Requested a font by the name of ${fontRequest} but it was not loaded and we could not locate a match in the google API`);
        throw new Error(`Requested a font by the name of ${fontRequest} but it was not loaded and we could not locate a match in the google API`);
      }

      // Go ahead and register the url provided.
      registerFont(fontRequest, Object.keys(googleMatch.files).map(key => ({
        src: googleMatch.files[key],
        fontWeight: mappedVariants[key][0],
        fontStyle: mappedVariants[key][1]
      })));
    }
    catch(err)
    {
      throw new Error(`Exception thrown attempting to load a font '${fontRequest}' from the Google API server.\nCheck your API key (set via the GOOGLEAPIKEY environment variable).\n${err}`);
    }
  }
}


// Register our default font set
registerFont(
  'Roboto',
  [
    {
      src: './fonts/Roboto/Roboto-Regular.ttf',
      fontWeight: 'normal',
      fontStyle: 'normal', // Default, does not have to be specified
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
);
registerFont(
  'Teko',
  [
    {
      src: './fonts/Teko/Teko-Light.ttf',
      fontWeight: 'light'
    },
    {
      src: './fonts/Teko/Teko-Regular.ttf',
      fontWeight: 'normal',
      fontStyle: 'normal', // Default, does not have to be specified
    },
    {
      src: './fonts/Teko/Teko-Medium.ttf',
      fontWeight: 'medium'
    },
    {
      src: './fonts/Teko/Teko-SemiBold.ttf',
      fontWeight: 'semibold'
    },
    {
      src: './fonts/Teko/Teko-Bold.ttf',
      fontWeight: 'bold'
    },
  ]
);

registerFont(
  'Noto Sans',
  [
    {
      src: './fonts/Noto Sans/NotoSans-Thin.ttf',
      fontWeight: 'thin'
    },
    {
      src: './fonts/Noto Sans/NotoSans-ThinItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'thin'
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraLight.ttf',
      fontWeight: 'ultralight'
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraLightItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'ultralight'
    },
    {
      src: './fonts/Noto Sans/NotoSans-Light.ttf',
      fontWeight: 'light'
    },
    {
      src: './fonts/Noto Sans/NotoSans-LightItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'light'
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
      fontWeight: 'medium'
    },
    {
      src: './fonts/Noto Sans/NotoSans-MediumItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'medium'
    },
    {
      src: './fonts/Noto Sans/NotoSans-SemiBold.ttf',
      fontWeight: 'semibold'
    },
    {
      src: './fonts/Noto Sans/NotoSans-SemiBoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'semibold'
    },
    {
      src: './fonts/Noto Sans/NotoSans-Bold.ttf',
      fontWeight: 'bold'
    },
    {
      src: './fonts/Noto Sans/NotoSans-BoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'bold'
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraBold.ttf',
      fontWeight: 'ultrabold'
    },
    {
      src: './fonts/Noto Sans/NotoSans-ExtraBoldItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'ultrabold'
    },
    {
      src: './fonts/Noto Sans/NotoSans-Black.ttf',
      fontWeight: 'heavy'
    },
    {
      src: './fonts/Noto Sans/NotoSans-BlackItalic.ttf',
      fontStyle: 'italic',
      fontWeight: 'heavy'
    }
  ]
);
