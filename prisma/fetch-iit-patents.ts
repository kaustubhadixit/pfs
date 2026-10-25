// fetch-iit-patents.ts — fetches REAL IIT patents from Google Patents (free, no API key)
// and saves them to /tmp/iit_real_patents.json for seeding.
//
// Pipeline:
//   1. Google Patents XHR search API → patent numbers + titles + assignees + dates
//   2. Google Patents HTML page per patent → abstract + claims + description + app number
//
// Run: npx tsx prisma/fetch-iit-patents.ts
// Uses Node.js 18+ built-in fetch (no node-fetch needed).

const SEARCH_URL = "https://patents.google.com/xhr/query";
const PATENT_PAGE = "https://patents.google.com/patent/";

interface SearchResult {
  publication_number: string;
  title: string;
  assignee: string;
  inventor: string;
  filing_date: string;
  publication_date: string;
  grant_date: string;
}

interface FullPatent extends SearchResult {
  abstract: string;
  claims: string;
  description: string;
  application_number: string;
  legal_status: string;
}

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchPatents(query: string, page: number, num: number): Promise<SearchResult[]> {
  const url = `${SEARCH_URL}?url=${encodeURIComponent(`q=${encodeURIComponent(query)}&num=${num}&page=${page}`)}&exp=`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data: any = await res.json();
  const results = data?.results?.cluster?.[0]?.result || [];
  return results.map((r: any) => {
    const p = r.patent || {};
    return {
      publication_number: p.publication_number || "",
      title: (p.title || "").trim(),
      assignee: (p.assignee || "").trim(),
      inventor: (p.inventor || "").trim(),
      filing_date: p.filing_date || "",
      publication_date: p.publication_date || "",
      grant_date: p.grant_date || "",
    };
  }).filter((p: SearchResult) => p.publication_number && p.assignee.toLowerCase().includes("indian institute"));
}

async function fetchPatentDetails(patentNumber: string): Promise<{ abstract: string; claims: string; description: string; application_number: string; legal_status: string }> {
  const url = `${PATENT_PAGE}${patentNumber}/en`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Page fetch failed: ${res.status}`);
  const html = await res.text();

  // Extract meta tags
  const metas: Record<string, string> = {};
  const metaRe = /<meta\s+name="([^"]+)"\s+content="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    metas[m[1]] = m[2].trim();
  }

  // Extract abstract
  let abstract = "";
  const absMatch = html.match(/<abstract[^>]*>([\s\S]*?)<\/abstract>/);
  if (absMatch) {
    abstract = absMatch[1].replace(/<[^>]+>/g, "").trim();
  }
  if (!abstract) abstract = metas["DC.description"] || "";

  // Extract claims
  let claims = "";
  const claimsMatch = html.match(/<section[^>]*itemprop="claims"[^>]*>([\s\S]*?)<\/section>/)
    || html.match(/<section[^>]*claims[^>]*>([\s\S]*?)<\/section>/);
  if (claimsMatch) {
    claims = claimsMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  // Extract description (first 2000 chars)
  let description = "";
  const descMatch = html.match(/<section[^>]*description[^>]*>([\s\S]*?)<\/section>/)
    || html.match(/<section[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/section>/);
  if (descMatch) {
    description = descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
  }

  return {
    abstract: abstract.slice(0, 1000),
    claims: claims.slice(0, 3000),
    description: description.slice(0, 3000),
    application_number: metas["citation_patent_application_number"] || "",
    legal_status: "active",
  };
}

async function main() {
  const query = '"Indian Institute of Technology"';
  const allPatents: FullPatent[] = [];
  const seen = new Set<string>();

  console.log("Searching Google Patents for IIT patents…");

  // Fetch multiple search pages (100 per page)
  for (let page = 0; page < 5 && allPatents.length < 120; page++) {
    console.log(`  Fetching search page ${page + 1}…`);
    const results = await searchPatents(query, page, 100);
    console.log(`    Got ${results.length} results`);

    for (const r of results) {
      if (seen.has(r.publication_number)) continue;
      if (!r.publication_number.startsWith("US")) continue; // focus on US granted patents
      seen.add(r.publication_number);
      allPatents.push({ ...r, abstract: "", claims: "", description: "", application_number: "", legal_status: "active" });
      if (allPatents.length >= 120) break;
    }

    if (allPatents.length >= 120) break;
    await sleep(1000);
  }

  console.log(`\nFound ${allPatents.length} unique IIT patents. Fetching details…`);

  // Fetch full details for each patent (limit to 100 to be safe)
  const limit = Math.min(100, allPatents.length);
  for (let i = 0; i < limit; i++) {
    const p = allPatents[i];
    try {
      console.log(`  [${i + 1}/${limit}] ${p.publication_number}…`);
      const details = await fetchPatentDetails(p.publication_number);
      p.abstract = details.abstract;
      p.claims = details.claims;
      p.description = details.description;
      p.application_number = details.application_number;
      p.legal_status = details.legal_status;
    } catch (e) {
      console.log(`    ERROR: ${(e as Error).message}`);
    }
    // Be polite to Google
    if (i % 10 === 9) await sleep(2000);
    else await sleep(500);
  }

  // Save
  const fs = await import("fs");
  fs.writeFileSync("/tmp/iit_real_patents.json", JSON.stringify(allPatents, null, 2));
  console.log(`\nSaved ${allPatents.length} patents to /tmp/iit_real_patents.json`);
  console.log(`Patents with abstracts: ${allPatents.filter((p) => p.abstract.length > 50).length}`);
  console.log(`Patents with claims: ${allPatents.filter((p) => p.claims.length > 50).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
