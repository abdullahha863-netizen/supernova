import { logger } from "./logger.mjs";
import { createHash } from "node:crypto";

function normalizeEnv(value) {
  return String(value || "").trim();
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "bigint") return value.toString();
  }
  return "";
}

function asHex(value, fallback, width = 64) {
  const raw = firstString(value);
  if (/^[0-9a-f]+$/i.test(raw)) return raw.toLowerCase().padStart(width, "0").slice(-width);
  return fallback;
}

function normalizeTimestamp(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    const seconds = n > 1_000_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
    return seconds.toString(16).padStart(8, "0").slice(-8);
  }
  return Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
}

function collectParentHash(block) {
  const parentsByLevel = block?.header?.parentsByLevel || block?.header?.parents || block?.parentsByLevel || block?.parents;
  if (Array.isArray(parentsByLevel)) {
    const firstLevel = parentsByLevel[0];
    if (Array.isArray(firstLevel) && firstLevel[0]) {
      return firstString(firstLevel[0].parentHash, firstLevel[0].hash, firstLevel[0]);
    }
    if (firstLevel) return firstString(firstLevel.parentHash, firstLevel.hash, firstLevel);
  }
  return firstString(block?.header?.selectedParentHash, block?.selectedParentHash, block?.previousHash, block?.prevHash);
}

function getHeader(block) {
  return block?.header && typeof block.header === "object" ? block.header : block || {};
}

function withSubmittedNonce(block, nonce) {
  const clone = JSON.parse(JSON.stringify(block));
  const header = clone.header && typeof clone.header === "object" ? clone.header : clone;
  header.nonce = nonce;
  return clone;
}

export class KaspaRpcClient {
  constructor(config) {
    this.rpcUrl = normalizeEnv(config.rpcUrl);
    this.rpcUsername = normalizeEnv(config.rpcUsername);
    this.rpcPassword = normalizeEnv(config.rpcPassword);
    this.network = normalizeEnv(config.network || "mainnet");
    this.poolAddress = normalizeEnv(config.poolAddress);
    this.requestId = 0;
  }

  headers() {
    const headers = {
      "content-type": "application/json",
      "accept": "application/json",
    };

    if (this.rpcUsername || this.rpcPassword) {
      const token = Buffer.from(`${this.rpcUsername}:${this.rpcPassword}`).toString("base64");
      headers.authorization = `Basic ${token}`;
    }

    return headers;
  }

  async call(method, params = []) {
    if (!this.rpcUrl) throw new Error("KASPA_RPC_URL is required");

    const body = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params,
    };

    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Kaspa RPC ${method} returned non-JSON response: ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(`Kaspa RPC ${method} failed with HTTP ${response.status}`);
    }

    if (payload?.error) {
      const message = payload.error.message || payload.error.code || "unknown RPC error";
      throw new Error(`Kaspa RPC ${method} failed: ${message}`);
    }

    return payload?.result ?? payload;
  }

  async getBlockTemplate(extraData = "") {
    const result = await this.call("getBlockTemplate", [{
      payAddress: this.poolAddress,
      extraData,
    }]);

    const template = normalizeKaspaTemplate(result);
    logger.info("kaspa_rpc_template_loaded", {
      network: this.network,
      height: template.height,
      hasBlock: Boolean(template.block),
    });
    return template;
  }

  async submitBlock(block) {
    const result = await this.call("submitBlock", [block, false]);
    const accepted = result === null || result === undefined || result?.accepted === true || result?.isAccepted === true;
    return {
      accepted,
      raw: result,
      rejectionReason: result?.rejectReason || result?.reason || result?.error || null,
    };
  }
}

export async function normalizeKaspaTemplate(result) {
  const block = result?.block || result?.blockTemplate || result?.template || result;
  const header = getHeader(block);
  const templateId = firstString(result?.jobId, result?.templateId, result?.id) || sha256Hex(stableJson(block)).slice(0, 16);
  const parentHash = collectParentHash(block);
  const merkleRoot = firstString(header.hashMerkleRoot, header.merkleRoot, block?.hashMerkleRoot, block?.merkleRoot);
  const bits = firstString(header.bits, header.nbits, block?.bits, block?.nbits);
  const version = firstString(header.version, block?.version) || "0";
  const timestamp = firstString(header.timestamp, header.time, block?.timestamp, block?.time);
  const blockTargetHex = firstString(result?.target, result?.targetHex, result?.blockTarget, block?.target, block?.targetHex);

  return {
    templateId,
    block,
    height: Number(result?.height ?? block?.height ?? header?.blueScore ?? header?.daaScore ?? 0),
    grossReward: Number(result?.coinbaseAmount ?? result?.reward ?? block?.reward ?? 0),
    foundAt: new Date().toISOString(),
    targetHex: blockTargetHex && /^[0-9a-f]+$/i.test(blockTargetHex) ? blockTargetHex.toLowerCase().padStart(64, "0").slice(-64) : null,
    stratum: {
      prevHash: asHex(parentHash, "0".repeat(64)),
      merkleRoot: asHex(merkleRoot, "0".repeat(64)),
      version: Number.isFinite(Number(version))
        ? Number(version).toString(16).padStart(8, "0").slice(-8)
        : asHex(version, "00000000", 8),
      nbits: /^[0-9a-f]+$/i.test(bits) ? bits.toLowerCase().padStart(8, "0").slice(-8) : "00000000",
      ntime: normalizeTimestamp(timestamp),
    },
  };
}

export function buildKaspaBlockCandidate(template, submit) {
  return withSubmittedNonce(template.block, String(submit.nonce || "").trim());
}
