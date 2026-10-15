import Transport from "winston-transport";

import { RSLogger } from "./index";

class MemoryTransport extends Transport {
  public readonly entries: Record<string, unknown>[] = [];

  public log(info: Record<string, unknown>, callback: () => void): void {
    this.entries.push(info);
    callback();
  }
}

function createTestLogger(): {
  logger: RSLogger;
  transport: MemoryTransport;
} {
  const logger = new RSLogger();
  const transport = new MemoryTransport();

  logger.init({ APP_NAME: "test-app", ENV: "test", pretty: false });
  logger.logger?.clear();
  logger.logger?.add(transport);

  return { logger, transport };
}

describe("RSLogger", () => {
  it("records string messages with structured metadata", () => {
    const { logger, transport } = createTestLogger();

    logger.info("request completed", { requestId: "req-123" });

    expect(transport.entries[0]).toMatchObject({
      level: "info",
      message: "request completed",
      service: "test-test-app",
      metadata: { meta: { requestId: "req-123" } },
    });
  });

  it("preserves an Error name, message, stack, and caller metadata", () => {
    const { logger, transport } = createTestLogger();
    const error = new TypeError("invalid payload");

    logger.error(error, { requestId: "req-456" });

    expect(transport.entries[0]).toMatchObject({
      level: "error",
      service: "test-test-app",
      metadata: {
        meta: {
          requestId: "req-456",
          error: {
            name: "TypeError",
            message: "invalid payload",
          },
        },
      },
    });
    expect(transport.entries[0].message).toEqual(
      expect.stringContaining("TypeError: invalid payload"),
    );
    expect(
      (transport.entries[0].metadata as { meta: { error: { stack: string } } })
        .meta.error.stack,
    ).toContain("TypeError: invalid payload");
  });

  it("marks circular values instead of throwing", () => {
    const { logger, transport } = createTestLogger();
    const payload: { id: number; self?: unknown } = { id: 42 };
    payload.self = payload;

    logger.info(payload);
    expect(transport.entries[0].message).toContain('"self": "[Circular]"');
  });

  it("creates child loggers with contextual defaults", () => {
    const { logger, transport } = createTestLogger();
    const child = logger.child({ requestId: "req-789" });

    child.warn("slow request");

    expect(transport.entries[0]).toMatchObject({
      level: "warn",
      message: "slow request",
      metadata: { requestId: "req-789" },
    });
  });
});
