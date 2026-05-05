import nock from 'nock';
import path from 'path';

export const LOCAL_ROBOTO_REGULAR = path.resolve(
  process.cwd(),
  'fonts/Roboto/Roboto-Regular.ttf'
);

export interface MockedFamilyDescriptor {
  family: string;
  variants?: string[];
  files?: Record<string, string>;
}

export function mockGoogleFontsDirectory(families: MockedFamilyDescriptor[]) {
  const items = families.map((f) => {
    const variants = f.variants ?? ['regular'];
    const files =
      f.files ??
      Object.fromEntries(variants.map((v) => [v, LOCAL_ROBOTO_REGULAR]));
    return {
      kind: 'webfonts#webfont',
      family: f.family,
      variants,
      subsets: ['latin'],
      version: 'v1',
      lastModified: '2024-01-01',
      files,
    };
  });
  return nock('https://www.googleapis.com')
    .get('/webfonts/v1/webfonts')
    .query(true)
    .reply(200, { kind: 'webfonts#webfontList', items });
}

export function mockGoogleFontsError(status = 500, body: unknown = 'boom') {
  return nock('https://www.googleapis.com')
    .get('/webfonts/v1/webfonts')
    .query(true)
    .reply(status, body);
}

export function disableNetwork() {
  nock.disableNetConnect();
  nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'));
}

export function restoreNetwork() {
  nock.cleanAll();
  nock.enableNetConnect();
}
