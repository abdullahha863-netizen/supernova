import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapCashoutReviewListToPayload } from "@/lib/admin/cashoutReviewListPresentation";
import type {
  CashoutReviewListBusinessResult,
  ComputedCashoutReviewListRow,
} from "@/lib/admin/cashoutReviewListBusiness";
import type { RiskLevel } from "@/lib/admin/cashoutReviewSharedEngine";

const testMiner = {
  minerId: "miner-1",
  minerName: "Test Miner",
  minerEmail: "miner@example.com",
};

function buildRequest(
  payoutId: number,
  riskScore: number,
  payoutDate: string,
  riskLevel: RiskLevel,
  miner = testMiner,
): ComputedCashoutReviewListRow {
  return {
    payoutId,
    minerId: miner.minerId,
    minerName: miner.minerName,
    minerEmail: miner.minerEmail,
    payoutAmount: 12.5,
    payoutDate,
    currentIp: "203.0.113.10",
    country: "US",
    vpnStatus: "No",
    riskScore,
    riskLevel,
    contributingSignals: [],
    sourceLabel: "live",
  };
}

describe("cashout review list presentation", () => {
  it("uses the highest visible request risk and newest payout date only as a tie-breaker", () => {
    const highestRiskOlderRequest = buildRequest(101, 90, "2026-05-01T10:00:00.000Z", "HIGH");
    const sameRiskNewerTieBreakerRequest = buildRequest(102, 90, "2026-05-02T10:00:00.000Z", "CRITICAL");
    const newestLowerRiskRequest = buildRequest(103, 50, "2026-05-03T10:00:00.000Z", "REVIEW");
    const otherMiner = {
      minerId: "miner-2",
      minerName: "Other Miner",
      minerEmail: "other@example.com",
    };
    const newestOtherMinerLowerRiskRequest = buildRequest(201, 80, "2026-05-04T10:00:00.000Z", "REVIEW", otherMiner);

    const business: CashoutReviewListBusinessResult = {
      rows: [
        highestRiskOlderRequest,
        sameRiskNewerTieBreakerRequest,
        newestLowerRiskRequest,
        newestOtherMinerLowerRiskRequest,
      ],
      minerGroups: [
        {
          minerId: otherMiner.minerId,
          minerName: otherMiner.minerName,
          minerEmail: otherMiner.minerEmail,
          highestRiskScore: 80,
          highestRiskLevel: "REVIEW",
          openRequestCount: 1,
          totalRequestedAmount: 12.5,
          newestPayoutDate: newestOtherMinerLowerRiskRequest.payoutDate,
          requests: [newestOtherMinerLowerRiskRequest],
        },
        {
          minerId: testMiner.minerId,
          minerName: testMiner.minerName,
          minerEmail: testMiner.minerEmail,
          highestRiskScore: 90,
          highestRiskLevel: "HIGH",
          openRequestCount: 3,
          totalRequestedAmount: 37.5,
          newestPayoutDate: newestLowerRiskRequest.payoutDate,
          requests: [highestRiskOlderRequest, sameRiskNewerTieBreakerRequest, newestLowerRiskRequest],
        },
      ],
      requestsCount: 4,
      highRiskCount: 3,
      pendingAmount: 50,
    };

    const payload = mapCashoutReviewListToPayload(business);
    const group = payload.minerGroups[0];
    const returned = group.requests.find((request) => request.riskLevel === group.highestRiskLevel);

    assert.equal(group.minerId, "miner-1");
    assert.equal(group.highestRiskScore, 90);
    assert.equal(group.highestRiskLevel, "CRITICAL");
    assert.equal(group.highestRiskLabel, "90/100");
    assert.ok(returned);
    assert.equal(returned.payoutId, sameRiskNewerTieBreakerRequest.payoutId);
    assert.equal(returned.riskScore, 90);
  });
});
