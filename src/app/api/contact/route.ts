// POST /api/contact — generic Contact Us form (separate from lead capture).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendContactAcknowledgment, sendSalesNotification } from "@/lib/email";
import { logEvent, anonymizeIp } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const subject = body.subject ? String(body.subject).trim() : null;
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 422 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 422 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || undefined;

    await db.contactMessage.create({
      data: { name, email, subject, message, ipAddress: anonymizeIp(ip) },
    });

    void sendContactAcknowledgment({ name, email, subject: subject || undefined });
    void sendSalesNotification({ name, email, phone: "(contact form)", source: "contact", message });
    void logEvent({
      eventType: "contact_submitted",
      ipAddress: ip,
      metadata: { hasSubject: !!subject },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/contact error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
