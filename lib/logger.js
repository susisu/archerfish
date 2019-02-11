"use strict";

const log4js = require("log4js");

/**
 * @type {Logger}
 */
const coreLogger = log4js.getLogger("core");
coreLogger.level = "all";

class WrappedLogger {
  /**
   * @param {Logger} logger
   */
  constructor(logger) {
    this._logger = logger;
  }

  /**
   * @param {string} msg
   * @returns {void}
   */
  trace(msg) {
    this._logger.trace(msg);
  }

  /**
   * @param {string} msg
   * @returns {void}
   */
  debug(msg) {
    this._logger.debug(msg);
  }

  /**
   * @param {string} msg
   * @returns {void}
   */
  info(msg) {
    this._logger.info(msg);
  }

  /**
   * @param {string} msg
   * @returns {void}
   */
  warn(msg) {
    this._logger.warn(msg);
  }

  /**
   * @param {string} msg
   * @returns {void}
   */
  error(msg) {
    this._logger.error(msg);
  }

  /**
   * @param {string} msg
   * @returns {void}
   */
  fatal(msg) {
    this._logger.fatal(msg);
  }
}

/**
 * Gets a wrapped logger instance.
 * @param {string} name
 * @returns {WrappedLogger}
 */
function getLogger(name) {
  if (name === "core") {
    throw new Error("logger named 'core' is reserved");
  }
  const logger = log4js.getLogger(name);
  logger.level = coreLogger.level;
  return new WrappedLogger(logger);
}

module.exports = {
  coreLogger,
  getLogger,
};
