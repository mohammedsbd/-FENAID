import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class JsonLogger extends ConsoleLogger {
  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    sourceMessage: string,
  ): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: logLevel,
      pid: process.pid,
      context: contextMessage ? contextMessage.replace('[', '').replace(']', '') : null,
      message,
    });
  }
}
