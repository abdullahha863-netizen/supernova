import { createHash } from "crypto";

export interface IPReputationData {
  ip: string;
  userId?: string;
  previousIPs?: string[];
  previousCountries?: string[];
  sessionStartTime?: Date;
}

export interface IPReputationResult {
  ip: string;
  country: string;
  isp: string;
  ip_type: "residential" | "datacenter" | "vpn" | "proxy" | "tor" | "unknown";
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  flags: string[];
  reason: string;
}

export interface IPGeolocation {
  country: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  latitude: number;
  longitude: number;
}

/**
 * Mock geolocation lookup - in production, use geoip-lite or MaxMind
 */
export function lookupIPGeolocation(ip: string): IPGeolocation {
  // Mock implementation - replace with real geoip service
  const mockData: Record<string, IPGeolocation> = {
    "192.168.1.1": {
      country: "US",
      region: "CA",
      city: "San Francisco",
      isp: "Comcast",
      org: "Comcast Cable",
      latitude: 37.7749,
      longitude: -122.4194
    },
    "10.0.0.1": {
      country: "US",
      region: "NY",
      city: "New York",
      isp: "Verizon",
      org: "Verizon Communications",
      latitude: 40.7128,
      longitude: -74.0060
    }
  };

  return mockData[ip] || {
    country: "Unknown",
    region: "Unknown",
    city: "Unknown",
    isp: "Unknown ISP",
    org: "Unknown Organization",
    latitude: 0,
    longitude: 0
  };
}

/**
 * Determine IP type based on various heuristics
 */
export function determineIPType(ip: string, geolocation: IPGeolocation): "residential" | "datacenter" | "vpn" | "proxy" | "tor" | "unknown" {
  // TOR exit nodes (mock - in production use TOR project lists)
  const torExitNodes = ["185.220.101.1", "185.220.101.2"]; // Example
  if (torExitNodes.includes(ip)) return "tor";

  // Known VPN providers (mock)
  const vpnProviders = ["mullvad.net", "protonvpn.com"];
  if (vpnProviders.some(provider => geolocation.isp.toLowerCase().includes(provider))) return "vpn";

  // Known proxy services (mock)
  const proxyServices = ["brightdata.com", "oxylabs.io"];
  if (proxyServices.some(service => geolocation.org.toLowerCase().includes(service))) return "proxy";

  // Known datacenter providers
  const datacenterProviders = ["amazon", "google", "microsoft", "digitalocean", "linode"];
  if (datacenterProviders.some(provider => geolocation.org.toLowerCase().includes(provider))) return "datacenter";

  // Residential heuristic - if not matching above and has residential ISP
  const residentialISPs = ["comcast", "verizon", "att", "cox", "spectrum"];
  if (residentialISPs.some(isp => geolocation.isp.toLowerCase().includes(isp))) return "residential";

  return "unknown";
}

/**
 * Check for impossible travel between locations
 */
export function checkImpossibleTravel(
  currentLocation: { lat: number; lng: number; country: string },
  previousLocations: Array<{ lat: number; lng: number; country: string; timestamp: Date }>
): boolean {
  if (previousLocations.length === 0) return false;

  const latestPrevious = previousLocations[previousLocations.length - 1];
  const timeDiffHours = (Date.now() - latestPrevious.timestamp.getTime()) / (1000 * 60 * 60);

  // Calculate distance using Haversine formula
  const distance = calculateDistance(
    currentLocation.lat, currentLocation.lng,
    latestPrevious.lat, latestPrevious.lng
  );

  // Speed in km/h needed for this distance
  const requiredSpeed = distance / timeDiffHours;

  // If speed > 800 km/h (commercial flight speed), it's suspicious
  return requiredSpeed > 800;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate IP reputation risk score
 */
export function calculateIPRiskScore(
  ip: string,
  geolocation: IPGeolocation,
  ipType: string,
  previousIPs: string[],
  previousCountries: string[],
  sessionStartTime?: Date
): { score: number; flags: string[]; reason: string } {
  let score = 0;
  const flags: string[] = [];
  const reasons: string[] = [];

  // TOR detection
  if (ipType === "tor") {
    score += 50;
    flags.push("TOR_EXIT_NODE");
    reasons.push("TOR detected");
  }

  // VPN detection
  if (ipType === "vpn") {
    score += 35;
    flags.push("VPN_USAGE");
    reasons.push("VPN detected");
  }

  // Proxy detection
  if (ipType === "proxy") {
    score += 30;
    flags.push("PROXY_USAGE");
    reasons.push("Proxy detected");
  }

  // Datacenter IP
  if (ipType === "datacenter") {
    score += 25;
    flags.push("DATACENTER_IP");
    reasons.push("Datacenter IP");
  }

  // Country mismatch with previous sessions
  if (previousCountries.length > 0 && !previousCountries.includes(geolocation.country)) {
    score += 20;
    flags.push("COUNTRY_MISMATCH");
    reasons.push("Country mismatch with previous locations");
  }

  // Impossible travel detection
  const currentLocation = {
    lat: geolocation.latitude,
    lng: geolocation.longitude,
    country: geolocation.country
  };

  const previousLocations = previousCountries.map((country, index) => ({
    lat: 0, // Simplified - in production use actual coordinates
    lng: 0,
    country,
    timestamp: sessionStartTime || new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000)
  }));

  if (checkImpossibleTravel(currentLocation, previousLocations)) {
    score += 40;
    flags.push("IMPOSSIBLE_TRAVEL");
    reasons.push("Impossible travel detected");
  }

  // New unknown IP baseline
  if (previousIPs.length === 0 || !previousIPs.includes(ip)) {
    score += 10;
    flags.push("NEW_IP");
    reasons.push("New unknown IP");
  }

  // Cap at 100
  score = Math.min(100, score);

  const reason = reasons.length > 0 ? reasons.join(" + ") : "Clean IP with no risk indicators";

  return { score, flags, reason };
}

/**
 * Main function to assess IP reputation
 */
export function assessIPReputation(data: IPReputationData): IPReputationResult {
  const { ip, previousIPs = [], previousCountries = [], sessionStartTime } = data;

  // Get geolocation data
  const geolocation = lookupIPGeolocation(ip);

  // Determine IP type
  const ipType = determineIPType(ip, geolocation);

  // Calculate risk score
  const riskAssessment = calculateIPRiskScore(
    ip,
    geolocation,
    ipType,
    previousIPs,
    previousCountries,
    sessionStartTime
  );

  // Determine risk level
  const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
    riskAssessment.score >= 70 ? "HIGH" :
    riskAssessment.score >= 40 ? "MEDIUM" : "LOW";

  return {
    ip,
    country: geolocation.country,
    isp: geolocation.isp,
    ip_type: ipType,
    risk_score: riskAssessment.score,
    risk_level: riskLevel,
    flags: riskAssessment.flags,
    reason: riskAssessment.reason
  };
}

/**
 * Extract IP from request headers
 */
export function extractIPFromRequest(request: Request): string {
  // Check various headers for IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');

  // Use the first available IP
  const ip = forwarded?.split(',')[0]?.trim() ||
             realIP ||
             cfIP ||
             '127.0.0.1'; // Fallback

  return ip;
}