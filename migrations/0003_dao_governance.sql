-- DAO Governance Tables
-- NFT-gated feature proposals and community voting

-- Proposals table
CREATE TABLE IF NOT EXISTS dao_proposals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- tool_feature, dapp_plugin, integration, improvement, other
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, voting, approved, rejected, implemented

  -- Proposer info
  proposer_address TEXT NOT NULL,
  proposer_nft_token TEXT,

  -- Engagement
  reactions TEXT DEFAULT '{}', -- JSON: {upvote: 0, downvote: 0, love: 0, interested: 0, critical: 0}
  comment_count INTEGER DEFAULT 0,

  -- Voting
  voting_start_time INTEGER,
  voting_end_time INTEGER,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,

  -- Metadata
  tags TEXT DEFAULT '[]', -- JSON array
  related_agents TEXT DEFAULT '[]', -- JSON array
  complexity TEXT, -- low, medium, high

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  moved_to_voting_at INTEGER,
  implemented_at INTEGER
);

-- Reactions table
CREATE TABLE IF NOT EXISTS dao_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL,
  user_address TEXT NOT NULL,
  reaction_type TEXT NOT NULL, -- upvote, downvote, love, interested, critical
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (proposal_id) REFERENCES dao_proposals(id) ON DELETE CASCADE,
  UNIQUE(proposal_id, user_address) -- One reaction per user per proposal
);

-- Comments table
CREATE TABLE IF NOT EXISTS dao_comments (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  user_address TEXT NOT NULL,
  content TEXT NOT NULL,
  reactions TEXT DEFAULT '{}', -- JSON: reactions on comments
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (proposal_id) REFERENCES dao_proposals(id) ON DELETE CASCADE
);

-- Votes table (for main voting app integration)
CREATE TABLE IF NOT EXISTS dao_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL,
  user_address TEXT NOT NULL,
  vote TEXT NOT NULL, -- for, against, abstain
  voting_power REAL DEFAULT 1.0, -- Based on NFT holdings
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (proposal_id) REFERENCES dao_proposals(id) ON DELETE CASCADE,
  UNIQUE(proposal_id, user_address) -- One vote per user per proposal
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_status ON dao_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_type ON dao_proposals(type);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON dao_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_upvotes ON dao_proposals(json_extract(reactions, '$.upvote') DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_proposal ON dao_reactions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_comments_proposal ON dao_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON dao_votes(proposal_id);
