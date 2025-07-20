const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://api.ofsl.ca'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpanVoYWxvd3dqYmNjeWpybGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMTM4MzUsImV4cCI6MjA0OTY4OTgzNX0.p5LVQnv83-khr9YTO9UEYv3OiNbOvr_SlifreXdQKrQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateExistingLeagues() {
  try {
    console.log('Starting update of existing leagues...')
    
    // First, let's see how many leagues need updating
    const { data: checkData, error: checkError } = await supabase
      .from('leagues')
      .select('id, name, league_type, gender')
      .or('league_type.is.null,gender.is.null')

    if (checkError) {
      console.error('Error checking leagues:', checkError)
      return
    }

    console.log(`Found ${checkData?.length || 0} leagues that need updating:`)
    checkData?.forEach(league => {
      console.log(`- ${league.name} (ID: ${league.id}) - Type: ${league.league_type || 'null'}, Gender: ${league.gender || 'null'}`)
    })

    if (!checkData || checkData.length === 0) {
      console.log('No leagues need updating!')
      return
    }

    // Now update them
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

    console.log(`\nSuccessfully updated ${data?.length || 0} leagues:`)
    data?.forEach(league => {
      console.log(`- ${league.name} (ID: ${league.id})`)
    })
    
    console.log('\nUpdate completed successfully!')
  } catch (err) {
    console.error('Script error:', err)
  }
}

updateExistingLeagues()