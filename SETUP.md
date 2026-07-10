# PatentSale — Local Development Setup (VS Code)

Quick start to run PatentSale on your PC.

## Prerequisites

Install these once:

1. **Node.js 20+** — <https://nodejs.org> (LTS recommended)
2. **Bun** (package manager) — <https://bun.sh>
   - Mac/Linux: `curl -fsSL https://bun.sh/install | bash`
   - Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
   - (Alternatively, you can use `npm` or `pnpm` instead of `bun` — just swap `bun` for `npm`/`pnpm` in the commands below.)
3. **VS Code** — <https://code.visualstudio.com>
4. **Git** — <https://git-scm.com>

Recommended VS Code extensions:
- ESLint
- Tailwind CSS IntelliSense
- Prisma
- PostCSS syntax

---

## Setup commands (run once after cloning)

```bash
# 1. Clone the repo
git clone https://github.com/kaustubhadixit/pfs.git
cd pfs

# 2. Install dependencies
bun install

# 3. Create your local .env from the template
cp .env.example .env

# 4. (Optional) Generate a strong NEXTAUTH_SECRET and paste into .env
#    Mac/Linux:  openssl rand -base64 32
#    Windows:    use any random 32+ char string
#    Then edit .env and replace NEXTAUTH_SECRET=change-me-...

# 5. Create the database schema
bun run db:push

# 6. Seed demo data (admin user + 6 sample patents + 1 lead)
#    This prints the admin credentials + current MFA code (dev only).
bunx tsx prisma/seed.ts
```

---

## Run the app

```bash
bun run dev
```

Open <http://localhost:3000> in your browser.

- **Public marketplace:** <http://localhost:3000/patents>
- **Admin panel:** <http://localhost:3000/admin/login>
  - Email: `admin@patentforsale.in`
  - Password: `PatentSale123!`
  - MFA code: shown on the login page in dev (yellow "DEV ONLY" box, rotates every 30s)

---

## Common commands

| Command | What it does |
|---|---|
| `bun run dev` | Start dev server (http://localhost:3000) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema changes to the local SQLite DB |
| `bun run db:generate` | Regenerate Prisma Client (after schema changes) |
| `bunx tsx prisma/seed.ts` | Re-seed demo data (idempotent) |

---

## Troubleshooting

**Port 3000 already in use?**
```bash
# Mac/Linux
lsof -i :3000 | xargs kill -9
# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

**Database needs a reset?**
```bash
rm db/custom.db        # delete the SQLite file
bun run db:push        # recreate schema
bunx tsx prisma/seed.ts  # reseed
```

**Prisma Client out of sync?**
```bash
bun run db:generate
```

---

## Notes

- The dev server uses **webpack** mode (`--webpack` flag) for stable compilation.
- The local database is SQLite (`db/custom.db`). For production, the schema is Neon-Postgres-compatible — see `ARCHITECTURE.md`.
- `.env` is gitignored — never commit real secrets. `.env.example` is tracked as a template.
- The admin panel is not linked from public navigation — reach it at `/admin/login`.
