let isEnabled = false;
let logPrefix = '';
export function enableLog(prefix?: string) {
  logPrefix = prefix || '';
  isEnabled = true;
}
export function log(level: 'debug' | 'log' | 'warn' | 'error', context: string, message: string, ...optionalParams: any[]) {
  if (isEnabled) {
    console[level](`[${logPrefix}] [${level}]${context ? ` [${context}]` : ''} : ${message}`, ...optionalParams);
  }
}
