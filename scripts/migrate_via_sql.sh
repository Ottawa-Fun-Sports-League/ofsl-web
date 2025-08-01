#!/bin/bash

# Simple migration script using SQL exports
# This exports data from main and imports to staging

echo "=== OFSL Data Migration (Main to Staging) ==="
echo ""
echo "This script will migrate data using SQL exports"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed. Please install PostgreSQL client tools."
    exit 1
fi

# Database URLs - Update these with your actual credentials
MAIN_DB_URL="postgresql://postgres.aijuhalowwjbccyjrlgf:wcr7nbj2ARX-nut4zbv@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
STAGING_DB_URL="postgresql://postgres.bymuehbzqzysjqilvfvr:[STAGING_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "Please update the STAGING_DB_URL with your staging database password before running."
echo "You can find this in your Supabase dashboard under Settings > Database"
echo ""
read -p "Have you updated the staging database password? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Create export directory
EXPORT_DIR="./data_export_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo "Exporting data to: $EXPORT_DIR"
echo ""

# Export reference data first (no dependencies)
echo "Exporting reference tables..."
psql "$MAIN_DB_URL" -c "\COPY sports TO '$EXPORT_DIR/sports.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY skills TO '$EXPORT_DIR/skills.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY gyms TO '$EXPORT_DIR/gyms.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY waivers TO '$EXPORT_DIR/waivers.csv' WITH (FORMAT CSV, HEADER);"

# Export users
echo "Exporting users..."
psql "$MAIN_DB_URL" -c "\COPY users TO '$EXPORT_DIR/users.csv' WITH (FORMAT CSV, HEADER);"

# Export leagues and teams
echo "Exporting leagues and teams..."
psql "$MAIN_DB_URL" -c "\COPY leagues TO '$EXPORT_DIR/leagues.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY seasons TO '$EXPORT_DIR/seasons.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY teams TO '$EXPORT_DIR/teams.csv' WITH (FORMAT CSV, HEADER);"

# Export other tables
echo "Exporting remaining tables..."
psql "$MAIN_DB_URL" -c "\COPY stripe_customers TO '$EXPORT_DIR/stripe_customers.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY stripe_products TO '$EXPORT_DIR/stripe_products.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY stripe_orders TO '$EXPORT_DIR/stripe_orders.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY stripe_subscriptions TO '$EXPORT_DIR/stripe_subscriptions.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY league_payments TO '$EXPORT_DIR/league_payments.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY team_invites TO '$EXPORT_DIR/team_invites.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY team_registration_notifications TO '$EXPORT_DIR/team_registration_notifications.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY attendance TO '$EXPORT_DIR/attendance.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY balances TO '$EXPORT_DIR/balances.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY registrations TO '$EXPORT_DIR/registrations.csv' WITH (FORMAT CSV, HEADER);"
psql "$MAIN_DB_URL" -c "\COPY waiver_acceptances TO '$EXPORT_DIR/waiver_acceptances.csv' WITH (FORMAT CSV, HEADER);"

echo ""
echo "Import data to staging database..."

# Import in dependency order
echo "Importing reference tables..."
psql "$STAGING_DB_URL" -c "\COPY sports FROM '$EXPORT_DIR/sports.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY skills FROM '$EXPORT_DIR/skills.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY gyms FROM '$EXPORT_DIR/gyms.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY waivers FROM '$EXPORT_DIR/waivers.csv' WITH (FORMAT CSV, HEADER);"

echo "Importing users..."
psql "$STAGING_DB_URL" -c "\COPY users FROM '$EXPORT_DIR/users.csv' WITH (FORMAT CSV, HEADER);"

echo "Importing leagues and teams..."
psql "$STAGING_DB_URL" -c "\COPY leagues FROM '$EXPORT_DIR/leagues.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY seasons FROM '$EXPORT_DIR/seasons.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY teams FROM '$EXPORT_DIR/teams.csv' WITH (FORMAT CSV, HEADER);"

echo "Importing remaining tables..."
psql "$STAGING_DB_URL" -c "\COPY stripe_customers FROM '$EXPORT_DIR/stripe_customers.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY stripe_products FROM '$EXPORT_DIR/stripe_products.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY stripe_orders FROM '$EXPORT_DIR/stripe_orders.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY stripe_subscriptions FROM '$EXPORT_DIR/stripe_subscriptions.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY league_payments FROM '$EXPORT_DIR/league_payments.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY team_invites FROM '$EXPORT_DIR/team_invites.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY team_registration_notifications FROM '$EXPORT_DIR/team_registration_notifications.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY attendance FROM '$EXPORT_DIR/attendance.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY balances FROM '$EXPORT_DIR/balances.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY registrations FROM '$EXPORT_DIR/registrations.csv' WITH (FORMAT CSV, HEADER);"
psql "$STAGING_DB_URL" -c "\COPY waiver_acceptances FROM '$EXPORT_DIR/waiver_acceptances.csv' WITH (FORMAT CSV, HEADER);"

echo ""
echo "Updating sequences..."
psql "$STAGING_DB_URL" << EOF
SELECT setval('sports_id_seq', COALESCE((SELECT MAX(id) FROM sports), 1), true);
SELECT setval('skills_id_seq', COALESCE((SELECT MAX(id) FROM skills), 1), true);
SELECT setval('gyms_id_seq', COALESCE((SELECT MAX(id) FROM gyms), 1), true);
SELECT setval('waivers_id_seq', COALESCE((SELECT MAX(id) FROM waivers), 1), true);
SELECT setval('leagues_id_seq', COALESCE((SELECT MAX(id) FROM leagues), 1), true);
SELECT setval('seasons_id_seq', COALESCE((SELECT MAX(id) FROM seasons), 1), true);
SELECT setval('teams_id_seq', COALESCE((SELECT MAX(id) FROM teams), 1), true);
SELECT setval('stripe_customers_id_seq', COALESCE((SELECT MAX(id) FROM stripe_customers), 1), true);
SELECT setval('stripe_orders_id_seq', COALESCE((SELECT MAX(id) FROM stripe_orders), 1), true);
SELECT setval('stripe_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM stripe_subscriptions), 1), true);
SELECT setval('league_payments_id_seq', COALESCE((SELECT MAX(id) FROM league_payments), 1), true);
SELECT setval('team_invites_id_seq', COALESCE((SELECT MAX(id) FROM team_invites), 1), true);
SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 1), true);
SELECT setval('balances_id_seq', COALESCE((SELECT MAX(id) FROM balances), 1), true);
SELECT setval('registrations_id_seq', COALESCE((SELECT MAX(id) FROM registrations), 1), true);
SELECT setval('waiver_acceptances_id_seq', COALESCE((SELECT MAX(id) FROM waiver_acceptances), 1), true);
EOF

echo ""
echo "Migration complete!"
echo "Data exported to: $EXPORT_DIR"