/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createLogger as winstonCreateLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import TransportStream from "winston-transport";

const {
  combine,
  timestamp,
  printf,
  errors: formatErrors,
  metadata: formatMetadata,
  colorize,
} = format;

export interface ILogConfiguration {
  APP_NAME: string;
  ENV: string;
  LOG_DIR?: string;
  LOG_LEVEL?: string;
  pretty?: boolean; // pretty-print in non-prod
}

// Safe stringify that handles Errors and circular references
function safeStringify(value: unknown): string {
  const seen = new WeakSet();

  function replacer(_key: string, val: any) {
    if (val instanceof Error) {
      const errorProps: Record<string, any> = {
        name: val.name,
        message: val.message,
        stack: val.stack,
      };
      for (const k of Object.getOwnPropertyNames(val)) {
        if (k in errorProps) continue;
        try {
          errorProps[k] = (val as any)[k];
        } catch {
          errorProps[k] = "[unserializable]";
        }
      }
      return errorProps;
    }

    if (val && typeof val === "object") {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    return val;
  }

  try {
    return JSON.stringify(value, replacer, 2);
  } catch {
    return String(value);
  }
}

function createTransports(_service: string): TransportStream[] {
  return [new transports.Console()];
}

export type LogLevel =
  | "error"
  | "warn"
  | "info"
  | "http"
  | "verbose"
  | "debug"
  | "silly";

const defaultCfg: ILogConfiguration = {
  APP_NAME: "rs-logger",
  ENV: process.env.NODE_ENV || "development",
  LOG_DIR: "./logs",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  pretty: (process.env.NODE_ENV || "development") !== "production",
};

export class RSLogger {
  public logger: WinstonLogger | undefined;
  public config: ILogConfiguration | undefined;

  constructor() {
    this.config = { ...defaultCfg };
    this.logger = this.createWinstonLogger(this.config);
  }

  init(config: Partial<ILogConfiguration>) {
    this.config = { ...defaultCfg, ...config };
    this.logger = this.createWinstonLogger(this.config);
  }

  private createWinstonLogger(cfg: ILogConfiguration): WinstonLogger {
    const pretty = cfg.pretty && cfg.ENV !== "production";

    const baseFormat = combine(
      formatErrors({ stack: true }),
      formatMetadata({
        fillExcept: ["message", "level", "timestamp", "service"],
      }),
      timestamp(),
    );

    const jsonFormat = combine(
      baseFormat,
      printf((info) => {
        const message =
          typeof info.message === "string"
            ? info.message
            : safeStringify(info.message);

        const errorStack =
          (info as any).stack ||
          (info as any).metadata?.error?.stack ||
          (info as any).error?.stack;

        const hasErrorStack = Boolean(errorStack);

        let logLine = `${info.timestamp} [${info.level}] ${
          info.service || cfg.APP_NAME
        } - ${message}`;

        if (hasErrorStack) {
          logLine += `\n${errorStack}`;
        }

        // Only include meta for error logs and only if something useful is there
        const meta =
          info.level === "error" &&
          (info as any).metadata &&
          Object.keys((info as any).metadata).length > 0
            ? (() => {
                const { error, ...rest } = (info as any).metadata;
                return Object.keys(rest).length
                  ? `\nmeta: ${safeStringify(rest)}`
                  : "";
              })()
            : "";

        return `${logLine}${meta}`;
      }),
    );

    const prettyFormat = combine(
      colorize({ all: true }),
      baseFormat,
      printf((info) => {
        const message =
          typeof info.message === "string"
            ? info.message
            : safeStringify(info.message);

        const errorStack =
          (info as any).stack ||
          (info as any).metadata?.error?.stack ||
          (info as any).error?.stack;

        const hasErrorStack = Boolean(errorStack);

        let logLine = `${info.timestamp} [${info.level}] ${
          info.service || cfg.APP_NAME
        } - ${message}`;

        if (hasErrorStack) {
          logLine += `\n${colorize().colorize("red", errorStack)}`;
        }

        const meta =
          info.level === "error" &&
          (info as any).metadata &&
          Object.keys((info as any).metadata).length > 0
            ? (() => {
                const { error, ...rest } = (info as any).metadata;
                return Object.keys(rest).length
                  ? `\n${colorize().colorize("grey", "meta:")} ${safeStringify(
                      rest,
                    )}`
                  : "";
              })()
            : "";

        return `${logLine}${meta}`;
      }),
    );

    const chosenFormat = pretty ? prettyFormat : jsonFormat;

    const logger = winstonCreateLogger({
      level: cfg.LOG_LEVEL || "info",
      format: chosenFormat,
      defaultMeta: { service: `${cfg.ENV}-${cfg.APP_NAME}` },
      transports: createTransports(cfg.APP_NAME),
    });

    return logger;
  }

  public child(defaults: Record<string, unknown>): RSLogger {
    const childLogger = new RSLogger();
    childLogger.logger = this.logger?.child({
      ...((this.logger as any).defaultMeta || {}),
      ...defaults,
    });
    return childLogger;
  }

  public error(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);

    // Special handling for Error objects for clean readable logs
    if (args[0] instanceof Error) {
      const err = args[0] as Error;
      const errObj = extractOwnProps(err);

      const prettyError = [
        `${errObj.name}: ${errObj.message}`,
        errObj.stack ? `\n${errObj.stack}` : "",
      ].join("");

      this.logger?.log({
        level: "error",
        message: prettyError,
        meta: { ...meta, error: errObj },
      });
      return;
    }

    if (typeof message === "string") {
      this.logger?.log({ level: "error", message, meta });
    } else {
      this.logger?.log({
        level: "error",
        message: safeStringify(message),
        meta: { ...meta, payload: message },
      });
    }
  }

  public warn(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "warn", message, meta });
    } else {
      this.logger?.log({
        level: "warn",
        message: safeStringify(message),
        meta: { ...meta, payload: message },
      });
    }
  }

  public info(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "info", message, meta });
    } else {
      this.logger?.log({
        level: "info",
        message: safeStringify(message),
        meta: { ...meta, payload: message },
      });
    }
  }

  public verbose(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "verbose", message, meta });
    } else {
      this.logger?.log({
        level: "verbose",
        message: safeStringify(message),
        meta: { ...meta, payload: message },
      });
    }
  }

  public debug(...args: unknown[]): void {
    const { message, meta } = this.normalizeArgs(args);
    if (typeof message === "string") {
      this.logger?.log({ level: "debug", message, meta });
    } else {
      this.logger?.log({
        level: "debug",
        message: safeStringify(message),
        meta: { ...meta, payload: message },
      });
    }
  }

  // Normalize arguments -> { message: string | object, meta?: object }
  private normalizeArgs(args: unknown[]): {
    message: string | object;
    meta?: object;
  } {
    if (args.length === 0) return { message: "" };

    const first = args[0];
    const rest = args.slice(1);

    // Handle Error first
    if (first instanceof Error) {
      const metaCandidate =
        rest.length && rest[0] != null && typeof rest[0] === "object"
          ? (rest[0] as object)
          : undefined;
      return {
        message: first,
        meta: metaCandidate,
      };
    }

    if (typeof first === "string") {
      if (rest.length === 0) return { message: first };
      if (rest.length === 1 && typeof rest[0] === "object")
        return { message: first, meta: rest[0] as object };
      return {
        message: [first, ...rest]
          .map((x) => (typeof x === "string" ? x : safeStringify(x)))
          .join(" "),
      };
    }

    if (typeof first === "object") {
      const combined = Object.assign(
        {},
        ...([first, ...rest].filter((x) => typeof x === "object") as object[]),
      );
      return { message: combined };
    }

    return { message: safeStringify(args) };
  }

  public flush(timeoutMs = 2000): Promise<void> {
    return new Promise((resolve) => {
      try {
        (this.logger as any).close?.();
      } catch {
        // ignore
      }
      setTimeout(resolve, timeoutMs);
    });
  }
}

function extractOwnProps(err: Error): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.getOwnPropertyNames(err)) {
    try {
      (out as any)[k] = (err as any)[k];
    } catch {
      (out as any)[k] = "[unserializable]";
    }
  }
  return out;
}

const defaultLogger = new RSLogger();
export default defaultLogger;
