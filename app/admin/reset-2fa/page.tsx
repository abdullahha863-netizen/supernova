import { redirect } from "next/navigation";

export default function AdminReset2FALegacyPage() {
  redirect("/admin/dashboard/tools/reset-2fa");
}
