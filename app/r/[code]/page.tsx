import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params;
  const safeCode = String(code || "").trim();

  if (!safeCode) {
    redirect("/register");
  }

  redirect(`/register?ref=${encodeURIComponent(safeCode)}`);
}
