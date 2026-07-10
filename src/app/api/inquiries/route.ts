// POST /api/inquiries — buyer "Express Interest" from patent detail page.
// Persists a BuyerInquiry linked to the patent + buyer, notifies sales, sends
// buyer acknowledgment. Same DPDPA consent pattern as the lead form.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBuyerAcknowledgment, sendSalesNotification } from "@/lib/email";
import { logEvent, anonymizeIp } from "@/lib/analytics";
import { BUYER_CONSENT_TEXT } from "@/lib/consent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const patentId = String(body.patentId || "").trim();
    const buyerName = String(body.buyerName || "").trim();
    const buyerEmail = String(body.buyerEmail || "").trim().toLowerCase();
    const buyerPhone = String(body.buyerPhone || "").trim();
    const message = body.message ? String(body.message).trim() : null;
    const budgetRange = body.budgetRange ? String(body.budgetRange).trim() : null;
    const intendedUse = body.intendedUse ? String(body.intendedUse).trim() : null;
    const consent = Boolean(body.consent);
    const ageConfirmed = Boolean(body.ageConfirmed);

    if (!patentId || !buyerName || !buyerEmail || !buyerPhone) {
      return NextResponse.json({ error: "Patent, name, email, and phone are required" }, { status: 422 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });
    }
    if (!consent || !ageConfirmed) {
      return NextResponse.json({ error: "Consent and age confirmation are required" }, { status: 422 });
    }

    const patent = await db.patent.findUnique({ where: { id: patentId } });
    if (!patent) return NextResponse.json({ error: "Patent not found" }, { status: 404 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || undefined;

    const inquiry = await db.buyerInquiry.create({
      data: {
        patentId,
        buyerName,
        buyerEmail,
        buyerPhone,
        message,
        budgetRange,
        intendedUse,
        consent: true,
        ageConfirmed: true,
        consentTextSnapshot: body.consentText || BUYER_CONSENT_TEXT,
        ipAddress: anonymizeIp(ip),
        status: "new",
      },
    });

    void sendBuyerAcknowledgment({ name: buyerName, email: buyerEmail, patentTitle: patent.title });
    void sendSalesNotification({
      name: buyerName,
      email: buyerEmail,
      phone: buyerPhone,
      source: "buyer_inquiry",
      patentTitle: patent.title,
      message: message || undefined,
      budgetRange: budgetRange || undefined,
      intendedUse: intendedUse || undefined,
    });
    void logEvent({
      eventType: "buyer_inquiry_submitted",
      sessionId: body.sessionId,
      patentId,
      ipAddress: ip,
      metadata: { inquiryId: inquiry.id },
    });

    return NextResponse.json({ ok: true, id: inquiry.id });
  } catch (e) {
    console.error("POST /api/inquiries error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
