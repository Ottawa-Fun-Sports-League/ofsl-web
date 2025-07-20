import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateExistingLeagues() {
  try {
    console.log('Starting update of existing leagues...')
    
    // Update all leagues where league_type is null or gender is null
    const { data, error } = await supabase
      .from('leagues')
      .update({
        league_type: 'regular_season',
        gender: 'Mixed'
      })
      .or('league_type.is.null,gender.is.null')
      .select('id, name')

    if (error) {
      console.error('Error updating leagues:', error)
      return
    }

    console.log(`Successfully updated ${data?.length || 0} leagues:`)
    data?.forEach(league => {
      console.log(`- ${league.name} (ID: ${league.id})`)
    })
    
    console.log('\nUpdate completed successfully!')
  } catch (err) {
    console.error('Script error:', err)
  }
}

updateExistingLeagues()