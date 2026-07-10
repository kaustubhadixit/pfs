// PatentSale seed — idempotent. Seeds an admin user (with MFA) and a handful of
// demo published patents so the marketplace and admin have realistic data.
// Run with: bunx tsx prisma/seed.ts
//
// NOTE: this script intentionally inlines bcrypt/otplib rather than importing
// src/lib/auth (which pulls in next-auth and requires the Next runtime).
import bcrypt from "bcryptjs";
import { generateSecret, generate } from "otplib";
import { db } from "../src/lib/db";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@patentforsale.in").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PatentSale123!";

const DEMO_PATENTS = [
  {
    patentNumber: "US11234567B2",
    jurisdiction: "US",
    title: "Adaptive resource scheduling for edge-compute mesh networks",
    abstract:
      "A method and system for dynamically scheduling compute workloads across an edge-compute mesh, wherein each node advertises capacity and latency fingerprints and a coordinator selects placement based on a learned cost model that balances energy, latency, and reliability. The approach reduces tail latency for latency-sensitive workloads while improving overall mesh utilization.",
    claims:
      "1. A method for scheduling compute workloads across a plurality of edge nodes, comprising: receiving, at a coordinator, capacity advertisements from each node; computing a placement cost for each candidate node using a learned cost model; and assigning the workload to the node minimizing said cost. 2. The method of claim 1, wherein the cost model is updated online using observed completion times. 3. The method of claim 1, wherein the coordinator is elected via a consensus protocol.",
    description:
      "The present disclosure relates generally to distributed computing, and more particularly to adaptive scheduling of workloads across heterogeneous edge-compute nodes. Existing schedulers assume homogeneous data-center environments and do not account for the variable capacity and intermittent connectivity characteristic of edge meshes...",
    fieldOfUse: "Telecommunications",
    inventors: JSON.stringify(["A. Rao", "M. Iyer"]),
    assignee: "Helix Edge Labs",
    filingDate: new Date("2019-03-14"),
    grantDate: new Date("2022-01-18"),
    legalStatus: "active",
    patentFamilySize: 4,
    summaryAbstract: "Dynamically places compute workloads on edge nodes using a learned cost model that balances energy, latency, and reliability.",
    summaryClaims: "Protects a coordinator-based scheduling method with online cost-model updates and consensus-based coordinator election.",
    summaryField: "Edge computing, 5G infrastructure, IoT gateways, and latency-sensitive enterprise workloads.",
    readinessScore: 82,
    claimBreadth: "broad",
    remainingLifeYears: 13.2,
    forwardCitations: 47,
    marketSizeProxy: "large",
    litigationHistory: "none",
  },
  {
    patentNumber: "EP3876543B1",
    jurisdiction: "EP",
    title: "Low-power neural inference accelerator for wearable biosensors",
    abstract:
      "An integrated circuit architecture for on-device neural inference within wearable biosensors, employing quantized weight representations and a sparsity-aware dataflow to achieve sub-milliwatt operation while maintaining diagnostic-grade accuracy for arrhythmia detection from single-lead ECG signals.",
    claims:
      "1. A neural inference accelerator integrated within a wearable biosensor, comprising: a quantized weight memory; a sparsity-aware compute array; and an output post-processor configured to produce a diagnostic classification. 2. The accelerator of claim 1, wherein weights are stored in a 4-bit format. 3. The accelerator of claim 1, wherein the sparsity-aware compute array skips multiply-accumulate operations for zero-valued activations.",
    description:
      "Wearable biosensors are constrained by stringent power budgets yet increasingly demand on-device intelligence for real-time anomaly detection. Offloading inference to a companion phone introduces latency and privacy concerns...",
    fieldOfUse: "Medical Devices",
    inventors: JSON.stringify(["S. Nair", "K. Deshpande", "R. Banerjee"]),
    assignee: "CardioSense Technologies",
    filingDate: new Date("2018-07-02"),
    grantDate: new Date("2021-05-11"),
    legalStatus: "active",
    patentFamilySize: 6,
    summaryAbstract: "Runs neural inference on a wearable using 4-bit weights and sparsity-aware compute, hitting sub-milliwatt power for ECG arrhythmia detection.",
    summaryClaims: "Covers the quantized-weight memory, sparsity-aware compute array, and post-processor producing a diagnostic classification.",
    summaryField: "Wearable health monitors, cardiac diagnostics, and low-power AI silicon.",
    readinessScore: 74,
    claimBreadth: "medium",
    remainingLifeYears: 11.0,
    forwardCitations: 23,
    marketSizeProxy: "large",
    litigationHistory: "low",
  },
  {
    patentNumber: "IN3456789A1",
    jurisdiction: "IN",
    title: "Modular photovoltaic mounting system for asymmetric rooftops",
    abstract:
      "A modular mounting system for photovoltaic panels adapted to asymmetric and irregular rooftops common in dense urban environments, featuring a ballasted triangular rail that conforms to roof geometry without penetrating the waterproofing membrane, and a tool-less clamp for rapid panel installation.",
    claims:
      "1. A modular photovoltaic mounting system comprising: a ballasted triangular rail adjustable to a roof's geometry; a tool-less clamp affixing a photovoltaic panel to said rail; and a load-distribution pad protecting a roof waterproofing membrane. 2. The system of claim 1, wherein the rail is adjustable along two axes.",
    description:
      "Rooftop solar deployment in dense urban environments is constrained by irregular roof geometries, shared ownership structures, and the risk of waterproofing damage...",
    fieldOfUse: "Cleantech",
    inventors: JSON.stringify(["P. Sharma"]),
    assignee: "SunLatch Systems Pvt Ltd",
    filingDate: new Date("2020-11-21"),
    grantDate: new Date("2023-09-05"),
    legalStatus: "active",
    patentFamilySize: 2,
    summaryAbstract: "A ballasted triangular rail + tool-less clamp lets solar panels mount on irregular urban rooftops without piercing waterproofing.",
    summaryClaims: "Protects the adjustable ballasted rail, the tool-less clamp, and the load-distribution pad as a combined system.",
    summaryField: "Urban residential and commercial solar installation, especially in dense South Asian cities.",
    readinessScore: 61,
    claimBreadth: "narrow",
    remainingLifeYears: 17.5,
    forwardCitations: 5,
    marketSizeProxy: "medium",
    litigationHistory: "none",
  },
  {
    patentNumber: "US10987654B1",
    jurisdiction: "US",
    title: "Cryptographic key rotation for multi-party data pipelines",
    abstract:
      "A protocol for rotating cryptographic keys across multiple mutually-distrusting pipeline stages without halting data flow, using a commit-reveal scheme over a verifiable log that guarantees forward secrecy and auditable key lineage while permitting concurrent stage execution.",
    claims:
      "1. A method for rotating cryptographic keys across a plurality of pipeline stages, comprising: publishing a commit for a new key to a verifiable log; upon a quorum of stages acknowledging, revealing the new key; and atomically switching each stage to encrypt with the new key. 2. The method of claim 1, wherein the verifiable log is a tamper-evident append-only structure.",
    description:
      "Multi-party data pipelines, common in regulated industries, require periodic key rotation to satisfy forward-secrecy mandates. Existing approaches either halt the pipeline or risk inconsistency...",
    fieldOfUse: "Cybersecurity",
    inventors: JSON.stringify(["L. Mehta", "D. Kulkarni"]),
    assignee: "Cipherline Inc",
    filingDate: new Date("2017-05-09"),
    grantDate: new Date("2020-04-14"),
    legalStatus: "active",
    patentFamilySize: 3,
    summaryAbstract: "Rotates crypto keys across distrustful pipeline stages with no downtime, using a commit-reveal scheme over a verifiable log.",
    summaryClaims: "Covers the commit-reveal rotation method and the tamper-evident append-only log for key lineage.",
    summaryField: "Regulated data pipelines, fintech, healthcare data exchange, and zero-trust architectures.",
    readinessScore: 88,
    claimBreadth: "broad",
    remainingLifeYears: 10.1,
    forwardCitations: 62,
    marketSizeProxy: "very-large",
    litigationHistory: "moderate",
  },
  {
    patentNumber: "WO2021154321A1",
    jurisdiction: "WO",
    title: "Biodegradable polymer blend for compostable food packaging",
    abstract:
      "A biodegradable polymer blend derived from agricultural waste starch and a compatibilizing agent, exhibiting oxygen-barrier performance comparable to conventional multilayer films while achieving complete composting within 90 days under industrial composting conditions.",
    claims:
      "1. A biodegradable polymer blend comprising: 60-80% by weight agricultural waste starch; 10-25% of a compatibilizing agent; and 5-15% of a plasticizer. 2. The blend of claim 1, formed into a film of thickness 20-80 microns exhibiting an oxygen transmission rate below 50 cc/m²/day.",
    description:
      "Single-use food packaging is a major contributor to plastic pollution. Existing biodegradable alternatives suffer from poor barrier performance or require industrial infrastructure not widely available...",
    fieldOfUse: "Materials",
    inventors: JSON.stringify(["F. D'Souza", "H. Patel", "G. Reddy"]),
    assignee: "GreenWrap Materials",
    filingDate: new Date("2020-02-27"),
    grantDate: new Date("2021-08-02"),
    legalStatus: "active",
    patentFamilySize: 5,
    summaryAbstract: "A starch-plus-compatibilizer blend matches conventional film's oxygen barrier yet composts fully in 90 days.",
    summaryClaims: "Protects the specific blend composition (starch %, compatibilizer, plasticizer) and the film's barrier performance range.",
    summaryField: "Sustainable food packaging, CPG brands targeting eco-certifications, and agricultural-waste valorization.",
    readinessScore: 69,
    claimBreadth: "medium",
    remainingLifeYears: 16.3,
    forwardCitations: 12,
    marketSizeProxy: "large",
    litigationHistory: "none",
  },
  {
    patentNumber: "US11445566B2",
    jurisdiction: "US",
    title: "Federated learning framework for cross-hospital diagnostic models",
    abstract:
      "A federated learning framework enabling multiple hospitals to jointly train diagnostic models on private patient data without centralizing it, featuring differential-privacy noise calibration per institution and a contribution-attribution mechanism for fair revenue sharing among participants.",
    claims:
      "1. A federated learning method for training a diagnostic model across a plurality of hospitals, comprising: at each hospital, computing a model update on local private data; applying institution-specific differential-privacy noise; transmitting the noisy update to a coordinator; and aggregating updates into a global model. 2. The method of claim 1, further comprising attributing each update's contribution to a participant for revenue sharing.",
    description:
      "Diagnostic AI models benefit from diverse training data spanning many hospitals, yet privacy regulations often prohibit centralizing patient data...",
    fieldOfUse: "AI/ML",
    inventors: JSON.stringify(["T. Krishnan", "V. Subramanian"]),
    assignee: "FedMed Analytics",
    filingDate: new Date("2018-12-03"),
    grantDate: new Date("2022-11-22"),
    legalStatus: "active",
    patentFamilySize: 7,
    summaryAbstract: "Lets hospitals jointly train diagnostic AI on private data via federated learning, with per-institution privacy noise and revenue-share attribution.",
    summaryClaims: "Covers the per-institution DP-noise update flow, aggregation, and the contribution-attribution mechanism for revenue sharing.",
    summaryField: "Healthcare AI consortia, multi-site clinical research, and privacy-preserving ML platforms.",
    readinessScore: 77,
    claimBreadth: "broad",
    remainingLifeYears: 12.4,
    forwardCitations: 34,
    marketSizeProxy: "very-large",
    litigationHistory: "low",
  },
];

