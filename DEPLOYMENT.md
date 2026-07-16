# Deployment — Netlify + Neon Postgres

The app is a Vite/React front end plus three Netlify Functions that read/write a
Neon Postgres database. This guide covers the one-time setup. Steps that require
your logged-in account (creating the database, the site, and setting secrets)
must be done by you in the browser — they can't be automated.

## Architecture at a glance

```
Candidate finishes interview
        │  POST /api/save-session
        ▼
Netlify Function ──────────► Neon Postgres  (sessions table)
        ▲  GET /api/sessions        │
        │  GET /api/session?id=…     │
Admin screen (#/admin) ◄────────────┘
```

- `netlify/functions/save-session.js` — **public**, stores a completed session.
- `netlify/functions/list-sessions.js` → `/api/sessions` — **admin**, lists sessions.
- `netlify/functions/get-session.js` → `/api/session` — **admin**, one full session + report HTML.
- Admin endpoints require the `ADMIN_TOKEN` secret, sent as `Authorization: Bearer <token>`.

## 1. Create the Neon database

1. Go to <https://app.netlify.com/teams/msandovalesc/projects> and open (or create) the site
   for this repo — see step 2 first if the site doesn't exist yet.
2. In the site, go to **Integrations** (or **Extensions**) → search **Neon** → **Enable**.
   This provisions a Neon Postgres database and automatically sets the `DATABASE_URL`
   (a.k.a. `NETLIFY_DATABASE_URL`) environment variable for you.
   - Alternatively, create a free database directly at <https://neon.tech> and copy its
     connection string into a `DATABASE_URL` env var yourself (step 3).
3. Open the **Neon SQL editor** and run the contents of [`db/schema.sql`](db/schema.sql)
   once to create the `sessions` table.

> If Neon set the variable as `NETLIFY_DATABASE_URL` instead of `DATABASE_URL`, either
> rename it to `DATABASE_URL`, or add a second env var `DATABASE_URL` with the same value.
> The functions read `process.env.DATABASE_URL`.

## 2. Create the Netlify site from the repo

1. <https://app.netlify.com/teams/msandovalesc/projects> → **Add new project** →
   **Import an existing project** → **GitHub** → pick **msandovalesc/InterviewReadyProgram**.
2. Netlify auto-detects the settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. Click **Deploy**.

## 3. Set environment variables

Site → **Site configuration** → **Environment variables**. Add:

| Key            | Value                                              | Notes                                  |
| -------------- | -------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL` | `postgresql://…` (from Neon)                       | Set automatically if you used step 1.2 |
| `ADMIN_TOKEN`  | a strong password you choose                       | Protects the admin endpoints           |

After adding these, trigger a redeploy (**Deploys → Trigger deploy → Deploy site**) so
the functions pick them up.

## 4. Use it

- **Candidate / interview app:** `https://<your-site>.netlify.app/`
  Completed interviews are saved automatically.
- **Admin — saved sessions:** `https://<your-site>.netlify.app/#/admin`
  Enter your `ADMIN_TOKEN` to list every stored session and **Open** or **Download**
  each report (the download is a self-contained `.html` file — open it and use the
  browser's *Print → Save as PDF*, exactly like the on-screen report).

## Notes & troubleshooting

- **Nothing is saved:** open the site, finish an interview, then check the browser
  devtools **Network** tab for the `POST /api/save-session` call. A 500 usually means
  `DATABASE_URL` is missing or the schema wasn't run.
- **Admin says "ADMIN_TOKEN is not configured":** set `ADMIN_TOKEN` (step 3) and redeploy.
- **Admin says "Unauthorized":** the password entered doesn't match `ADMIN_TOKEN`.
- **`/api/*` returns the app HTML instead of JSON:** confirm `netlify.toml` deployed and
  the functions are listed under the site's **Functions** tab.
- **Existing Power Automate email flow** still works independently — set `FLOW_URL` in
  `src/constants.js` if you want the automatic PDF email in addition to DB storage.
