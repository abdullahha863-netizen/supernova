/**
 * Structured JSON logger for mining worker services.
 *
 * Levels (ascending severity): debug < info < warn < error
 * Set LOG_LEVEL env var to control minimum level (default: "info").
 *
 * Output:
 *   - error level  → stderr
 *   - all others   → stdout
 *
 * Format: { ts, level, pid, msg, ...extraFields }
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? 1;

/**
 * @param {string} level
 * @param {string} msg
 * @param {Record<string, unknown>} [data]
 */
function log(level, msg, data = {}) {
  if ((LEVELS[level] ?? 1) < MIN_LEVEL) return;

  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    pid: process.pid,
    msg,
    ...data,
  });

  if (level === "error") {
    process.stderr.write(entry + "\n");
  } else {
    process.stdout.write(entry + "\n");
  }
}

export const logger = {
  /** @param {string} msg @param {Record<string, unknown>} [data] */
  debug: (msg, data) => log("debug", msg, data),
  /** @param {string} msg @param {Record<string, unknown>} [data] */
  info:  (msg, data) => log("info",  msg, data),
  /** @param {string} msg @param {Record<string, unknown>} [data] */
  warn:  (msg, data) => log("warn",  msg, data),
  /** @param {string} msg @param {Record<string, unknown>} [data] */
  error: (msg, data) => log("error", msg, data),
};
