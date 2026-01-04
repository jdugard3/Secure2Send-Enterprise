-- Migration: Add agent notes for merchant tracking
-- Date: 2025-01-03
-- Description: Adds agent_notes table for agents to track interactions and progress with merchants

-- Create agent_notes table
CREATE TABLE IF NOT EXISTS agent_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_priority BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_notes_agent_id ON agent_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_merchant_id ON agent_notes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_agent_notes_created_at ON agent_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_notes_priority ON agent_notes(is_priority) WHERE is_priority = true;

-- Add comment for documentation
COMMENT ON TABLE agent_notes IS 'Internal notes created by agents to track merchant progress and interactions';
COMMENT ON COLUMN agent_notes.is_priority IS 'Flag to mark merchants that need immediate attention';

