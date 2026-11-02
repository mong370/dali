#!/usr/bin/env bash
# Runs the Dali store. See ./run.sh help.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
ENV_FILE="${DALI_ENV_FILE:-.env}"
PROJECT="${DALI_PROJECT:-dali}"

say() { printf '\033[1;35m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWarning:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required. $2"; }
random_hex() { openssl rand -hex "$1" 2>/dev/null || node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }
env_value() { [ -f "$2" ] && sed -n "s/^$1=//p" "$2" | tail -1 || true; }
port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

make_folder() {
  mkdir -p "$1" 2>/dev/null || die "Cannot create $1. Run: sudo mkdir -p $1 && sudo chown $(id -u):$(id -g) $1"
  [ -w "$1" ] || die "Cannot write to $1. Run: sudo chown -R $(id -u):$(id -g) $1"
}

compose() {
  local profile=()
  [ -n "$(env_value DOMAIN "$ENV_FILE")" ] && profile=(--profile https)
  docker compose --env-file "$ENV_FILE" -p "$PROJECT" "${profile[@]}" "$@"
}

prod_running() {
  [ -f "$ENV_FILE" ] && command -v docker >/dev/null 2>&1 && [ -n "$(compose ps -q --status running mongo 2>/dev/null)" ]
}

# ---------- local development ----------

prepare_dev() {
  need node 'Install Node 22 or newer.'
  need npm 'It comes with Node.'
  [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || die "Node 22 or newer is required, found $(node -v)."

  if [ ! -f backend/.env ]; then
    say 'Creating backend/.env with new random secrets'
    cp backend/.env.example backend/.env
    sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(random_hex 48)|; s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=Dali-$(random_hex 9)|" backend/.env
    chmod 600 backend/.env
  fi
  make_folder "$(env_value UPLOAD_DIR backend/.env)"

  if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
    say 'Installing dependencies'
    npm ci
  fi
}

cmd_dev() {
  prepare_dev
  port_open 27017 || die 'MongoDB is not running on port 27017. Try: sudo systemctl start mongod'
  port_open 5000 && die 'Port 5000 is already in use. Is the store already running?'
  port_open 5173 && die 'Port 5173 is already in use. Is the store already running?'
  say 'Starting the store at http://localhost:5173 (API on port 5000). Press Ctrl+C to stop.'
  exec npm run dev
}

# ---------- production with Docker ----------

prepare_prod() {
  need docker 'Install Docker with the Compose plugin.'
  docker compose version >/dev/null 2>&1 || die 'The Docker Compose plugin is required.'

  if [ ! -f "$ENV_FILE" ]; then
    local domain='' client_url='http://localhost:8080' secure=false
    if [ -t 0 ]; then
      read -r -p 'Domain name for HTTPS, e.g. shop.example.com (leave empty to try it on localhost): ' domain
    fi
    if [ -n "$domain" ]; then client_url="https://$domain"; secure=true; fi
    say "Creating $ENV_FILE with new random secrets"
    sed -e "s|^CLIENT_URL=.*|CLIENT_URL=$client_url|" \
      -e "s|^DOMAIN=.*|DOMAIN=$domain|" \
      -e "s|^COOKIE_SECURE=.*|COOKIE_SECURE=$secure|" \
      -e "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(random_hex 48)|" \
      -e "s|^MONGO_PASSWORD=.*|MONGO_PASSWORD=$(random_hex 24)|" \
      -e "s|^FILES_UID=.*|FILES_UID=$(id -u)|" \
      -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$(random_hex 12)|" \
      .env.example >"$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi

  local files db
  files="$(env_value FILES_DIR "$ENV_FILE")"; db="$(env_value DB_DIR "$ENV_FILE")"
  make_folder "${files:-/file/dali}"
  make_folder "${db:-/file/dali-db}"
  case "${db:-/file/dali-db}/" in "${files:-/file/dali}/"*) die 'DB_DIR must not be inside FILES_DIR, which is served publicly.' ;; esac

  [ -n "$(env_value SMTP_URL "$ENV_FILE")" ] || warn 'SMTP_URL is not set, so password-reset emails will not be sent.'
  [ "$(env_value COOKIE_SECURE "$ENV_FILE")" = true ] || warn 'COOKIE_SECURE is false. That is only safe for trying it on localhost.'
}

wait_until_ready() {
  local port
  port="$(env_value WEB_PORT "$ENV_FILE")"; port="${port:-8080}"
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:$port/api/v1/categories" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  compose ps
  die "The store did not become ready. See: ./run.sh logs"
}

cmd_prod() {
  prepare_prod
  say 'Building and starting containers'
  compose up -d --build
  say 'Waiting for the store to be ready'
  wait_until_ready
  say "The store is running at $(env_value CLIENT_URL "$ENV_FILE")"
  echo "    First time? Create your admin account with: ./run.sh admin"
}

# ---------- works with whichever is running ----------

cmd_admin() {
  if prod_running; then
    compose run --rm -T api npm run create-admin:prod
    echo "Sign in with SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD from $ENV_FILE. Save the password, then remove it from that file."
  else
    prepare_dev
    npm run create-admin -w backend
  fi
}

cmd_seed() {
  if prod_running; then
    compose run --rm -T -e ALLOW_SEED=true api npm run seed:prod
  else
    prepare_dev
    npm run seed
  fi
}

cmd_backup() {
  local stamp target
  stamp="$(date +%Y%m%d-%H%M%S)"
  target="${BACKUP_DIR:-/file/dali-backups}/$stamp"
  make_folder "$target"
  say "Backing up to $target"
  if prod_running; then
    # shellcheck disable=SC2016 # expanded inside the container
    compose exec -T mongo sh -c 'mongodump --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db dali --archive --gzip' >"$target/database.archive.gz"
    local files; files="$(env_value FILES_DIR "$ENV_FILE")"; files="${files:-/file/dali}"
  else
    need mongodump 'Install the MongoDB database tools.'
    local uri="${MONGO_URI:-$(env_value MONGO_URI backend/.env)}"
    mongodump --quiet --uri="$uri" --archive --gzip >"$target/database.archive.gz"
    local files="${UPLOAD_DIR:-$(env_value UPLOAD_DIR backend/.env)}"
  fi
  [ -s "$target/database.archive.gz" ] || die 'The database backup is empty.'
  if [ -d "$files" ]; then tar -czf "$target/files.tar.gz" --exclude=./.tmp -C "$files" .; fi
  say "Backup complete: $(du -sh "$target" | cut -f1). Copy it to another machine to be safe."
}

cmd_restore() {
  local source="${1:-}"
  [ -n "$source" ] && [ -f "$source/database.archive.gz" ] || die 'Usage: ./run.sh restore <backup folder>'
  echo "This REPLACES the current database with the backup in $source, and adds its files."
  local answer="${DALI_RESTORE_CONFIRM:-}"
  [ -n "$answer" ] || read -r -p 'Type RESTORE to continue: ' answer
  [ "$answer" = RESTORE ] || die 'Cancelled.'
  if prod_running; then
    # shellcheck disable=SC2016 # expanded inside the container
    compose exec -T mongo sh -c 'mongorestore --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --drop --archive --gzip' <"$source/database.archive.gz"
    local files; files="$(env_value FILES_DIR "$ENV_FILE")"; files="${files:-/file/dali}"
  else
    need mongorestore 'Install the MongoDB database tools.'
    local uri="${MONGO_URI:-$(env_value MONGO_URI backend/.env)}"
    mongorestore --quiet --uri="${uri%/*}" --drop --archive --gzip <"$source/database.archive.gz"
    local files="${UPLOAD_DIR:-$(env_value UPLOAD_DIR backend/.env)}"
  fi
  if [ -f "$source/files.tar.gz" ]; then tar -xzf "$source/files.tar.gz" -C "$files"; fi
  say 'Restore complete.'
}

cmd_check() {
  prepare_dev
  npm run check
}

usage() {
  cat <<'HELP'
Usage: ./run.sh <command>

Run the store
  dev               Start locally with live reload (default)
  prod              Build and start with Docker for production
  stop              Stop the Docker containers. Your data is kept
  restart           Restart the Docker containers
  update            Rebuild and restart after changing the code
  status            Show the Docker containers
  logs [service]    Follow Docker logs (mongo, api, web, https)

Data
  admin             Create or reset the admin from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
  seed              Load demo data. Refuses if the store already has data
  backup            Save the database and files to /file/dali-backups (or BACKUP_DIR)
  restore <folder>  Replace the database with a backup, after confirming

Development
  check             Run lint, type checks, tests and the production build
  help              Show this help

admin, seed, backup and restore use Docker if it is running, otherwise the local setup.
HELP
}

case "${1:-dev}" in
  dev) cmd_dev ;;
  prod) cmd_prod ;;
  stop) compose stop ;;
  restart) compose restart ;;
  update) cmd_prod ;;
  status) compose ps ;;
  logs) shift; compose logs -f --tail=100 "$@" ;;
  admin) cmd_admin ;;
  seed) cmd_seed ;;
  backup) cmd_backup ;;
  restore) shift; cmd_restore "$@" ;;
  check) cmd_check ;;
  help | -h | --help) usage ;;
  *) usage; die "Unknown command: $1" ;;
esac
