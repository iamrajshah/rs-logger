# rs-logger

A small, ergonomic TypeScript-friendly wrapper around Winston focused on predictable structured logs, safe error handling, and tiny runtime surface.
Defaults to JSON logs in production and a human-friendly pretty mode in development. Handles `Error` objects (stacks preserved), circular refs, and provides `child()` loggers and a `flush()` helper.

---

## Features

* TypeScript-first typings and simple API (`error`, `warn`, `info`, `debug`, `verbose`)
* Preserves `Error` objects and prints stack traces reliably
* Safe JSON stringify for circular objects and non-enumerable error props
* `child()` for request/module-scoped metadata
* `flush()` for graceful shutdown (best-effort)
* Minimal default transports (Console); easy to add Winston transports

---

## Installation

```bash
npm install rs-logger winston winston-transport
# or
yarn add rs-logger winston winston-transport
```

> If you're using this locally, import from your built `dist` or `src` directory instead.

---

## Usage (JavaScript - CommonJS)

```js
const logger = require('rs-logger').default;

logger.info('app started', { port: 3000 });

// Logging an Error (stack will be included)
const err = new Error('boom test');
logger.error(err, { requestId: 'abc' });

// Child logger with contextual metadata
const reqLogger = logger.child({ requestId: 'abc', component: 'auth' });
reqLogger.info('handling login');

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('shutting down');
  await logger.flush(2000);
  process.exit(0);
});
```

---

## Usage (JavaScript - ESM)

```js
import logger from 'rs-logger';

logger.info('server up');
logger.error(new Error('oops'));
```

---

## Usage (TypeScript)

```ts
import defaultLogger, { RSLogger } from 'rs-logger';

defaultLogger.info('hello ts', { env: process.env.NODE_ENV });

const customLogger = new RSLogger();
const child = customLogger.child({ component: 'payments' });
child.debug('charge created', { amount: 999 });

async function shutdown() {
  defaultLogger.info('shutdown');
  await defaultLogger.flush(1000);
}
```

---

## Common Scenarios

### Express Middleware

```ts
import express from 'express';
import logger from 'rs-logger';
import { v4 as uuid } from 'uuid';

const app = express();
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuid();
  (req as any).logger = logger.child({ requestId, ip: req.ip });
  res.setHeader('x-request-id', requestId);
  next();
});

app.get('/', (req, res) => {
  (req as any).logger.info('hit root');
  res.send('ok');
});
```

### AWS Lambda

```ts
import logger from 'rs-logger';

export const handler = async (event: any) => {
  const reqLogger = logger.child({ awsRequestId: event.requestContext?.requestId || 'lambda' });
  try {
    reqLogger.info('lambda invoked', { path: event.path });
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    reqLogger.error(err);
    throw err;
  } finally {
    await reqLogger.flush(1000);
  }
};
```

### Add Custom Winston Transport

```ts
import logger from 'rs-logger';
import { transports } from 'winston';

logger.logger.add(new transports.File({ filename: 'combined.log', level: 'info' }));
```

---

## API

### `RSLogger` class

```ts
new RSLogger(config?: Partial<ILogConfiguration>)
```

**Configuration:**

```ts
interface ILogConfiguration {
  APP_NAME: string;
  ENV: string;
  LOG_DIR?: string;
  LOG_LEVEL?: string;
  pretty?: boolean;
}
```

**Methods:**

* `error(...args)` — log an Error or message; preserves stack.
* `warn(...args)`
* `info(...args)`
* `verbose(...args)`
* `debug(...args)`
* `child(defaults)` — new logger with contextual metadata.
* `flush(timeoutMs)` — graceful flush of transports.
* `logger` — access underlying Winston logger.

**Default instance:**

```ts
import logger from 'rs-logger';
logger.info('ready');
```

---

## Stack Trace Handling

* When an `Error` is logged, the actual `Error` object is passed to Winston.
* `format.errors({ stack: true })` attaches the stack to the `info` object.
* The formatter prints `info.stack`, `info.message.stack`, or `meta.error.stack` if present.

---

## Environment Variables

| Variable    | Description            | Default       |
| ----------- | ---------------------- | ------------- |
| `NODE_ENV`  | Controls pretty mode   | `development` |
| `LOG_LEVEL` | Sets minimum log level | `info`        |

---

## Testing

```ts
import { RSLogger } from 'rs-logger';

const testLogger = new RSLogger({ ENV: 'test', LOG_LEVEL: 'error' });
testLogger.logger.clear();
```

---

## License

MIT License — see `LICENSE` file.
