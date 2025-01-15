import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

import { EXIT_SIGNAL, SIGNAL_EXIT_CODE } from '@/constants';
import type { ExitHook, ExitOptions, Signal, SignalHandler, UnsubscribeFn } from '@/typings';
import { delay } from '@/utils';

let isRegistered = false;
let isCalled = false;
let shouldManuallyExit = true;

const exitHooks = new Map<Signal, (ExitHook | null)[]>();

// -- Internal ------------------------

function addHook(signal: Signal, handler: SignalHandler, options: ExitOptions = {}): number {
  if (!isRegistered) {
    isRegistered = true;

    EXIT_SIGNAL.forEach((signal) => {
      process.once(signal, exit.bind(undefined, signal));
    });

    process.once('exit', () => {
      shouldManuallyExit = false;
    });

    process.on('message', (message) => {
      if (message === 'shutdown') {
        exit('SIGINT');
      }
    });
  }

  const handlers = exitHooks.get(signal) || [];
  const index = handlers.push({ handler, options });

  exitHooks.set(signal, handlers);

  return index;
}

function removeHook(index: number): void {
  for (const [signal, handlers] of exitHooks.entries()) {
    const handler = handlers[index];
    if (handler) {
      handlers[index] = null;
      exitHooks.set(signal, handlers);

      break;
    }
  }
}

async function exit(signal: Signal) {
  if (isCalled) {
    return;
  }

  isCalled = true;
  let isDone = false;
  const exitCode = SIGNAL_EXIT_CODE[signal];

  process.exitCode = exitCode;

  const handlers = (exitHooks.get(signal) || []).filter((hook) => hook !== null);
  const forceAfter = Math.max(...handlers.map(({ options }) => options.timeout ?? 5000));

  const promises = [];

  for (const { handler } of handlers) {
    if (typeof handler === 'function') {
      if (handler.constructor.name === 'Function') {
        handler(signal);
      } else {
        promises.push(Promise.resolve(handler(signal)));
      }
    }
  }

  const done = (force = false) => {
    if (force) {
      process.emitWarning(
        'Process forcefully exited.\nThe process was terminated abruptly due to an external signal or force.',
        'Warning',
        'NES-WARN001'
      );
    }

    if (force || shouldManuallyExit) {
      process.exit(exitCode);
    }
  };

  // Force exit if we exceeded our wait value
  const asyncTimer = setTimeout(() => {
    done(true);
  }, forceAfter);

  await Promise.all(promises).finally(() => {
    isDone = true;
  });

  clearTimeout(asyncTimer);

  const start = Date.now();
  while (true) {
    if (isDone) {
      break;
    }

    // Timeout for our artificial synchronous exit hook
    if (Date.now() - start > forceAfter) {
      return done(true);
    }

    delay(1);
  }

  return done();
}

// -- Exported ------------------------

export function onExit(handler: SignalHandler, options: ExitOptions = {}): UnsubscribeFn {
  return onExitSignal(EXIT_SIGNAL as unknown as Signal[], handler, options);
}

export function onExitSignal(
  signal: Signal | Signal[],
  handler: SignalHandler,
  options: ExitOptions = {}
): UnsubscribeFn {
  process.channel?.unref();

  const signals = Array.isArray(signal) ? signal : signal === null ? [] : [signal];

  const indices: number[] = [];

  signals.forEach((signal) => {
    const index = addHook(signal, handler, options);
    indices.push(index);
  });

  return () => {
    indices.forEach((index) => {
      removeHook(index);
    });
  };
}

export function gracefullyExit() {
  exit('SIGINT');
}
