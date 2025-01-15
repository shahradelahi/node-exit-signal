import { onExit } from '../../dist/index.js';

onExit((signal) => {
  console.log(signal); // eslint-disable-line no-console
});

onExit(async (signal) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(signal); // eslint-disable-line no-console
});

// Floating intervals
setInterval(() => {
  // noop
}, 1e9);
