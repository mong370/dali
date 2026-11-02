# Deployment

Dali runs as four Docker containers: MongoDB, the API, nginx serving the app, and optionally Caddy
for automatic HTTPS. Your data stays in folders on the server, outside Docker.

## What you need

- A Linux server with Docker and the Compose plugin
- For a public store: a domain whose DNS points to the server, with ports 80 and 443 open
- An SMTP email account, for password-reset emails

## First deployment

```bash
git clone <your repository> dali && cd dali
./run.sh prod
./run.sh admin
```

`./run.sh prod` asks for your domain, creates `.env` with random secrets, creates the data folders,
then builds and starts everything. `./run.sh admin` creates your admin account from
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`. Save that password somewhere safe, then
remove it from the file.

To try it on your own computer, leave the domain empty and open <http://localhost:8080>.

If you can't create `/file` as your user, create the folders first:

```bash
sudo mkdir -p /file/dali /file/dali-db && sudo chown "$(id -u):$(id -g)" /file/dali /file/dali-db
```

## Day to day

| Task | Command |
| --- | --- |
| Deploy new code | `git pull && ./run.sh update` |
| See what's running | `./run.sh status` |
| Read logs | `./run.sh logs` or `./run.sh logs api` |
| Stop or restart | `./run.sh stop`, `./run.sh restart` |

## Where your data is

| Data | Location |
| --- | --- |
| Database | `/file/dali-db` |
| Uploaded files | `/file/dali` |
| Backups | `/file/dali-backups` |

Docker only mounts these folders, so restarts, rebuilds and `docker compose down -v` leave your data
in place. `DB_DIR` must stay outside `FILES_DIR`, because the files folder is served publicly, and
`./run.sh` refuses to start otherwise.

Uploads are sorted automatically by kind, purpose and date:

```
/file/dali/
  images/      products, categories, banners, general
  videos/      same purposes
  documents/   same purposes
    └─ <purpose>/<year>/<month>/<random id>.<extension>
  legacy/      files from before this structure, served at their original addresses
  .tmp/        uploads in progress, never served
```

Accepted files: JPG, PNG and WebP up to 5 MB, MP4 and WebM up to 100 MB, PDF, DOCX and XLSX up to
20 MB. SVG and HTML are refused because they can carry scripts.

## Backups

```bash
./run.sh backup                 # saves to /file/dali-backups/<date>/
./run.sh restore <that folder>  # replaces the database, after you type RESTORE
```

A backup holds the database and all uploaded files. A backup on the same disk won't survive that disk
failing, so copy backups to another machine. To run one every night at 2 AM, add this with `crontab -e`:

```
0 2 * * * cd /path/to/dali && ./run.sh backup >> /var/log/dali-backup.log 2>&1
```

Old backups are not deleted automatically, so remove them as disk space requires. Test a restore on a
spare machine before you rely on them.

## Settings

Set in `.env` for production. Local development uses `backend/.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `CLIENT_URL` | Yes | Public address, used for security checks and password-reset links |
| `DOMAIN` | For HTTPS | Turns on automatic HTTPS certificates |
| `COOKIE_SECURE` | Yes | `true` behind HTTPS. `false` only for trying it on localhost |
| `JWT_ACCESS_SECRET` | Yes | At least 32 random characters. Production refuses the example value. Changing it signs out access tokens |
| `MONGO_USERNAME`, `MONGO_PASSWORD` | Yes | Set the first time the database starts. Use letters and digits only in the password |
| `SMTP_URL`, `MAIL_FROM` | For email | e.g. `smtps://user:password@smtp.example.com:465`. Without it, password-reset emails aren't sent |
| `FILES_DIR`, `DB_DIR` | No | Default to `/file/dali` and `/file/dali-db` |
| `FILES_UID` | No | User id that owns both folders. Default 1000 |
| `WEB_PORT` | No | Local port for nginx. Default 8080 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | For `./run.sh admin` | Password needs at least 12 characters. Remove it once saved |

To change a setting, edit `.env` and run `./run.sh update`. Changing `MONGO_PASSWORD` here doesn't
change it in an existing database.

## Go-live checklist

**Must do**

- [ ] Set `DOMAIN`, and check the site opens over HTTPS with `COOKIE_SECURE=true`.
- [ ] Set `SMTP_URL`, then test "Forgot password" end to end.
- [ ] Add your real products and photos, and remove the demo data if you loaded it.
- [ ] Have the policy text in `frontend/src/pages/PolicyPage.tsx` reviewed, and confirm it matches how you operate.
- [ ] Confirm the delivery fees in `backend/src/modules/orders/pricing.ts`, and update the policy text if they change.
- [ ] Confirm you can honour the "Delivery Within 48hrs" and "Instant Return" promises on the homepage.
- [ ] Add your social links in `frontend/src/layouts/Footer.tsx`.
- [ ] Schedule backups, copy them off the server, and test a restore.
- [ ] Open only ports 22, 80 and 443 in the server firewall.

**Recommended**

- [ ] Add uptime monitoring on `https://<your domain>/api/v1/categories`.
- [ ] Add error tracking.
- [ ] Keep the server and Docker images updated.

## Limits to know about

- **One API instance.** Rate-limit counters are in memory and files are on one disk. Before running several, move files to object storage and counters to a shared store.
- **Cash on delivery only.** Online payments are on the [roadmap](ROADMAP.md).
- **Search** suits thousands of products, not millions.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Signed out after every page reload | `COOKIE_SECURE=true` needs HTTPS. Use `false` only on localhost |
| Certificate not issued | Check the domain's DNS points to the server and ports 80 and 443 are open. See `./run.sh logs https` |
| `Permission denied` on data folders | The folders must belong to `FILES_UID`. See the `chown` command above |
| API won't start | See `./run.sh logs api`. Invalid settings are named in the message |
| Database refuses the password | The password was set when the database first started. Restore the original in `.env` |
| Password-reset email doesn't arrive | Check `SMTP_URL`, and search for `password-reset` in `./run.sh logs api` |

## Continuous integration

`.github/workflows/ci.yml` runs lint, type checks, tests, the build, a dependency audit, a script check
and Docker image builds on every push to `main` and every pull request. Dependabot proposes dependency
updates.
