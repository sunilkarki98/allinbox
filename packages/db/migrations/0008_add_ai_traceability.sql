-- Migration: Add AI Traceability Columns
-- Date: 2026-02-07
-- Purpose: Store model version, analysis timestamp, and reasoning for audit compliance

-- Add AI traceability columns to interactions table
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(100),
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Create index for filtering by model version (useful for model performance audits)
CREATE INDEX IF NOT EXISTS interaction_ai_model_version_idx ON interactions(ai_model_version);

-- Backfill existing analyzed interactions with placeholder values
UPDATE interactions 
SET 
    ai_model_version = 'legacy-unknown',
    ai_analyzed_at = updated_at
WHERE ai_intent IS NOT NULL AND ai_model_version IS NULL;
