import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { server as appHandler } from '../../src/Server';
import { ILogger } from '../../src/ILogger';
import { CapturingLogger, createCapturingLogger } from './logger';

export interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  text(): string;
  json(): unknown;
}

export interface TestServer {
  baseUrl: string;
  port: number;
  logger: CapturingLogger;
  close(): Promise<void>;
  postJson(body: unknown, headers?: Record<string, string>): Promise<TestResponse>;
  postRaw(body: string | Buffer, headers?: Record<string, string>): Promise<TestResponse>;
  get(path: string, headers?: Record<string, string>): Promise<TestResponse>;
  options(path: string, headers?: Record<string, string>): Promise<TestResponse>;
  request(opts: {
    method: string;
    path?: string;
    body?: string | Buffer;
    headers?: Record<string, string>;
  }): Promise<TestResponse>;
}

export async function startServer(opts?: { logger?: ILogger }): Promise<TestServer> {
  const capturingLogger = createCapturingLogger();
  const logger = opts?.logger ?? capturingLogger;

  const httpServer: HttpServer = createServer((req, res) => appHandler(req, res, logger));
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address() as AddressInfo;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const close = () =>
    new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });

  const request: TestServer['request'] = async ({ method, path = '/', body, headers }) => {
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = body as BodyInit;
    }
    const res = await fetch(baseUrl + path, init);
    const buf = Buffer.from(await res.arrayBuffer());
    const headerMap: Record<string, string> = {};
    res.headers.forEach((v, k) => { headerMap[k] = v; });
    return {
      status: res.status,
      headers: headerMap,
      body: buf,
      text: () => buf.toString('utf8'),
      json: () => JSON.parse(buf.toString('utf8')),
    };
  };

  return {
    baseUrl,
    port,
    logger: capturingLogger,
    close,
    request,
    postJson: (body, headers) =>
      request({
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json', ...headers },
      }),
    postRaw: (body, headers) => request({ method: 'POST', body, headers }),
    get: (path = '/', headers) => request({ method: 'GET', path, headers }),
    options: (path = '/', headers) => request({ method: 'OPTIONS', path, headers }),
  };
}
