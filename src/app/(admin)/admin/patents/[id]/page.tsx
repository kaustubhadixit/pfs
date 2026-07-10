// Admin: edit patent. Server component that fetches the patent record and
// passes it to the client PatentForm. 404 if not found.
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PatentForm } from "@/components/admin/patent-form";

export default async function AdminPatentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patent = await db.patent.findUnique({ where: { id } });
  if (!patent) notFound();
  return <PatentForm patent={patent} />;
}
