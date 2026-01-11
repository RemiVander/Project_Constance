
set -eu


DB_URL="${DATABASE_URL:-sqlite:////data/robes_demi_mesure.db}"

sqlite_path_from_url() {
  case "$1" in
    sqlite:////*)
      echo "/${1#sqlite:////}"
      ;;
    sqlite:///./*)
      echo "/app/${1#sqlite:///./}"
      ;;
    sqlite:///*)
      echo "/app/${1#sqlite:///}"
      ;;
    *)
      echo ""
      ;;
  esac
}

DB_FILE=""
case "$DB_URL" in
  sqlite:*) DB_FILE="$(sqlite_path_from_url "$DB_URL")" ;;
esac

echo "[entrypoint] DATABASE_URL=$DB_URL"
if [ -n "$DB_FILE" ]; then
  echo "[entrypoint] SQLite file path resolved to: $DB_FILE"

  DB_DIR="$(dirname "$DB_FILE")"
  mkdir -p "$DB_DIR"

  if [ ! -f "$DB_FILE" ]; then
    echo "[entrypoint] DB absente -> initialisation: $DB_FILE"
    cd /app && PYTHONPATH=/app python scripts/init_db.py

    if [ "${SEED_SAMPLE_DATA:-0}" = "1" ]; then
      echo "[entrypoint] SEED_SAMPLE_DATA=1 -> création admin + données sample"
      cd /app && PYTHONPATH=/app python scripts/create_admin_and_sample.py
    else
      echo "[entrypoint] Seed ignoré (SEED_SAMPLE_DATA != 1)"
    fi
  else
    echo "[entrypoint] DB existante -> aucune modification: $DB_FILE"
  fi
else
  echo "[entrypoint] DATABASE_URL non-SQLite ou non reconnue -> skip init"
fi

exec "$@"
