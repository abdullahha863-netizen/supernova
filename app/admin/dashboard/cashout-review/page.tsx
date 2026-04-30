import AdminToolShell from "@/components/admin/AdminToolShell";
import MinerCashoutMonitor from "@/components/admin/MinerCashoutMonitor";

export default function CashoutReviewIndexPage() {
  return (
    <AdminToolShell
      title="Miner Cashout Monitor"
      subtitle="View miners who requested cashout, then open a separate details page for the full hashrate and risk review."
    >
      <MinerCashoutMonitor />
    </AdminToolShell>
  );
}