import assert from 'assert/strict';
import { ErrorHandler, ErrorSeverity } from '../src/utils/error-handler.js';

interface ConsoleCall {
  method: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

export async function runErrorHandlerTests(): Promise<void> {
  testUsesStderrSafeConsoleMethods();
  console.log('✅ error-handler tests passed');
}

function testUsesStderrSafeConsoleMethods(): void {
  const errorHandler = ErrorHandler.getInstance();
  errorHandler.clearErrorLog();

  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  const calls: ConsoleCall[] = [];

  console.debug = (...args: unknown[]) => {
    calls.push({ method: 'debug', message: args.map(String).join(' ') });
  };
  console.info = (...args: unknown[]) => {
    calls.push({ method: 'info', message: args.map(String).join(' ') });
  };
  console.warn = (...args: unknown[]) => {
    calls.push({ method: 'warn', message: args.map(String).join(' ') });
  };
  console.error = (...args: unknown[]) => {
    calls.push({ method: 'error', message: args.map(String).join(' ') });
  };

  try {
    errorHandler.handleError({
      component: 'test',
      method: 'debugCase',
      severity: ErrorSeverity.DEBUG,
      error: new Error('debug message'),
    });
    errorHandler.handleError({
      component: 'test',
      method: 'infoCase',
      severity: ErrorSeverity.INFO,
      error: new Error('info message'),
    });
    errorHandler.handleError({
      component: 'test',
      method: 'warnCase',
      severity: ErrorSeverity.WARNING,
      error: new Error('warn message'),
    });

    assert.equal(
      calls.filter(call => call.method === 'debug').length,
      0,
      'debug severity should not write to stdout-backed console.debug'
    );
    assert.equal(
      calls.filter(call => call.method === 'info').length,
      0,
      'info severity should not write to stdout-backed console.info'
    );
    assert.ok(
      calls.some(call => call.method === 'error' && call.message.includes('debug message')),
      'debug severity should be routed through stderr-safe logging'
    );
    assert.ok(
      calls.some(call => call.method === 'error' && call.message.includes('info message')),
      'info severity should be routed through stderr-safe logging'
    );
    assert.ok(
      calls.some(call => call.method === 'warn' && call.message.includes('warn message')),
      'warning severity should continue to use console.warn'
    );
  } finally {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    errorHandler.clearErrorLog();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlerTests().catch(error => {
    console.error('💥 error-handler tests failed', error);
    process.exit(1);
  });
}
