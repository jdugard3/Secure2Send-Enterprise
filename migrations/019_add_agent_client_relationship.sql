-- Migration: Add agent-client relationship for agent-specific merchant tracking
-- Date: 2025-01-XX
-- Description: Adds agentId to clients table to track which agent brought in each merchant

-- Add agentId column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS agent_id VARCHAR REFERENCES users(id);

-- Create index for faster agent-based queries
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON clients(agent_id);

-- Add comment for documentation
COMMENT ON COLUMN clients.agent_id IS 'ID of the agent who brought in this merchant (via invitation code). NULL for merchants not brought in by an agent.';

