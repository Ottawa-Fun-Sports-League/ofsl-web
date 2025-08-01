/*
  # Comprehensive League Descriptions from Details Tab

  1. Updates
    - Populate description field with complete content from league details tab
    - Include league description, skill level requirements, and additional information
    - Create comprehensive descriptions that match what users see in the details view
*/

-- Update volleyball leagues with comprehensive descriptions from details tab
UPDATE leagues 
SET description = CASE 
  WHEN name ILIKE '%elite%' AND name ILIKE '%women%' THEN 
    'OFSL''s elite women''s volleyball league represents the highest level of competitive play for female athletes. This league is designed for current or former college/university players who demonstrate advanced offensive and defensive systems, consistent high-level execution, and specialized positional play.

**Skill Level Requirements - Elite Level:**
• Tournament-level play with advanced techniques and strategies
• Consistent power and precision in all shots
• Excellent court coverage and anticipation skills
• Strong tactical awareness and game management

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%intermediate%' THEN 
    'Our coed intermediate volleyball league provides a structured environment for players who are comfortable with basic volleyball skills and are developing consistency in their play. This league welcomes players who understand fundamental rules and strategies.

**Skill Level Requirements - Intermediate Level:**
• Comfortable with basic strokes and serves
• Developing consistency in shot placement
• Learning proper footwork and court positioning
• Eager to improve and learn new techniques

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%advanced%' THEN 
    'The coed advanced volleyball league is perfect for players with solid technique in all basic strokes and serves, good footwork and court movement, and the ability to maintain longer rallies with control.

**Skill Level Requirements - Advanced Level:**
• Solid technique in all basic strokes and serves
• Good footwork and court movement
• Ability to maintain longer rallies with control
• Basic understanding of doubles positioning

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%competitive%' THEN 
    'Our coed competitive volleyball league features strong fundamental skills with developing advanced techniques. Players should demonstrate good court positioning and shot selection.

**Skill Level Requirements - Competitive Level:**
• Strong fundamental skills with developing advanced techniques
• Good court positioning and shot selection
• Consistent rallies with occasional power shots
• Understanding of basic tactics and game flow

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  WHEN name ILIKE '%women%' AND (name ILIKE '%intermediate%' OR name ILIKE '%advanced%') THEN 
    'The women''s intermediate/advanced volleyball league provides female athletes with competitive play at a level that challenges and develops skills. Players should be comfortable with fundamental techniques and demonstrate consistent play.

**Skill Level Requirements - Intermediate/Advanced Level:**
• Comfortable with basic strokes and serves
• Developing consistency in shot placement
• Good footwork and court movement
• Ability to maintain longer rallies with control

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  WHEN name ILIKE '%men%' AND (name ILIKE '%intermediate%' OR name ILIKE '%advanced%') THEN 
    'Our men''s intermediate/advanced volleyball league offers male athletes the opportunity to compete at a challenging level while developing their skills. Players should have solid fundamental techniques and good court awareness.

**Skill Level Requirements - Intermediate/Advanced Level:**
• Solid technique in all basic strokes and serves
• Good footwork and court movement
• Ability to maintain longer rallies with control
• Understanding of basic tactics and positioning

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  WHEN name ILIKE '%4s%' THEN 
    'This 4-on-4 volleyball format provides a faster-paced, more dynamic game where every player is constantly involved. With fewer players on the court, each participant gets more touches and opportunities.

**About 4s Format:**
• Fast-paced, dynamic gameplay with more player involvement
• Every player gets more touches and opportunities to make plays
• Develops well-rounded skill set through increased participation
• Perfect for intensive action and skill development

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers'
  
  ELSE 
    'OFSL volleyball leagues are organized to provide participants with a structured environment that encourages sportsmanship, physical activity and healthy competition. Our tiered system ensures fair and competitive play for all skill levels.

**About Our Volleyball Leagues:**
• Teams are separated by tiers which are updated every week after games
• Focused on individuals who play at an intermediate to elite skill level
• Schools and play times may vary between tiers
• You must be registered to see standings and schedules
• To register a team, captains must create an account and be approved by the league

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
END
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Volleyball')
AND (description IS NULL OR description = '' OR description NOT LIKE '%**Skill Level Requirements%');

-- Update badminton leagues with comprehensive descriptions from details tab
UPDATE leagues 
SET description = CASE 
  WHEN name ILIKE '%advanced%' AND name ILIKE '%singles%' THEN 
    'Advanced singles badminton for players with solid technique in all basic strokes and serves, excellent footwork and court movement, and the ability to maintain longer rallies with control and precision.

