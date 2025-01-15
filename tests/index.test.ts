import { execa, ExecaError } from 'execa';
import { describe, expect, test } from 'vitest';

import { Signal } from '@/typings';

describe('Exit Signal', () => {
  test('should exit code be zero', async () => {
    const subprocess = execa(process.execPath, ['./tests/fixtures/zero.js']);
    const { exitCode, stdout, stderr } = await subprocess;

    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toBe('');
  });

  test('should unsubscribe with exit code zero', async () => {
    const subprocess = execa(process.execPath, ['./tests/fixtures/empty.js']);
    const { exitCode, stdout, stderr } = await subprocess;

    expect(exitCode).toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toBe('');
  });
});

describe('Signal', () => {
  const signals = [
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ] satisfies [Signal, number][];

  for (const [signal, exitCode] of signals) {
    test(`should exit with ${signal} signal`, async () => {
      const subprocess = execa(process.execPath, ['./tests/fixtures/signal.js']);

      setTimeout(() => {
        subprocess.kill(signal);
      }, 500);

      try {
        await subprocess;
      } catch (error: any) {
        expect(error).toBeInstanceOf(ExecaError);
        expect((error as ExecaError).exitCode).toBe(exitCode);
        expect((error as ExecaError).stderr).toBe('');
        expect((error as ExecaError).stdout).toBe(`${signal}\n${signal}`);
      }
    });
  }
});
