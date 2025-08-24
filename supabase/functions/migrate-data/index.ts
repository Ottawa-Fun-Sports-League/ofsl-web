import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Parse request body
    const { sourceUrl, sourceAnonKey, sourceServiceKey, targetServiceKey } = await req.json()
    
    if (!sourceUrl || !sourceAnonKey || !sourceServiceKey || !targetServiceKey) {
      throw new Error('Missing required parameters')
    }

    // Create clients
    const sourceClient = createClient(sourceUrl, sourceServiceKey)
    const targetUrl = Deno.env.get('SUPABASE_URL')!
    const targetClient = createClient(targetUrl, targetServiceKey)

    // Tables to migrate in order
    const tables = [
      'sports', 'skills', 'gyms', 'waivers', 'users',
      'leagues', 'seasons', 'teams', 'stripe_customers',
      'stripe_products', 'stripe_orders', 'stripe_subscriptions',
      'league_payments', 'team_invites', 'team_registration_notifications',
      'attendance', 'balances', 'registrations', 'waiver_acceptances'
    ]

    const results = []

    for (const table of tables) {
      try {
        // Fetch all data from source
        const { data: sourceData, error: fetchError } = await sourceClient
          .from(table)
          .select('*')
          .order('id', { ascending: true })

        if (fetchError) {
          results.push({ table, status: 'error', error: fetchError.message })
          continue
        }

        if (!sourceData || sourceData.length === 0) {
          results.push({ table, status: 'skipped', count: 0 })
          continue
        }

        // Insert into target
        const { error: insertError } = await targetClient
          .from(table)
          .upsert(sourceData, { 
            onConflict: 'id',
            ignoreDuplicates: true 
          })

        if (insertError) {
          results.push({ table, status: 'error', error: insertError.message })
        } else {
          results.push({ table, status: 'success', count: sourceData.length })
        }

      } catch (error) {
        results.push({ table, status: 'error', error: error.message })
      }
    }

    // Update sequences
    for (const table of tables) {
      try {
        const { error } = await targetClient.rpc('setval', {
          sequence_name: `${table}_id_seq`,
          new_value: await getMaxId(targetClient, table),
          is_called: true
        })
        
        if (error) {
          console.error(`Failed to update sequence for ${table}:`, error)
        }
      } catch (error) {
        console.error(`Error updating sequence for ${table}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length,
          skipped: results.filter(r => r.status === 'skipped').length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function getMaxId(client: ReturnType<typeof createClient>, table: string): Promise<number> {
  const { data, error } = await client
    .from(table)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) return 1
  return data.id
}