**Skill Level Requirements - Advanced Level:**
• Solid technique in all basic strokes and serves
• Good footwork and court movement
• Ability to maintain longer rallies with control
• Basic understanding of doubles positioning

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  WHEN name ILIKE '%intermediate%' AND name ILIKE '%doubles%' THEN 
    'Intermediate doubles badminton welcomes players who are comfortable with basic strokes and serves, developing consistency in shot placement, and learning proper footwork and court positioning.

**Skill Level Requirements - Intermediate Level:**
• Comfortable with basic strokes and serves
• Developing consistency in shot placement
• Learning proper footwork and court positioning
• Eager to improve and learn new techniques

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  WHEN name ILIKE '%competitive%' AND name ILIKE '%singles%' THEN 
    'Competitive singles badminton features strong fundamental skills with developing advanced techniques. Players should demonstrate good court positioning and shot selection.

**Skill Level Requirements - Competitive Level:**
• Strong fundamental skills with developing advanced techniques
• Good court positioning and shot selection
• Consistent rallies with occasional power shots
• Understanding of basic tactics and game flow

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%intermediate%' THEN 
    'Our coed intermediate doubles badminton league provides mixed-gender competition for players developing their doubles game. Focus on teamwork, communication, and strategic positioning.

**Skill Level Requirements - Intermediate Level:**
• Comfortable with basic strokes and serves
• Developing consistency in shot placement
• Learning proper footwork and court positioning
• Eager to improve and learn new techniques

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  WHEN name ILIKE '%advanced%' AND name ILIKE '%doubles%' THEN 
    'Advanced doubles badminton for experienced players with strong technical skills, excellent court coverage, and advanced understanding of doubles strategy.

**Skill Level Requirements - Advanced Level:**
• Solid technique in all basic strokes and serves
• Good footwork and court movement
• Ability to maintain longer rallies with control
• Basic understanding of doubles positioning

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  WHEN name ILIKE '%competitive%' AND name ILIKE '%doubles%' THEN 
    'Competitive doubles badminton featuring high-level play with advanced techniques and strategies. Players should have consistent power and precision in all shots.

**Skill Level Requirements - Competitive Level:**
• Strong fundamental skills with developing advanced techniques
• Good court positioning and shot selection
• Consistent rallies with occasional power shots
• Understanding of basic tactics and game flow

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  ELSE 
    'OFSL badminton leagues offer competitive play for all skill levels, from intermediate to advanced players. Experience fast-paced action and improve your game in a supportive community environment.

**About Our Badminton Leagues:**
• Both singles and doubles formats available across all skill levels
• Focused on players who want competitive yet enjoyable matches
• Professional-grade shuttlecocks provided for all league play
• Multiple courts available to ensure optimal playing conditions
• Individual registration - we''ll match you with players of similar skill level

**Additional Information:**
• League runs for 12 weeks with 10 regular season games and 2 weeks of playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
END
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Badminton')
AND (description IS NULL OR description = '' OR description NOT LIKE '%**Skill Level Requirements%');

-- Update any remaining leagues with comprehensive descriptions
UPDATE leagues 
SET description = CASE 
  WHEN sport_id = (SELECT id FROM sports WHERE name = 'Basketball') THEN 
    'Join our basketball league for competitive games in a structured environment. Perfect for players looking to improve their skills while enjoying the camaraderie and competition of organized basketball.

**About Our Basketball Leagues:**
• Structured environment promoting sportsmanship and healthy competition
• Multiple skill levels available to ensure fair and competitive play
• Professional referees and organized game schedules
• Focus on skill development and team building

**Additional Information:**
• League runs for 12 weeks with regular season games and playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  WHEN sport_id = (SELECT id FROM sports WHERE name = 'Pickleball') THEN 
    'Our pickleball league combines the best elements of tennis, badminton, and ping pong in a fun, accessible format. Great for players of all ages and skill levels looking for fast-paced, strategic gameplay.

**About Our Pickleball Leagues:**
• Fast-paced, strategic gameplay suitable for all ages
• Combines elements of tennis, badminton, and ping pong
• Multiple skill levels to ensure competitive balance
• Growing sport with welcoming community atmosphere

**Additional Information:**
• League runs for 12 weeks with regular season games and playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
  
  ELSE 
    'Join our league for competitive play in a structured, supportive environment. Perfect for players looking to improve their skills while enjoying organized competition and community.

**About Our Leagues:**
• Structured environment promoting sportsmanship and healthy competition
• Multiple skill levels available to ensure fair and competitive play
• Professional organization and game management
• Focus on skill development and community building

**Additional Information:**
• League runs for 12 weeks with regular season games and playoffs
• Registered teams receive a schedule of all games for the season
• All equipment provided (except personal gear)
• Please review our standards of play for complete rules'
END
WHERE description IS NULL OR description = '' OR description NOT LIKE '%**About Our%';