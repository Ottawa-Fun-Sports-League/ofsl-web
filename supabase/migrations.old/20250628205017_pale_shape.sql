/*
  # Populate league descriptions with actual content

  1. Updates
    - Update existing leagues with proper descriptions based on their details
    - Add comprehensive descriptions for volleyball and badminton leagues
*/

-- Update volleyball leagues with proper descriptions
UPDATE leagues 
SET description = CASE 
  WHEN name ILIKE '%elite%' AND name ILIKE '%women%' THEN 
    'OFSL''s elite women''s volleyball league represents the highest level of competitive play for female athletes. This league is designed for current or former college/university players who demonstrate advanced offensive and defensive systems, consistent high-level execution, and specialized positional play. Players should have tournament-level experience with advanced techniques and strategic understanding.'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%intermediate%' THEN 
    'Our coed intermediate volleyball league provides a structured environment for players who are comfortable with basic volleyball skills and are developing consistency in their play. This league welcomes players who understand fundamental rules and strategies, can serve and receive consistently, and are eager to improve their game while enjoying competitive yet friendly matches.'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%advanced%' THEN 
    'The coed advanced volleyball league is perfect for players with solid technique in all basic strokes and serves, good footwork and court movement, and the ability to maintain longer rallies with control. Players should have a basic understanding of positioning and be ready for more strategic gameplay while maintaining the fun, inclusive atmosphere OFSL is known for.'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%competitive%' THEN 
    'Our coed competitive volleyball league features strong fundamental skills with developing advanced techniques. Players should demonstrate good court positioning and shot selection, maintain consistent rallies with occasional power plays, and have an understanding of basic tactics and game flow. This league bridges the gap between advanced recreational and elite play.'
  
  WHEN name ILIKE '%women%' AND (name ILIKE '%intermediate%' OR name ILIKE '%advanced%') THEN 
    'The women''s intermediate/advanced volleyball league provides female athletes with competitive play at a level that challenges and develops skills. Players should be comfortable with fundamental techniques, demonstrate consistent play, and be ready to learn more advanced strategies while enjoying the camaraderie of women''s competitive volleyball.'
  
  WHEN name ILIKE '%men%' AND (name ILIKE '%intermediate%' OR name ILIKE '%advanced%') THEN 
    'Our men''s intermediate/advanced volleyball league offers male athletes the opportunity to compete at a challenging level while developing their skills. Players should have solid fundamental techniques, good court awareness, and be ready for strategic gameplay in a competitive yet supportive environment.'
  
  WHEN name ILIKE '%4s%' THEN 
    'This 4-on-4 volleyball format provides a faster-paced, more dynamic game where every player is constantly involved. With fewer players on the court, each participant gets more touches, more opportunities to make plays, and develops a more well-rounded skill set. Perfect for players who want intensive action and skill development.'
  
  ELSE 
    'OFSL volleyball leagues are organized to provide participants with a structured environment that encourages sportsmanship, physical activity and healthy competition. Our tiered system ensures fair and competitive play for all skill levels, with leagues separated by skill level and updated weekly based on performance.'
END
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Volleyball')
AND (description IS NULL OR description = '');

-- Update badminton leagues with proper descriptions  
UPDATE leagues 
SET description = CASE 
  WHEN name ILIKE '%advanced%' AND name ILIKE '%singles%' THEN 
    'Advanced singles badminton for players with solid technique in all basic strokes and serves, excellent footwork and court movement, and the ability to maintain longer rallies with control and precision. Players should have strong tactical awareness and be comfortable with fast-paced, strategic gameplay.'
  
  WHEN name ILIKE '%intermediate%' AND name ILIKE '%doubles%' THEN 
    'Intermediate doubles badminton welcomes players who are comfortable with basic strokes and serves, developing consistency in shot placement, and learning proper footwork and court positioning. This league focuses on doubles strategy and teamwork while maintaining an enjoyable, competitive atmosphere.'
  
  WHEN name ILIKE '%competitive%' AND name ILIKE '%singles%' THEN 
    'Competitive singles badminton features strong fundamental skills with developing advanced techniques. Players should demonstrate good court positioning and shot selection, consistent rallies with occasional power shots, and a solid understanding of basic tactics and game flow.'
  
  WHEN name ILIKE '%coed%' AND name ILIKE '%intermediate%' THEN 
    'Our coed intermediate doubles badminton league provides mixed-gender competition for players developing their doubles game. Focus on teamwork, communication, and strategic positioning while enjoying competitive matches in a supportive environment.'
  
  WHEN name ILIKE '%advanced%' AND name ILIKE '%doubles%' THEN 
    'Advanced doubles badminton for experienced players with strong technical skills, excellent court coverage, and advanced understanding of doubles strategy. Players should be comfortable with fast exchanges, strategic shot placement, and coordinated team play.'
  
  WHEN name ILIKE '%competitive%' AND name ILIKE '%doubles%' THEN 
    'Competitive doubles badminton featuring high-level play with advanced techniques and strategies. Players should have consistent power and precision in all shots, excellent court coverage and anticipation skills, and strong tactical awareness for doubles play.'
  
  ELSE 
    'OFSL badminton leagues offer competitive play for all skill levels, from intermediate to advanced players. Experience fast-paced action and improve your game in a supportive community environment with both singles and doubles formats available.'
END
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Badminton')
AND (description IS NULL OR description = '');

-- Update any remaining leagues with generic descriptions based on sport
UPDATE leagues 
SET description = CASE 
  WHEN sport_id = (SELECT id FROM sports WHERE name = 'Basketball') THEN 
    'Join our basketball league for competitive games in a structured environment. Perfect for players looking to improve their skills while enjoying the camaraderie and competition of organized basketball.'
  
  WHEN sport_id = (SELECT id FROM sports WHERE name = 'Pickleball') THEN 
    'Our pickleball league combines the best elements of tennis, badminton, and ping pong in a fun, accessible format. Great for players of all ages and skill levels looking for fast-paced, strategic gameplay.'
  
  ELSE 
    'Join our league for competitive play in a structured, supportive environment. Perfect for players looking to improve their skills while enjoying organized competition and community.'
END
WHERE description IS NULL OR description = '';