import AdminToolShell from "@/components/admin/AdminToolShell";
import HashrateWriterStatus from "@/components/dashboard/v2/HashrateWriterStatus";

export default function AdminDashboardPage() {
  return (
    <AdminToolShell
      title="Admin Dashboard"
      subtitle="Monitoring, observability, queue state, gateways, and operational controls."
      backHref={null}
      showLinks
    >
      <HashrateWriterStatus compact />
    </AdminToolShell>
  );
}
