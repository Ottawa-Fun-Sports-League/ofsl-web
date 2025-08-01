/*
  # Remove additional_info column from leagues table

  1. Schema Changes
    - First merge any existing additional_info content into the description field
    - Then drop the additional_info column from the leagues table

  2. Data Migration
    - Ensure no data is lost by merging additional_info into description
*/

-- First, merge additional_info into description for all leagues that have both fields populated
UPDATE leagues
SET description = description || E'\n\n' || additional_info
WHERE description IS NOT NULL 
AND additional_info IS NOT NULL
AND description != ''
AND additional_info != '';

-- For leagues that have additional_info but no description, move additional_info to description
UPDATE leagues
SET description = additional_info
WHERE (description IS NULL OR description = '')
AND additional_info IS NOT NULL
AND additional_info != '';

-- Now that we've preserved all the data, drop the additional_info column
ALTER TABLE leagues DROP COLUMN IF EXISTS additional_info;