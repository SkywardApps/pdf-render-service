import { ILogger } from '../../src/ILogger';

export interface CapturingLogger extends ILogger {
  records: { level: string; args: unknown[] }[];
  reset(): void;
}

const noopMethod = (records: { level: string; args: unknown[] }[], level: string) => {
  const fn = (...args: unknown[]) => {
    records.push({ level, args });
    return fn as unknown as ILogger;
  };
  return fn as unknown as ILogger['error'];
};

export function createCapturingLogger(): CapturingLogger {
  const records: { level: string; args: unknown[] }[] = [];
  return {
    records,
    reset: () => { records.length = 0; },
    error: noopMethod(records, 'error'),
    warn: noopMethod(records, 'warn'),
    info: noopMethod(records, 'info'),
    debug: noopMethod(records, 'debug'),
    verbose: noopMethod(records, 'verbose'),
  };
}

export function createSilentLogger(): ILogger {
  return createCapturingLogger();
}
