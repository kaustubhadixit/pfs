"use client";
// Admin patents list — shows ALL patents (published + draft) with search,
// filters (published/draft, jurisdiction), pagination, and row-click to edit.
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatRelative, scoreColor, scoreLabel } from "@/lib/format";

interface PatentRow {
  id: string;
  patentNumber: string;
  jurisdiction: string;
  title: string;
  fieldOfUse: string | null;
  readinessScore: number | null;
  dataSource: string;
  published: boolean;
  updatedAt: string;
  _count?: { inquiries: number };
}

interface PatentsResponse {
  items: PatentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const JURISDICTIONS = ["US", "EP", "IN", "WO", "JP", "KR", "CN", "DE", "GB", "FR", "CA", "AU", "Other"];

export default function AdminPatentsListPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [published, setPublished] = React.useState("all");
  const [jurisdiction, setJurisdiction] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<PatentsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const searchRef = React.useRef(q);
  React.useEffect(() => {
    searchRef.current = q;
    const t = setTimeout(() => {
      setPage(1);
      setRefreshKey((k) => k + 1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  }, [published, jurisdiction]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (searchRef.current) params.set("q", searchRef.current);
    if (published && published !== "all") params.set("published", published);
    if (jurisdiction && jurisdiction !== "all") params.set("jurisdiction", jurisdiction);
    params.set("page", String(page));
    fetch(`/api/admin/patents?${params.toString()}`)
      .then((r) => r.json())
      .then((d: PatentsResponse) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, published, jurisdiction, refreshKey]);

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search title, patent #, assignee…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={published} onValueChange={setPublished}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Published</SelectItem>
            <SelectItem value="false">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={jurisdiction} onValueChange={setJurisdiction}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jurisdictions</SelectItem>
            {JURISDICTIONS.map((j) => (
              <SelectItem key={j} value={j}>{j}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="sm:ml-auto gap-1.5"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/admin/patents/new">
            <Plus className="size-4" /> New patent
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Patent #</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Inquiries</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-12">
                  No patents yet. <Link href="/admin/patents/new" className="text-primary hover:underline">Create your first listing</Link>.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/patents/${p.id}`)}
                >
                  <TableCell className="font-medium max-w-[280px] truncate" title={p.title}>
                    {p.title}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{p.patentNumber}</TableCell>
                  <TableCell><Badge variant="outline">{p.jurisdiction}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{p.fieldOfUse || "—"}</TableCell>
                  <TableCell>
                    {p.published ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.readinessScore != null ? (
                      <span className={`text-sm font-semibold tabular-nums ${scoreColor(p.readinessScore)}`}>
                        {p.readinessScore} <span className="text-xs text-muted-foreground font-normal">· {scoreLabel(p.readinessScore)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unrated</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(p._count?.inquiries ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <MessageSquare className="h-3 w-3 text-primary" />
                        {p._count!.inquiries}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-mono">{p.dataSource}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{formatRelative(p.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem className="text-sm text-muted-foreground px-3">
              Page {page} of {totalPages}
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
