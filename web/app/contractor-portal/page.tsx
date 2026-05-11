import { Suspense } from "react";
import { DEMO_CONTRACTORS } from "@/lib/demo/contractors";
import { ContractorPortalClient } from "./portal-client";

export const dynamic = "force-dynamic";

export default async function ContractorPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string }>;
}) {
  const { cid } = await searchParams;
  const contractor = DEMO_CONTRACTORS.find((c) => c.id === cid);

  return (
    <Suspense>
      <ContractorPortalClient contractor={contractor ?? null} allContractors={DEMO_CONTRACTORS} />
    </Suspense>
  );
}
