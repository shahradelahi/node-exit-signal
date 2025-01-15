export function delay(ms: number): void {
  if (Number.isNaN(ms) || ms < 0) {
    throw new Error('Expected a non-negative number');
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
