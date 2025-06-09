# exit-signal

[![CI](https://github.com/shahradelahi/node-exit-signal/actions/workflows/ci.yml/badge.svg)](https://github.com/shahradelahi/node-exit-signal/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/exit-signal.svg)](https://www.npmjs.com/package/exit-signal)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](/LICENSE)
[![Install Size](https://packagephobia.com/badge?p=exit-signal)](https://packagephobia.com/result?p=exit-signal)

_exit-signal_ is a Node.js utility for handling process termination gracefully. The `process.on('exit')` event does not capture every method by which a process can terminate. By registering custom exit handlers, you can ensure proper cleanup and effective resource management.

---

- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 📦 Installation

```bash
npm install exit-signal
```

## 📖 Usage

```typescript
import { gracefullyExit, onExit } from 'exit-signal';

// Example 1: Register a simple exit handler
const unsubscribe = onExit(() => {
  console.log('Process is exiting... Cleaning up resources.');
});

// Unsubscribe the handler
unsubscribe();

// Example 2: Register an exit handler for specific signals
onExit(async (exitCode) => {
  console.log(`Received ${exitCode}. Performing async cleanup...`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('Cleanup completed.');
});

// Example 3: Trigger a graceful exit manually
gracefullyExit();
```

## 📚 Documentation

For all configuration options, please see [the API docs](https://www.jsdocs.io/package/exit-signal).

##### API

<!-- prettier-ignore -->
```typescript
/**
 * Registers an exit handler that will be called on process termination.
 *
 * @param {SignalHandler} handler - The function to execute on exit.
 * @param {ExitOptions} [options={}] - Optional configurations for the exit hook.
 * @returns {UnsubscribeFn} - A function to remove the exit hook.
 */
function onExit(handler: SignalHandler, options?: ExitOptions): UnsubscribeFn;

/**
 * Initiates a graceful exit by triggering the SIGINT signal.
 */
function gracefullyExit(): void;
```

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/node-exit-signal)

Thanks again for your support, it is much appreciated! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/node-exit-signal/graphs/contributors).
