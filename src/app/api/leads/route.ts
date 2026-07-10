// POST /api/leads — Phase A lead capture. Persists a Lead record, sends
// acknowledgment + sales-notification emails, and logs an analytics event.
// No payment, no automated patent fetching — sales team follows up manually.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendLeadAcknowledgment, sendSalesNotification } from "@/lib/email";
import { logEvent, anonymizeIp } from "@/lib/analytics";
import { LEAD_CONSENT_TEXT } from "@/lib/consent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const patentNumber = body.patentNumber ? String(body.patentNumber).trim() : null;
    const consent = Boolean(body.consent);
    const ageConfirmed = Boolean(body.ageConfirmed);

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 422 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });
    }
    // DPDPA: consent + age declaration are REQUIRED, not implied by submission.
    if (!consent || !ageConfirmed) {
      return NextResponse.json({ error: "Consent and age confirmation are required" }, { status: 422 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || undefined;
    const sourceUrl = req.headers.get("referer") || undefined;

    const lead = await db.lead.create({
      data: {
        name,
        email,
        phone,
        patentNumber,
        consent: true,
        ageConfirmed: true,
        consentTextSnapshot: body.consentText || LEAD_CONSENT_TEXT,
        sourceUrl,
        ipAddress: anonymizeIp(ip),
        status: "new",
      },
    });

    // Fire-and-forget: emails + analytics. Never block the response.
    void sendLeadAcknowledgment({ name, email, patentNumber: patentNumber || undefined });
    void sendSalesNotification({
      name,
      email,
      phone,
      patentNumber: patentNumber || undefined,
      source: "lead",
    });
    void logEvent({
      eventType: "lead_submitted",
      sessionId: body.sessionId,
      path: sourceUrl,
      ipAddress: ip,
      metadata: { leadId: lead.id, hasPatentNumber: !!patentNumber },
    });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (e) {
    console.error("POST /api/leads error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