async function main() {
  console.log("Seeding PatentSale…");

  // 1. Admin user (idempotent). Inlined here to avoid loading next-auth in tsx.
  const secret = process.env.ADMIN_MFA_SECRET || generateSecret();
  let admin = await db.adminUser.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    admin = await db.adminUser.create({
      data: {
        email: ADMIN_EMAIL,
        name: "PatentSale Admin",
        passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
        mfaSecret: secret,
        mfaEnabled: true,
        role: "super_admin",
      },
    });
  }
  const currentOtp = await generate({ secret: admin.mfaSecret });
  console.log(`  admin ready: ${admin.email}`);
  console.log(`  admin password (dev): ${ADMIN_PASSWORD}`);
  console.log(`  admin MFA secret: ${admin.mfaSecret}`);
  console.log(`  current OTP (dev): ${currentOtp}`);

  // 2. Demo patents (idempotent via upsert on unique patentNumber+jurisdiction)
  for (const p of DEMO_PATENTS) {
    await db.patent.upsert({
      where: { patentNumber_jurisdiction: { patentNumber: p.patentNumber, jurisdiction: p.jurisdiction } },
      update: {
        ...p,
        filingDate: p.filingDate,
        grantDate: p.grantDate,
        dataSource: "admin-manual",
        recordLocked: false,
        published: true,
        publishedAt: p.grantDate,
        scoreSource: "manual",
      },
      create: {
        ...p,
        filingDate: p.filingDate,
        grantDate: p.grantDate,
        dataSource: "admin-manual",
        recordLocked: false,
        published: true,
        publishedAt: p.grantDate,
        scoreSource: "manual",
      },
    });
  }
  console.log(`  ${DEMO_PATENTS.length} demo patents upserted (published=true)`);

  // 3. A sample lead for the admin leads dashboard
  const existingLead = await db.lead.findFirst({ where: { email: "priya.demo@example.com" } });
  if (!existingLead) {
    await db.lead.create({
      data: {
        name: "Priya Demo",
        email: "priya.demo@example.com",
        phone: "+91 98765 43210",
        patentNumber: "US10998877B1",
        status: "new",
        consent: true,
        ageConfirmed: true,
        consentTextSnapshot: "(seeded lead)",
      },
    });
    console.log("  sample lead created");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
