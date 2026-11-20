export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel: number = LEVELS[(process.env['LOG_LEVEL'] as LogLevel) ?? 'info'] ?? 20;

function write(level: LogLevel, scope: string, msg: string, extra?: Record<string, unknown>): void {
  if (LEVELS[level] < minLevel) return;
  const line = {
    time: new Date().toISOString(),
    level,
    scope,
    msg,
    ...extra,
  };
  const out = JSON.stringify(line);
  if (level === 'error' || level === 'warn') process.stderr.write(out + '\n');
  else process.stdout.write(out + '\n');
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, extra?: Record<string, unknown>) => write('debug', scope, msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) => write('info', scope, msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => write('warn', scope, msg, extra),
    error: (msg: string, extra?: Record<string, unknown>) => write('error', scope, msg, extra),
  };
}
