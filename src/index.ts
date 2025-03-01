import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import deasync from 'deasync';

import { EXIT_SIGNAL, SIGNAL_EXIT_CODE } from '@/constants';
import type { ExitHook, ExitOptions, Signal, SignalHandler, UnsubscribeFn } from '@/typings';

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
  process.channel?.unref();

  const handlers = (exitHooks.get(signal) || []).filter((hook) => hook !== null);
  let forceAfter = Math.max(
    ...handlers
      .map(({ options }) => options.timeout)
      .filter((timeout) => typeof timeout === 'number')
  );

  if (forceAfter <= 0 || !Number.isFinite(forceAfter)) {
    forceAfter = Infinity;

    // Warn if we have async handlers but no timeout
    const hasAsyncHandlers = handlers.some(
      ({ handler }) => typeof handler === 'function' && handler.constructor.name !== 'Function'
    );

    if (hasAsyncHandlers) {
      process.emitWarning(
        'No timeout was specified for the exit signal handler.\n' +
          'If the handler fails to resolve, it can result in a hanging process, potentially leading to a deadlock.\n' +
          'Manual termination of the process may then be necessary.',
        'Warning',
        'NES-WARN002'
      );
    }
  }

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
        'Process forcefully exited.\nThe process was terminated abruptly due to reaching the execution timeout.',
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
  deasync.loopWhile(() => !isDone && Date.now() - start < forceAfter);

  return done();
}

// -- Exported ------------------------

/**
 * Registers an exit handler that will be called on process termination.
 *
 * @param {SignalHandler} handler - The function to execute on exit.
 * @param {ExitOptions} [options={}] - Optional configurations for the exit hook.
 * @returns {UnsubscribeFn} - A function to remove the exit hook.
 */
export function onExit(handler: SignalHandler, options: ExitOptions = {}): UnsubscribeFn {
  return onExitSignal(EXIT_SIGNAL as unknown as Signal[], handler, options);
}

/**
 * Registers an exit handler for a specific signal or multiple signals.
 *
 * @param {Signal | Signal[]} signal - The signal(s) to listen for.
 * @param {SignalHandler} handler - The function to execute when the signal is received.
 * @param {ExitOptions} [options={}] - Optional configurations for the exit hook.
 * @returns {UnsubscribeFn} - A function to remove the exit hook.
 */
export function onExitSignal(
  signal: Signal | Signal[],
  handler: SignalHandler,
  options: ExitOptions = {}
): UnsubscribeFn {
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

/**
 * Initiates a graceful exit by triggering the SIGINT signal.
 */
export function gracefullyExit() {
  exit('SIGINT');
}
