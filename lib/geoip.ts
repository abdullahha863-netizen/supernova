type GeoIpLookupResult = {
  country?: string;
};

type GeoIpModule = {
  lookup: (ip: string) => GeoIpLookupResult | null;
};

let geoipModule: GeoIpModule | null | undefined;

function normalizeIp(input: string | null | undefined) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const first = raw.split(",")[0]?.trim() || "";
  return first.replace(/^::ffff:/, "");
}

function isLocalOrPrivateIp(ip: string) {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

export function resolveCountryCodeFromIp(input: string | null | undefined) {
  const ip = normalizeIp(input);
  if (!ip || isLocalOrPrivateIp(ip) || ip === "unknown") return "UNKNOWN";

  try {
    const geoip = getGeoIpModule();
    if (!geoip) return "UNKNOWN";

    const match = geoip.lookup(ip);
    return String(match?.country || "UNKNOWN").toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

function getGeoIpModule() {
  if (geoipModule !== undefined) {
    return geoipModule;
  }

  try {
    const loaded = require("geoip-lite") as GeoIpModule;
    geoipModule = loaded;
  } catch {
    geoipModule = null;
  }

  return geoipModule;
}
