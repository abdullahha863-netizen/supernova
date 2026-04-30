import GeneralStatsView from "@/components/dashboard/v2/GeneralStatsView";

export default function Page() {
  const adminMiningStatsEnabled = process.env.ENABLE_ADMIN_MINING_STATS === "true";
  const miningRuntimeMetricsEnabled = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

  return (
    <GeneralStatsView
      backHref="/admin/dashboard"
      title="Global Mining Stats"
      subtitle={adminMiningStatsEnabled || miningRuntimeMetricsEnabled
        ? "Admin-wide miner totals with live counters and latency from the shared mining stack."
        : "Admin-wide mining totals stay disabled during build stage so the page does not depend on database or Redis services."}
      statsEndpoint={adminMiningStatsEnabled ? "/api/admin/mining/stats" : null}
      metricsEndpoint={miningRuntimeMetricsEnabled ? "/api/mining/metrics" : null}
      buildStageMessage="This admin page is intentionally quiet during build stage. Enable mining stats and runtime metrics only when you are ready to validate the live stack."
    />
  );
}
