import { NextResponse } from "next/server";

const snapshot = {
  miningPower: "24 PH/s",
  miningChange: "18.2% from last hour",
  dagThroughput: "847M",
  dagBars: [40, 65, 45, 80, 60, 90, 75, 85, 95, 70, 88, 92],
  rewardFlow: "24.8%",
  rewardProgress: 75,
  performanceMetrics: [
    { label: "Network Hashrate", value: "12.4 PH/s", sub: "Live Network Data" },
    { label: "BlockDAG Throughput", value: "847M TPS", sub: "Real Time Processing" },
    { label: "Reward Efficiency", value: "98.2%", sub: "Optimization" },
    { label: "Uptime Stability", value: "99.998%", sub: "Enterprise Grade SLA" },
  ],
};

export async function GET() {
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
