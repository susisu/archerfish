"use strict";

const log4js = require("log4js");

/**
 * @type {Logger}
 */
const defaultLogger = log4js.getLogger();

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
}

/**
 * Gets a wrapped logger instance.
 * @param {string} name
 * @returns {WrappedLogger}
 */
function getLogger(name) {
  const logger = log4js.getLogger(name);
  logger.level = defaultLogger.level;
  return new WrappedLogger(logger);
}

/**
 * @type {Set<string>}
 */
const logLevels = new Set([
  "off",
  "trace",
  "info",
  "warn",
  "error",
  "all",
]);

module.exports = {
  defaultLogger,
  getLogger,
  logLevels,
};
