interface LogMethod {
    (message: string, ...meta: any[]): ILogger;
    (infoObject: object): ILogger;
}

// This interface represents a logger so that we can change the logging implementation as needed
export interface ILogger {
  error: LogMethod;
  warn: LogMethod;
  info: LogMethod;
  debug: LogMethod;
  verbose: LogMethod;
}
