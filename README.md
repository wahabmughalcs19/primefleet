# Prime Fleet Solutions

Public website, workshop admin, and API for Prime Fleet Solutions in Rahim Yar Khan.
The database is a local SQLite file, so the project can run without a paid Postgres host.

## Apps

| App | Folder | Local URL |
| --- | --- | --- |
| Website | `frontend` | http://localhost:5173 |
| Admin | `admin` | http://localhost:5174 |
| API | `backend` | http://localhost:5000 |

## Run locally

```sh
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` if you want to change the defaults. The first start creates `data/prime-fleet.db` and an administrator account.

Default sign-in, unless you change `.env`:

- Email: `msajidali7088@gmail.com`
- Password: `PrimeFleet123`

Change `ADMIN_PASSWORD` before anyone else can reach the admin app.

## One-process deploy

A single Node process can serve the website, the admin app at `/admin`, and the API.

```sh
pnpm install
pnpm build
pnpm start
```

Set `PORT`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the host environment. For a host with a temporary disk, also set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

## Deploy on Vercel

The public site is served at `/`, the admin app at `/admin`, and the API at `/api`. Vercel does not keep a SQLite file, so create a free Turso database and paste its URL and token into the Vercel project settings.

1. Create a database at [turso.tech](https://turso.tech) and copy the `libsql://` URL and an auth token.
2. Push this folder to a GitHub repository.
3. Import that repository at [vercel.com/new](https://vercel.com/new). The repo already contains `vercel.json`, so leave the framework, build, and output settings as they are.
4. Add these environment variables, then deploy:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD` (choose a new password; do not keep the local default)
5. Open the Vercel URL. The website is at `/` and staff sign-in is at `/admin`.

The Hobby plan is for personal projects. Check Vercel's terms before using it for a live business.
