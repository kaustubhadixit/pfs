// Admin: create new patent. Server component shell that hands off to the
// client PatentForm. Reads ?leadId=... so a lead can be converted into a listing.
import * as React from "react";
import { PatentForm } from "@/components/admin/patent-form";

export default async function AdminPatentNewPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const sp = await searchParams;
  const leadId = sp.leadId || null;
  return <PatentForm patent={null} leadId={leadId} />;
}
