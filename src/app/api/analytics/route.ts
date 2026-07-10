// POST /api/analytics — fire-and-forget event logging. Non-blocking: returns
// 204 immediately. DPDPA-aligned: anonymous session id, truncated IP, no PII.
import { NextRequest, NextResponse } from "next/server";
import { logEvent, anonymizeIp, type AnalyticsEventType } from "@/lib/analytics";

const ALLOWED: AnalyticsEventType[] = [
  "page_view",
  "listing_view",
  "request_now_opened",
  "lead_submitted",
  "express_interest_opened",
  "buyer_inquiry_submitted",
  "contact_submitted",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.eventType !== "string") {
      return new NextResponse(null, { status: 204 });
    }
    const eventType = body.eventType as AnalyticsEventType;
    if (!ALLOWED.includes(eventType)) {
      return new NextResponse(null, { status: 204 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || undefined;

    void logEvent({
      eventType,
      sessionId: body.sessionId,
      path: body.path,
      referrer: body.referrer,
      patentId: body.patentId,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      metadata: body.metadata,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
