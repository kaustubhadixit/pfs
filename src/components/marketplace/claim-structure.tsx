"use client";
// ClaimStructure — interactive claim-dependency tree, parsed from the patent's
// raw claims text. Splits claims on numbered boundaries (^\d+\.), detects
// dependencies via "of claim N" / "according to claim N" patterns, and renders
// an expandable tree with framer-motion height animation. Falls back to the
// raw text if parsing yields nothing usable.
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, FileText, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClaimNode {
  number: number;
  text: string;
  parent: number | null;
  children: ClaimNode[];
}

const CLAIM_SPLIT_RE = /(?:^|\s)(?=\d+\.\s)/g;
const DEPS_RES: RegExp[] = [
  /of claim\s+(\d+)/i,
  /according to claim\s+(\d+)/i,
  /claim\s+(\d+)/i,
];

/**
 * Parse raw claims text into a list of { number, text, parent }.
 * Handles both single-block text ("1. ... 2. ... 3. ...") and multi-paragraph.
 */
function parseClaims(raw: string): { number: number; text: string; parent: number | null }[] {
  if (!raw || !raw.trim()) return [];
  const cleaned = raw.replace(/\s+/g, " ").trim();
  // Split before each "N. " boundary where N is a positive integer.
  const parts = cleaned.split(CLAIM_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  const claims: { number: number; text: string; parent: number | null }[] = [];
  for (const part of parts) {
    const m = part.match(/^(\d+)\.\s+(.*)$/);
    if (!m) continue;
    const number = parseInt(m[1], 10);
    const text = m[2].trim();
    if (!text) continue;
    // Detect dependency.
    let parent: number | null = null;
    for (const re of DEPS_RES) {
      const dm = text.match(re);
      if (dm) {
        const p = parseInt(dm[1], 10);
        if (!Number.isNaN(p) && p !== number && p < number) {
          parent = p;
          break;
        }
      }
    }
    claims.push({ number, text, parent });
  }
  return claims;
}

/** Build a forest of trees from the flat claim list. */
function buildForest(claims: { number: number; text: string; parent: number | null }[]): ClaimNode[] {
  const byNumber = new Map<number, ClaimNode>();
  claims.forEach((c) => byNumber.set(c.number, { ...c, children: [] }));
  const roots: ClaimNode[] = [];
  for (const c of claims) {
    const node = byNumber.get(c.number)!;
    if (c.parent != null && byNumber.has(c.parent)) {
      byNumber.get(c.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function ClaimTreeView({
  node,
  depth,
  expandedSet,
  toggle,
}: {
  node: ClaimNode;
  depth: number;
  expandedSet: Set<number>;
  toggle: (n: number) => void;
}) {
  const reduce = useReducedMotion();
  const hasChildren = node.children.length > 0;
  const expanded = expandedSet.has(node.number);
  const preview = node.text.length > 120 ? node.text.slice(0, 120).trimEnd() + "…" : node.text;

  return (
    <div className="relative">
      <div
        className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggle(node.number)}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={expanded ? "Collapse claim" : "Expand claim"}
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          </span>
        )}

        <Badge
          variant={node.parent == null ? "default" : "secondary"}
          className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums"
        >
          {node.number}
        </Badge>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-foreground/90">
            <span className="text-muted-foreground">{preview}</span>
          </p>
          {node.parent != null ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
              <GitBranch className="h-2.5 w-2.5" />
              depends on claim {node.parent}
            </p>
          ) : null}
        </div>
      </div>

      {hasChildren ? (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="children"
              initial={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              {node.children
                .sort((a, b) => a.number - b.number)
                .map((child) => (
                  <ClaimTreeView
                    key={child.number}
                    node={child}
                    depth={depth + 1}
                    expandedSet={expandedSet}
                    toggle={toggle}
                  />
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}
    </div>
  );
}

export function ClaimStructure({ claims }: { claims: string | null | undefined }) {
  const parsed = React.useMemo(() => (claims ? parseClaims(claims) : []), [claims]);
  const forest = React.useMemo(() => buildForest(parsed), [parsed]);

  // Default: expand all top-level (independent) claims; collapse dependents.
  const [expandedSet, setExpandedSet] = React.useState<Set<number>>(() => {
    const s = new Set<number>();
    forest.forEach((r) => s.add(r.number));
    return s;
  });

  // Reset when claims change.
  React.useEffect(() => {
    const s = new Set<number>();
    forest.forEach((r) => s.add(r.number));
    setExpandedSet(s);
  }, [forest]);

  const toggle = (n: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const expandAll = () => {
    const s = new Set<number>();
    parsed.forEach((c) => s.add(c.number));
    setExpandedSet(s);
  };
  const collapseAll = () => setExpandedSet(new Set());

  if (!claims || !claims.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
        No claims text available for this listing.
      </div>
    );
  }

  if (parsed.length === 0) {
    // Fallback: render the raw text in a scrollable area.
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Claims could not be parsed into a tree. Showing the raw text instead.
        </p>
        <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground/80">
          {claims}
        </pre>
      </div>
    );
  }

  const independentCount = parsed.filter((c) => c.parent == null).length;
  const dependentCount = parsed.length - independentCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <GitBranch className="h-3 w-3" />
            {independentCount} independent
          </Badge>
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            {dependentCount} dependent
          </Badge>
          <Badge variant="outline">{parsed.length} total</Badge>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
            Expand all
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
            Collapse all
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-card/40 p-2">
        {forest
          .sort((a, b) => a.number - b.number)
          .map((node) => (
            <ClaimTreeView
              key={node.number}
              node={node}
              depth={0}
              expandedSet={expandedSet}
              toggle={toggle}
            />
          ))}
      </div>
    </div>
  );
}
