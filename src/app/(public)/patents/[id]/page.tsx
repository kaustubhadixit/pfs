// Patent detail page — server component. Fetches the patent by id (must be
// published). Renders breadcrumb, header, right rail with ScoreGauge + readiness
// inputs, tabbed content (Overview / Claims / Description / Visuals), and the
// Express Interest CTA. Fires `listing_view` analytics via a tiny client
// component on mount. generateMetadata pulls the patent title for SEO.
import type React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Sparkles, Scale, Calendar, CalendarClock, Users, Building2,
  FileText, ClipboardList, BarChart3, ArrowLeft, Layers,
} from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Reveal } from "@/components/site/motion";
import { ScoreGauge } from "@/components/site/score-gauge";
import { formatDate, parseInventors, scoreColor, scoreLabel, truncate } from "@/lib/format";
import { ClaimStructure } from "@/components/marketplace/claim-structure";
import { DetailCharts, type DetailPatent } from "@/components/marketplace/detail-charts";
import { InquiryDialog } from "@/components/marketplace/inquiry-dialog";
import { ListingViewTracker } from "@/components/marketplace/listing-view-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const patent = await db.patent.findUnique({
    where: { id },
    select: { title: true, patentNumber: true, jurisdiction: true, summaryAbstract: true, published: true },
  });
  if (!patent || !patent.published) {
    return { title: "Patent not found — PatentSale" };
  }
  const description = truncate(patent.summaryAbstract || patent.title, 160);
  return {
    title: `${patent.title} — ${patent.patentNumber} | PatentSale`,
    description,
    alternates: { canonical: `/patents/${id}` },
    openGraph: {
      title: `${patent.title} — ${patent.patentNumber}`,
      description,
      url: `/patents/${id}`,
      type: "article",
    },
  };
}

