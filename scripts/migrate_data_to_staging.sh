#!/bin/bash

# OFSL Data Migration Script - Main to Staging
# This script copies data from the main database to the staging database

echo "=== OFSL Data Migration Script ==="
echo "This script will copy data from main to staging"
echo ""

# Configuration
MAIN_DB_URL="postgresql://postgres.[YOUR_MAIN_PROJECT_REF]:[YOUR_MAIN_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
STAGING_DB_URL="postgresql://postgres.bymuehbzqzysjqilvfvr:[YOUR_STAGING_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Tables to migrate in dependency order
TABLES=(
    "sports"
    "skills"
    "gyms"
    "waivers"
    "users"
    "leagues"
    "seasons"
    "teams"
    "stripe_customers"
    "stripe_products"
    "stripe_orders"
    "stripe_subscriptions"
    "league_payments"
    "team_invites"
    "team_registration_notifications"
    "attendance"
    "balances"
    "registrations"
    "waiver_acceptances"
)

echo "Please update the database URLs in this script with your actual credentials before running."
echo ""
echo "Tables to migrate:"
printf '%s\n' "${TABLES[@]}"
echo ""

read -p "Have you updated the database URLs? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please update the database URLs and run again."
    exit 1
fi

# Create a timestamp for the backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo ""
echo "Starting migration..."
echo "Backup directory: $BACKUP_DIR"
echo ""

# Export data from main database
echo "Step 1: Exporting data from main database..."
for table in "${TABLES[@]}"; do
    echo "  Exporting $table..."
    pg_dump "$MAIN_DB_URL" \
        --table="public.$table" \
        --data-only \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --no-unlogged-table-data \
        --format=custom \
        --file="$BACKUP_DIR/${table}.dump"
done

echo ""
echo "Step 2: Importing data to staging database..."

# First, disable triggers on staging to avoid issues
echo "  Disabling triggers..."
psql "$STAGING_DB_URL" -c "SET session_replication_role = 'replica';"

# Import data to staging database
for table in "${TABLES[@]}"; do
    echo "  Importing $table..."
    pg_restore "$STAGING_DB_URL" \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        --single-transaction \
        "$BACKUP_DIR/${table}.dump"
done

# Re-enable triggers
echo "  Re-enabling triggers..."
psql "$STAGING_DB_URL" -c "SET session_replication_role = 'origin';"

echo ""
echo "Step 3: Updating sequences..."

# Update sequences to continue from max ID
psql "$STAGING_DB_URL" << EOF
SELECT setval('sports_id_seq', COALESCE((SELECT MAX(id) FROM sports), 1));
SELECT setval('skills_id_seq', COALESCE((SELECT MAX(id) FROM skills), 1));
SELECT setval('gyms_id_seq', COALESCE((SELECT MAX(id) FROM gyms), 1));
SELECT setval('waivers_id_seq', COALESCE((SELECT MAX(id) FROM waivers), 1));
SELECT setval('leagues_id_seq', COALESCE((SELECT MAX(id) FROM leagues), 1));
SELECT setval('seasons_id_seq', COALESCE((SELECT MAX(id) FROM seasons), 1));
SELECT setval('teams_id_seq', COALESCE((SELECT MAX(id) FROM teams), 1));
SELECT setval('stripe_customers_id_seq', COALESCE((SELECT MAX(id) FROM stripe_customers), 1));
SELECT setval('stripe_orders_id_seq', COALESCE((SELECT MAX(id) FROM stripe_orders), 1));
SELECT setval('stripe_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM stripe_subscriptions), 1));
SELECT setval('league_payments_id_seq', COALESCE((SELECT MAX(id) FROM league_payments), 1));
SELECT setval('team_invites_id_seq', COALESCE((SELECT MAX(id) FROM team_invites), 1));
SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 1));
SELECT setval('balances_id_seq', COALESCE((SELECT MAX(id) FROM balances), 1));
SELECT setval('registrations_id_seq', COALESCE((SELECT MAX(id) FROM registrations), 1));
SELECT setval('waiver_acceptances_id_seq', COALESCE((SELECT MAX(id) FROM waiver_acceptances), 1));
EOF

echo ""
echo "Step 4: Verifying migration..."

# Verify row counts
psql "$STAGING_DB_URL" << EOF
SELECT 
    'sports' as table_name, COUNT(*) as count FROM sports
UNION ALL
SELECT 'skills', COUNT(*) FROM skills
UNION ALL
SELECT 'gyms', COUNT(*) FROM gyms
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'leagues', COUNT(*) FROM leagues
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'waivers', COUNT(*) FROM waivers
ORDER BY table_name;
EOF

echo ""
echo "Migration complete!"
echo "Backup files saved in: $BACKUP_DIR"
echo ""
echo "Note: This script only migrates data. Schema changes should be"
echo "managed through Supabase migrations."