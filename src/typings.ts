/**
 * A utility type for handling both synchronous and asynchronous values.
 */
type MaybePromise<T> = T | Promise<T>;

/**
 * Function signature for signal handlers.
 *
 * @param {exitCode} number - The exit code received by the process.
 * @returns {MaybePromise<any>} - A possible promise to handle async cleanup.
 */
export type SignalHandler = (exitCode: number) => MaybePromise<any>;

/**
 * Options for configuring an exit hook.
 */
export interface ExitOptions {
  /**
   * The number of milliseconds to wait before forcefully exiting the process.
   * @default Infinity
   */
  timeout?: number;
}

/**
 * Represents an exit hook with its handler and options.
 */
export interface ExitHook {
  /**
   * The function to execute when the signal is received.
   */
  handler: SignalHandler;

  /**
   * Configuration options for the exit hook.
   */
  options: ExitOptions;
}

/**
 * A function that removes a registered exit hook when invoked.
 */
export interface UnsubscribeFn {
  (): void;
}
