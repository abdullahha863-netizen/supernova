import { Suspense } from "react";
import ObservabilityView from "@/components/dashboard/v2/ObservabilityView";

export default function Page() {
  const runtimeEnabled = process.env.ENABLE_MINING_RUNTIME_METRICS === "true";

  return (
    <Suspense fallback={null}>
      <ObservabilityView backHref="/admin/dashboard" runtimeEnabled={runtimeEnabled} />
    </Suspense>
  );
}
