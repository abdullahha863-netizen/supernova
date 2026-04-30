import { logger } from "./logger.mjs";

const BACKEND_BASE_URL = process.env.SUPERNOVA_BACKEND_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_KEY || "";

export async function postBackendEvent(path, payload) {
  if (!ADMIN_KEY) return;

  const url = `${BACKEND_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
      body: JSON.stringify(payload),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    logger.warn("backend_event_post_failed", { path, error: String(error) });
    return { ok: false, status: 0, body: null, error: String(error) };
  }
}
