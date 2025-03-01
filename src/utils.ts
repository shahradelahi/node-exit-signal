import deasync from 'deasync';

export function delay(ms: number): void {
  let done = false;
  const callback = (err: Error | null) => {
    if (err) {
      throw err;
    }

    done = true;
  };

  setTimeout(callback, ms);

  deasync.loopWhile(() => !done);
}
