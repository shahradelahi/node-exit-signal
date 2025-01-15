import { onExit } from '../../dist/index.js';

const unsubscribe = onExit((signal) => {
  console.log(signal); // eslint-disable-line no-console
});

unsubscribe();
