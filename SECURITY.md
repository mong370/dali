# Security

Please do not report security problems in a public issue. Use GitHub's private
[vulnerability reporting](../../security/advisories/new) on this repository, or contact the
repository owner directly. Include what you found and how to reproduce it.

## Keeping a deployment safe

- Never commit `.env` or `backend/.env`. Only the `.env.example` files are tracked.
- Serve the store over HTTPS with `COOKIE_SECURE=true`.
- Keep `DB_DIR` outside `FILES_DIR`, which is served publicly.
- Take regular backups with `./run.sh backup` and store copies on another machine.

See [Deployment](docs/DEPLOYMENT.md) and the security section of [Architecture](docs/ARCHITECTURE.md).
