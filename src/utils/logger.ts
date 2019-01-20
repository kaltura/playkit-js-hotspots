let isEnabled = false;

export function enableLog() {
  isEnabled = true;
}
export function log(level: 'debug' | 'log' | 'warn' | 'error', context: string, message: string, ...optionalParams: any[]) {
  if (isEnabled) {
    console[level](`[${level}] ${context ? `[${context}]` : ''} : ${message}`, ...optionalParams);
  }
}