export default async function PatentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patent = await db.patent.findUnique({ where: { id } });

  if (!patent || !patent.published) {
    notFound();
  }

  const inventors = parseInventors(patent);

  // Fetch the marketplace field-of-use distribution so the detail visuals can
  // show this patent's field in market context (a "field-of-use category chart"
  // as required by the spec). Only published listings count.
  const fieldGroups = await db.patent.groupBy({
    by: ["fieldOfUse"],
    where: { published: true, fieldOfUse: { not: null } },
    _count: { _all: true },
  });
  const fieldDistribution = fieldGroups
    .map((g) => ({ field: g.fieldOfUse as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  // Build a serializable view for the client DetailCharts component.
  const detailPatent: DetailPatent = {
    id: patent.id,
    title: patent.title,
    fieldOfUse: patent.fieldOfUse,
    readinessScore: patent.readinessScore,
    scoreSource: patent.scoreSource,
    claimBreadth: patent.claimBreadth,
    remainingLifeYears: patent.remainingLifeYears,
    forwardCitations: patent.forwardCitations,
    marketSizeProxy: patent.marketSizeProxy,
    litigationHistory: patent.litigationHistory,
    patentFamilySize: patent.patentFamilySize,
    legalStatus: patent.legalStatus,
    filingDate: patent.filingDate ? patent.filingDate.toISOString() : null,
    grantDate: patent.grantDate ? patent.grantDate.toISOString() : null,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ListingViewTracker patentId={patent.id} />

      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/patents">Marketplace</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-3.5 w-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono text-xs">{patent.patentNumber}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Back to marketplace (mobile-friendly) */}
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1 text-muted-foreground">
        <Link href="/patents">
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        {/* Header — full width on desktop, first on mobile */}
        <div className="lg:col-span-2">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                {patent.jurisdiction}
              </Badge>
              <span className="font-mono text-sm text-muted-foreground">{patent.patentNumber}</span>
              {patent.legalStatus ? (
                <Badge variant="outline" className="capitalize">{patent.legalStatus}</Badge>
              ) : null}
              {patent.fieldOfUse ? (
                <Badge variant="outline">{patent.fieldOfUse}</Badge>
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {patent.title}
            </h1>
            {patent.assignee ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Assigned to <span className="font-medium text-foreground">{patent.assignee}</span>
              </p>
            ) : null}

            {/* Bibliographic strip */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <BibItem icon={CalendarClock} label="Filed" value={formatDate(patent.filingDate)} />
              <BibItem icon={Calendar} label="Granted" value={formatDate(patent.grantDate)} />
              <BibItem
                icon={Users}
                label="Inventors"
                value={inventors.length > 0 ? inventors.join(", ") : "—"}
              />
              <BibItem
                icon={Layers}
                label="Family size"
                value={patent.patentFamilySize != null ? `${patent.patentFamilySize} ${patent.patentFamilySize === 1 ? "member" : "members"}` : "—"}
              />
            </div>
          </Reveal>
        </div>

        {/* Right rail — score + readiness inputs.
            On mobile: appears before the tabs (so the score is "top").
            On desktop: right column, sticky. */}
        <aside className="lg:col-start-2 lg:row-start-2 lg:sticky lg:top-24 lg:h-fit">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Commercial readiness</CardTitle>
              <CardDescription>
                Assigned by the PatentSale team based on the inputs below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ScoreGauge score={patent.readinessScore} size={140} showAssignedBy />
              <div className="mt-4 w-full">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Score band</span>
                  <span className={`font-semibold ${scoreColor(patent.readinessScore)}`}>
                    {scoreLabel(patent.readinessScore)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium capitalize text-foreground">
                    {patent.scoreSource === "manual" ? "Manual" : patent.scoreSource}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Readiness inputs reference list */}
          <Card className="mt-4 border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Readiness inputs (reference data)
              </CardTitle>
              <CardDescription>Reference data for the assigned score.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <DefRow label="Claim breadth" value={patent.claimBreadth} />
                <DefRow
                  label="Remaining life"
                  value={patent.remainingLifeYears != null ? `${patent.remainingLifeYears.toFixed(1)} yrs` : null}
                />
                <DefRow
                  label="Forward citations"
                  value={patent.forwardCitations != null ? String(patent.forwardCitations) : null}
                />
                <DefRow label="Market size" value={patent.marketSizeProxy} />
                <DefRow label="Litigation history" value={patent.litigationHistory} />
                <DefRow
                  label="Patent family size"
                  value={patent.patentFamilySize != null ? String(patent.patentFamilySize) : null}
                />
              </dl>
            </CardContent>
          </Card>
        </aside>

        {/* Main column — tabs + CTA. On desktop: left column, row 2. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <Separator className="mb-8 lg:hidden" />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto">
              <TabsTrigger value="overview" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="claims" className="gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Claims</span>
              </TabsTrigger>
              <TabsTrigger value="description" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Description</span>
              </TabsTrigger>
              <TabsTrigger value="visuals" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Visuals</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-6 space-y-5">
              <SummaryCard
                title="Abstract summary"
                summary={patent.summaryAbstract}
                fallback={patent.abstract}
                fallbackTitle="Abstract"
              />
              <SummaryCard
                title="Claims summary"
                summary={patent.summaryClaims}
                fallback={null}
                fallbackTitle="Claims"
              />
              <SummaryCard
                title="Field of use summary"
                summary={patent.summaryField}
                fallback={patent.fieldOfUse}
                fallbackTitle="Field of use"
              />
            </TabsContent>

            {/* Claims */}
            <TabsContent value="claims" className="mt-6 space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold">Interactive claim structure</h2>
                <ClaimStructure claims={patent.claims} />
              </div>
              <Separator />
              <div>
                <h2 className="mb-3 text-lg font-semibold">Full claims text</h2>
                {patent.claims ? (
                  <ScrollArea className="h-96 rounded-lg border border-border/60 bg-muted/30">
                    <pre className="whitespace-pre-wrap p-4 text-xs leading-relaxed text-foreground/80">
                      {patent.claims}
                    </pre>
                  </ScrollArea>
                ) : (
                  <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    No claims text available for this listing.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Description */}
            <TabsContent value="description" className="mt-6">
              {patent.description ? (
                <>
                  <h2 className="mb-3 text-lg font-semibold">Detailed description</h2>
                  <ScrollArea className="h-[32rem] rounded-lg border border-border/60 bg-muted/30">
                    <pre className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-foreground/85">
                      {patent.description}
                    </pre>
                  </ScrollArea>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No detailed description available for this listing.
                </div>
              )}
            </TabsContent>

            {/* Visuals */}
            <TabsContent value="visuals" className="mt-6">
              <DetailCharts patent={detailPatent} fieldDistribution={fieldDistribution} />
            </TabsContent>
          </Tabs>

          {/* Express interest CTA */}
          <div className="mt-12">
            <Card className="overflow-hidden border-primary/30">
              <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold">Interested in this patent?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Express interest and our team will facilitate an introduction — no payment required to start.
                  </p>
                </div>
                <InquiryDialog
                  patentId={patent.id}
                  patentTitle={patent.title}
                  triggerLabel="Express interest"
                  triggerSize="lg"
                  triggerClassName="w-full sm:w-auto"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function BibItem({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DefRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize text-foreground">
        {value ? value : <span className="italic text-muted-foreground/70">Not specified</span>}
      </dd>
    </div>
  );
}

function SummaryCard({
  title, summary, fallback, fallbackTitle,
}: {
  title: string;
  summary: string | null | undefined;
  fallback: string | null | undefined;
  fallbackTitle: string;
}) {
  const hasAI = Boolean(summary && summary.trim());
  const body = hasAI ? summary! : fallback;
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          {hasAI ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              AI summary
            </Badge>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{fallbackTitle}</span>
          )}
        </div>
        {body ? (
          <p className="text-sm leading-relaxed text-foreground/85">{body}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/70">No data available for this section.</p>
        )}
      </CardContent>
    </Card>
  );
}
