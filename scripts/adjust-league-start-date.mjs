#!/usr/bin/env node
// Utility to list leagues and adjust start_date for staging/testing
// Usage examples:
//   node scripts/adjust-league-start-date.mjs --filter "Sunday Elite"
//   node scripts/adjust-league-start-date.mjs --id 123 --shift-days 7
//   node scripts/adjust-league-start-date.mjs --id 123 --set 2025-10-01

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or key (SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY) in environment');
  process.exit(1);
}

const supabase = createClient(url, key);

console.log(`[using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon'} key] project=${url}`);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i];
  const v = process.argv[i + 1];
  if (!k) continue;
  if (k.startsWith('--')) {
    args.set(k.slice(2), v === undefined || v.startsWith('--') ? true : v);
    if (v === undefined || v.startsWith('--')) i -= 1; // compensate when flag has no value
  }
}

function fmt(d) {
  if (!d) return null;
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateStr, days) {
  const dt = new Date(dateStr + 'T00:00:00');
  dt.setDate(dt.getDate() + Number(days));
  return fmt(dt);
}

async function list(filter) {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, start_date, end_date, location, team_registration')
    .ilike('name', `%${filter}%`)
    .order('id', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('No leagues found for filter:', filter);
    return;
  }
  console.log('Matching leagues:');
  for (const row of data) {
    console.log(`- id=${row.id} | name="${row.name}" | start_date=${row.start_date} | end_date=${row.end_date} | location=${row.location}`);
  }
}

async function shiftByDays(id, days) {
  // Fetch current start_date
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, start_date')
    .eq('id', Number(id))
    .single();
  if (error) throw error;
  if (!data?.start_date) throw new Error('League has no start_date to shift');

  const newDate = addDays(data.start_date, Number(days));
  const { data: updated, error: updErr } = await supabase
    .from('leagues')
    .update({ start_date: newDate })
    .eq('id', Number(id))
    .select('id, name, start_date')
    .maybeSingle();
  if (updErr) throw updErr;
  if (!updated) throw new Error('Update returned no row (RLS may have prevented update)');
  console.log(`Updated league ${updated.id} (${updated.name}) start_date: ${data.start_date} -> ${updated.start_date}`);
}

async function setDate(id, dateStr) {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, start_date')
    .eq('id', Number(id))
    .single();
  if (error) throw error;
  const { data: updated, error: updErr } = await supabase
    .from('leagues')
    .update({ start_date: dateStr })
    .eq('id', Number(id))
    .select('id, name, start_date')
    .maybeSingle();
  if (updErr) throw updErr;
  if (!updated) throw new Error('Update returned no row (RLS may have prevented update)');
  console.log(`Updated league ${updated.id} (${updated.name}) start_date: ${data.start_date} -> ${updated.start_date}`);
}

(async () => {
  try {
    if (args.has('filter')) {
      await list(String(args.get('filter')));
      return;
    }
    if (args.has('id') && args.has('shift-days')) {
      await shiftByDays(args.get('id'), args.get('shift-days'));
      return;
    }
    if (args.has('id') && args.has('set')) {
      await setDate(args.get('id'), args.get('set'));
      return;
    }
    console.log('Usage:');
    console.log('  node scripts/adjust-league-start-date.mjs --filter "Sunday Elite"');
    console.log('  node scripts/adjust-league-start-date.mjs --id <LEAGUE_ID> --shift-days 7');
    console.log('  node scripts/adjust-league-start-date.mjs --id <LEAGUE_ID> --set YYYY-MM-DD');
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
