function normalizeConfiguredUrl(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function getAppOrigin(req: Request) {
  const configuredUrl = normalizeConfiguredUrl(String(process.env.NEXT_PUBLIC_URL || ""));
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const requestUrl = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return requestUrl.origin;
}

export function buildAppUrl(req: Request, path: string, searchParams?: Record<string, string>) {
  const url = new URL(path, `${getAppOrigin(req)}/`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}