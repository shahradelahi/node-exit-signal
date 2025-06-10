import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { loopWhile } from '@se-oss/deasync';

import type { ExitHook, ExitOptions, SignalHandler, UnsubscribeFn } from '@/typings';

let isRegistered = false;
let isCalled = false;
let shouldManuallyExit = true;

const exitHooks = new Array<ExitHook | null>();

// -- Internal ------------------------

function addHook(handler: SignalHandler, options: ExitOptions = {}): number {
  if (!isRegistered) {
    isRegistered = true;

    process.once('beforeExit', exit.bind(undefined, 0));
    process.once('SIGINT', exit.bind(undefined, 130));
    process.once('SIGTERM', exit.bind(undefined, 143));

    process.once('exit', () => {
      shouldManuallyExit = false;
    });

    process.on('message', (message) => {
      if (message === 'shutdown') {
        exit(130);
      }
    });
  }

  const index = exitHooks.push({ handler, options });

  return index - 1;
}

function removeHook(index: number): void {
  exitHooks[index] = null;
}

async function exit(exitCode: number) {
  if (isCalled) {
    return;
  }

  isCalled = true;
  let isDone = false;

  process.exitCode = exitCode;
  process.channel?.unref();

  const handlers = exitHooks.filter((hook) => hook !== null);

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
        handler(exitCode);
      } else {
        promises.push(Promise.resolve(handler(exitCode)));
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

  await Promise.all(promises).finally(() => {
    isDone = true;
  });

  if (forceAfter === Infinity) {
    loopWhile(() => !isDone);

    return done();
  }

  // Force exit if we exceeded our wait value
  const asyncTimer = setTimeout(() => done(true), forceAfter);

  clearTimeout(asyncTimer);

  const start = Date.now();
  loopWhile(() => !isDone && Date.now() - start < forceAfter);

  return done();
}

// -- Exported ------------------------

/**
 * Registers an exit handler that will be called when the process is terminating.
 * The handler receives the exit code and can perform synchronous or asynchronous cleanup.
 *
 * @param handler - The function to execute on exit. Receives the process exit code.
 * @param options - Optional configurations for the exit hook, such as a timeout in milliseconds.
 * @returns A function to unsubscribe and remove the registered exit hook.
 *
 * @example
 * ```ts
 * import { onExit } from 'exit-signal';
 *
 * // Register a cleanup handler
 * const unsubscribe = onExit(async (code) => {
 *   console.log(`Cleaning up before exit with code ${code}`);
 *   await cleanupResources();
 * }, { timeout: 3000 });
 *
 * // Later, if needed, remove the hook
 * unsubscribe();
 * ```
 */
export function onExit(handler: SignalHandler, options: ExitOptions = {}): UnsubscribeFn {
  const index = addHook(handler, options);

  return () => {
    removeHook(index);
  };
}

/**
 * Initiates a graceful exit by triggering the exit handlers and exiting with code 0.
 * This is equivalent to sending a SIGINT signal programmatically.
 *
 * @example
 * ```ts
 * import { gracefullyExit } from 'exit-signal';
 *
 * // Trigger all registered exit hooks and exit with code 0
 * gracefullyExit();
 * ```
 */
export function gracefullyExit(): void {
  exit(0).then(() => {});
}
