# Dali

**Everything in One Basket.** A full-stack (MERN) e-commerce store for selling many types of product,
built for customers in Bangladesh: taka pricing, cash on delivery and district-based delivery fees.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

- **Storefront:** homepage, search with filters, product variants, cart, checkout, order tracking, wishlist, reviews and customer accounts.
- **Admin panel:** dashboard, products, orders, categories, coupons, banners and users, all usable on a phone.
- **Built to run:** one script to start it, Docker for production, automatic HTTPS, and data that survives restarts.

| Folder | Contents |
| --- | --- |
| [`backend/`](backend) | REST API: Node, Express 5, MongoDB, Mongoose, TypeScript |
| [`frontend/`](frontend) | Store and admin panel: React 19, Vite, Tailwind CSS 4, TanStack Query |
| [`docs/`](docs) | Plan, architecture, API, deployment, admin guide, roadmap |

## Quick start

You need Node 22 or newer, and MongoDB running on `localhost:27017`.

```bash
./run.sh dev      # first run creates backend/.env and installs dependencies
./run.sh seed     # in another terminal: loads demo data into an empty database
```

- Store: <http://localhost:5173>
- Admin panel: <http://localhost:5173/admin>, using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `backend/.env`
- API: <http://localhost:5000/api/v1>

Uploaded files go in `/file/dali`. If you can't create that folder, set `UPLOAD_DIR` in `backend/.env`.
Without `SMTP_URL`, password-reset links are written to the API log during development.

## Production

You need Docker with the Compose plugin.

```bash
./run.sh prod     # creates .env with random secrets, asks for your domain, then starts everything
./run.sh admin    # creates your admin account
```

Read the [deployment guide and go-live checklist](docs/DEPLOYMENT.md) first.

## Commands

| Command | What it does |
| --- | --- |
| `./run.sh dev` | Start locally with live reload |
| `./run.sh prod` | Build and start with Docker |
| `./run.sh stop`, `restart`, `status`, `logs` | Manage the Docker containers. Stopping keeps your data |
| `./run.sh update` | Rebuild and restart after changing the code |
| `./run.sh admin` | Create or reset the admin account |
| `./run.sh seed` | Load demo data. Refuses if the store already has data |
| `./run.sh backup` | Save the database and files |
| `./run.sh restore <folder>` | Replace the database with a backup, after confirming |
| `./run.sh check` | Run lint, type checks, tests and the production build |

## Documentation

- [Deployment and go-live checklist](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Admin guide](docs/ADMIN_GUIDE.md)
- [Project plan](docs/PLAN.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

Proprietary. All rights reserved. No license is granted to use, copy or distribute this code.
