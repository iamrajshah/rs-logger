<div align="center">

# rs-logger

**Predictable application logs without rebuilding Winston configuration in every service.**

[![npm version](https://img.shields.io/npm/v/rs-logger?logo=npm&color=cb3837)](https://www.npmjs.com/package/rs-logger)
[![CI](https://github.com/iamrajshah/rs-logger/actions/workflows/ci.yml/badge.svg)](https://github.com/iamrajshah/rs-logger/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

`rs-logger` is a TypeScript-first wrapper around [Winston](https://github.com/winstonjs/winston). It keeps the everyday API small while preserving error stacks, safely serializing circular values, attaching contextual metadata, and exposing the underlying Winston logger when an application needs custom transports.

## Why use it?

- Preserve `Error` names, messages, stacks, and custom properties.
- Add request or module context once with child loggers.
- Avoid crashes when log payloads contain circular references.
- Use readable local output and deterministic production formatting.
- Keep direct access to Winston transports and configuration.
- Ship TypeScript declarations with the package.

## Install

```bash
npm install rs-logger
```

Node.js 20 or newer is required. Winston is included as a runtime dependency.

## Quick start

```ts
import logger from "rs-logger";

logger.init({
  APP_NAME: "orders-api",
  ENV: process.env.NODE_ENV ?? "development",
  LOG_LEVEL: "info",
});

logger.info("order created", { orderId: "ord-42", customerId: "cus-7" });

try {
  throw new TypeError("invalid delivery address");
} catch (error) {
  logger.error(error, { orderId: "ord-42" });
}
```

CommonJS is supported too:

```js
const logger = require("rs-logger").default;

logger.info("service ready", { port: 3000 });
```

## Contextual logging

Create a child logger when several messages share the same context:

```ts
const requestLogger = logger.child({
  requestId: "req-123",
  component: "checkout",
});

requestLogger.info("payment started");
requestLogger.warn("payment gateway responded slowly", { elapsedMs: 850 });
```

## Configuration

Call `init()` on the default logger or a new `RSLogger` instance.

```ts
import { RSLogger } from "rs-logger";

const auditLogger = new RSLogger();
auditLogger.init({
  APP_NAME: "audit-worker",
  ENV: "production",
  LOG_LEVEL: "info",
  pretty: false,
});
```

| Option | Purpose | Default |
| --- | --- | --- |
| `APP_NAME` | Application name included in log metadata | `rs-logger` |
| `ENV` | Runtime environment | `NODE_ENV` or `development` |
| `LOG_LEVEL` | Minimum Winston log level | `LOG_LEVEL` or `info` |
| `pretty` | Enable colorized, readable local output | Enabled outside production |
| `LOG_DIR` | Reserved for application-specific transports | `./logs` |

## API

| API | Description |
| --- | --- |
| `init(config)` | Merge configuration and rebuild the underlying Winston logger |
| `error(...args)` | Log messages or `Error` instances while preserving error details |
| `warn(...args)` | Log at `warn` level |
| `info(...args)` | Log at `info` level |
| `verbose(...args)` | Log at `verbose` level |
| `debug(...args)` | Log at `debug` level |
| `child(defaults)` | Create a logger carrying shared contextual metadata |
| `flush(timeoutMs)` | Close transports and wait briefly during graceful shutdown |
| `logger` | Access the underlying Winston logger |

## Custom Winston transports

```ts
import logger from "rs-logger";
import { transports } from "winston";

logger.logger?.add(
  new transports.File({ filename: "application.log", level: "info" }),
);
```

## Graceful shutdown

```ts
process.on("SIGTERM", async () => {
  logger.info("shutting down");
  await logger.flush(1000);
  process.exit(0);
});
```

## Development

```bash
npm ci
npm run verify
npm pack --dry-run
```

The verification command checks formatting, linting, tests, coverage thresholds, and the production build. Releases are published from GitHub after the release tag and package version agree.

## License

[MIT](LICENSE) © Rajesh Jitendra Shah
