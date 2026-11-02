# Contributing

## Setup

You need Node 22 or newer and MongoDB running locally.

```bash
./run.sh dev
```

The first run creates `backend/.env` with random secrets and installs dependencies. To load demo
data into an empty database, run `./run.sh seed`.

## Before opening a pull request

```bash
./run.sh check
```

This runs lint, type checks, tests and the production build, the same as CI.

## Testing safely

- Tests use the `dali_test` database and wipe it. They refuse to run against a database without
  `test` in its name.
- `npm run seed` refuses to run on a database that has products or users. `SEED_RESET=true` overrides
  that and **erases everything**, so never use it on data you care about.
- To try something risky, start a separate copy with its own database:

  ```bash
  cd backend && MONGO_URI=mongodb://127.0.0.1:27017/dali_scratch UPLOAD_DIR=$PWD/uploads-e2e PORT=5001 npx tsx --env-file-if-exists=.env src/server.ts
  cd frontend && VITE_DEV_API_URL=http://localhost:5001 npx vite --port 5174
  ```

## Conventions

- **Money** is whole poisha (৳1 = 100) everywhere except display and form inputs.
- **Validate input** with Zod in routes. Use `parsePatch` for updates, because `.partial()` alone
  still applies `.default()` values and would reset fields that were not sent.
- **Prices** are always calculated on the server. Never trust a price from the client.
- **Admin lists** use the shared parts in `frontend/src/pages/admin/listKit.tsx`.
- **Images** use `SmartImage`, which shows the Dali mark while loading or on failure.
- **Tables** use the `responsive-table` class and `data-label` on cells, so they become cards on phones.
- Keep comments short and explain why, not what.
