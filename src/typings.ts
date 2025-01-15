import type { EXIT_SIGNAL } from '@/constants';

/**
 * @see https://nodejs.org/api/process.html#signal-events
 */
export type Signal = (typeof EXIT_SIGNAL)[number];

type MaybePromise<T> = T | Promise<T>;
export type SignalHandler = (signal: Signal) => MaybePromise<any>;

export interface ExitOptions {
  timeout?: number;
}

export interface ExitHook {
  handler: SignalHandler;
  options: ExitOptions;
}

export interface UnsubscribeFn {
  (): void;
}
