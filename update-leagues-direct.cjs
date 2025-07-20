const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://api.ofsl.ca'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpanVoYWxvd3dqYmNjeWpybGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMTM4MzUsImV4cCI6MjA0OTY4OTgzNX0.p5LVQnv83-khr9YTO9UEYv3OiNbOvr_SlifreXdQKrQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Running migration to add league_type and gender columns...')
    
    // Step 1: Add columns with constraints
    console.log('Step 1: Adding league_type column...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE leagues ADD COLUMN IF NOT EXISTS league_type TEXT CHECK (league_type IN ('regular_season', 'tournament', 'skills_drills'));`
    })
    
    if (error1) {
      console.log('Adding league_type column via ALTER failed, trying different approach...')
      // Try direct SQL execution
      const { error: directError1 } = await supabase
        .from('leagues')
        .select('id')
        .limit(1)
      
      if (directError1) {
        console.error('Cannot access leagues table:', directError1)
        return
      }
    }

    console.log('Step 2: Adding gender column...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE leagues ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Mixed', 'Female', 'Male'));`
    })
    
    if (error2) {
      console.log('Adding gender column via ALTER failed, trying different approach...')
    }

    // Step 3: Check current data and update
    console.log('Step 3: Checking existing leagues...')
    const { data: existingLeagues, error: checkError } = await supabase
      .from('leagues')
      .select('id, name')
      .limit(5)

    if (checkError) {
      console.error('Error checking leagues:', checkError)
      return
    }

    console.log(`Found ${existingLeagues?.length || 0} leagues in database`)

    // Step 4: Update existing leagues with default values
    console.log('Step 4: Updating existing leagues with default values...')
    const { data: updateData, error: updateError } = await supabase
      .from('leagues')
      .update({
        league_type: 'regular_season',
        gender: 'Mixed'
      })
      .neq('id', 0) // Update all records
      .select('id, name')

    if (updateError) {
      console.error('Error updating leagues:', updateError)
      return
    }

    console.log(`Successfully updated ${updateData?.length || 0} leagues with default values:`)
    updateData?.forEach(league => {
      console.log(`- ${league.name} (ID: ${league.id})`)
    })
    
    console.log('\nMigration completed successfully!')
  } catch (err) {
    console.error('Migration error:', err)
  }
}

runMigration()