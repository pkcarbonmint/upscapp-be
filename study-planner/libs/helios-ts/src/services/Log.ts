import type { Logger, LogEntry } from '../types/Types';
export function makeLogger(_logs?: LogEntry[]): Logger {
  let logs = _logs || [];
  return {
    logInfo(source: string, message: string) {
      logs.push({ logLevel: 'Info', logSource: source, logMessage: message });
      // console.log(`[${source}] ${message}`);
    },

    logWarn(source: string, message: string) {
      logs.push({ logLevel: 'Warn', logSource: source, logMessage: message });
      // console.warn(`[${source}] ${message}`);
    },

    logDebug(source: string, message: string) {
      logs.push({ logLevel: 'Debug', logSource: source, logMessage: message });
      // console.debug(`[${source}] ${message}`);
    },

    getLogs() {
      return logs;
    },

    clear() {
      logs = [];
    }
  }
}

