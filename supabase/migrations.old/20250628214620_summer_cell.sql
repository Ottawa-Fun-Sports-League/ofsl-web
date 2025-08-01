/*
  # Remove additional_info field from leagues table

  1. Changes
    - Create a migration to move content from additional_info to description
    - Update all leagues to merge additional_info into description
    - Set additional_info to NULL for all leagues
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

-- Set all additional_info fields to NULL
UPDATE leagues
SET additional_info = NULL;