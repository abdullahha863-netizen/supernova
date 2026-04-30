import CheckoutSuccessClient from "@/components/checkout/CheckoutSuccessClient";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    intentId?: string;
    token?: string;
    tier?: string;
    redirect_status?: string;
    provider?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};

  return (
    <CheckoutSuccessClient
      intentId={resolvedSearchParams.intentId || ""}
      token={resolvedSearchParams.token || ""}
      tier={resolvedSearchParams.tier || ""}
      redirectStatus={resolvedSearchParams.redirect_status || ""}
      provider={resolvedSearchParams.provider || ""}
    />
  );
}