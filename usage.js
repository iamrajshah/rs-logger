const logger = require("./lib/index").default;

logger.init({
  APP_NAME: "Usage app",
  LOG_LEVEL: "debug",
  ENV: "dev",
  LOG_DIR: "./logs",
  pretty: false,
});

logger.info("This is an info message", "asdasd", "sadadas");
logger.error("This is an error message", new Error("Sample error"));
logger.warn("This is a warning message");
logger.debug("This is a debug message");
logger.verbose("This is a verbose message");
try {
  throw new Error("Test error");
} catch (error) {
  logger.error("Caught an error", error);
}
