// DAO Governance Service
// NFT-gated feature proposals and community voting for srvcflo.com ecosystem

import { Env } from '../config/env';
import { NFTVerificationService } from './nft-verification';

/**
 * Proposal status enum
 */
export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  VOTING = 'voting',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
}

/**
 * Proposal type enum
 */
export enum ProposalType {
  TOOL_FEATURE = 'tool_feature',
  DAPP_PLUGIN = 'dapp_plugin',
  INTEGRATION = 'integration',
  IMPROVEMENT = 'improvement',
  OTHER = 'other',
}

/**
 * Reaction types
 */
export enum ReactionType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  LOVE = 'love',
  INTERESTED = 'interested',
  CRITICAL = 'critical',
}

/**
 * Feature proposal interface
 */
export interface FeatureProposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;

  // Proposer info
  proposerId: string;
  proposerAddress: string;
  proposerNftTokenId?: string;

  // Engagement metrics
  reactions: Record<ReactionType, number>;
  commentCount: number;

  // Voting (when status = VOTING)
  votingStartTime?: number;
  votingEndTime?: number;
  votesFor?: number;
  votesAgainst?: number;

  // Metadata
  tags: string[];
  relatedAgents: string[]; // Which agents this affects
  estimatedComplexity?: 'low' | 'medium' | 'high';

  // Timestamps
  createdAt: number;
  updatedAt: number;
  movedToVotingAt?: number;
  implementedAt?: number;
}

/**
 * User reaction on a proposal
 */
export interface ProposalReaction {
  proposalId: string;
  userId: string;
  userAddress: string;
  reactionType: ReactionType;
  timestamp: number;
}

/**
 * Comment on a proposal
 */
export interface ProposalComment {
  id: string;
  proposalId: string;
  userId: string;
  userAddress: string;
  content: string;
  reactions: Record<ReactionType, number>;
  createdAt: number;
  updatedAt: number;
}

/**
 * DAO Governance Service
 */
export class DAOGovernanceService {
  private nftVerification: NFTVerificationService;

  constructor(private env: Env) {
    this.nftVerification = new NFTVerificationService(env);
  }

  /**
   * Create a new feature proposal (NFT holders only)
   */
  async createProposal(
    userAddress: string,
    proposal: Omit<FeatureProposal, 'id' | 'proposerId' | 'proposerAddress' | 'reactions' | 'commentCount' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<{ success: boolean; proposalId?: string; error?: string }> {
    try {
      // Verify NFT ownership
      const isNftHolder = await this.nftVerification.verifyWithCache(userAddress);
      if (!isNftHolder.isHolder) {
        return {
          success: false,
          error: 'Must hold Bandit Kidz NFT to submit proposals',
        };
      }

      const proposalId = crypto.randomUUID();
      const now = Date.now();

      const newProposal: FeatureProposal = {
        id: proposalId,
        ...proposal,
        proposerId: crypto.randomUUID(), // Generate user ID
        proposerAddress: userAddress,
        proposerNftTokenId: undefined, // Token ID not available in current NFT verification
        status: ProposalStatus.DRAFT,
        reactions: {
          [ReactionType.UPVOTE]: 0,
          [ReactionType.DOWNVOTE]: 0,
          [ReactionType.LOVE]: 0,
          [ReactionType.INTERESTED]: 0,
          [ReactionType.CRITICAL]: 0,
        },
        commentCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      // Store in D1 database
      await this.env.CONFIG_DB.prepare(
        `INSERT INTO dao_proposals (
          id, title, description, type, status, proposer_address,
          proposer_nft_token, reactions, tags, related_agents,
          complexity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          newProposal.id,
          newProposal.title,
          newProposal.description,
          newProposal.type,
          newProposal.status,
          newProposal.proposerAddress,
          newProposal.proposerNftTokenId,
          JSON.stringify(newProposal.reactions),
          JSON.stringify(newProposal.tags),
          JSON.stringify(newProposal.relatedAgents),
          newProposal.estimatedComplexity,
          newProposal.createdAt,
          newProposal.updatedAt
        )
        .run();

      // Log to analytics
      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: ['dao_proposal_created', newProposal.type, newProposal.status],
          doubles: [1],
          indexes: [newProposal.id],
        });
      }

      return { success: true, proposalId };
    } catch (error: any) {
      console.error('[DAO] Create proposal error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add reaction to a proposal
   */
  async addReaction(
    proposalId: string,
    userAddress: string,
    reactionType: ReactionType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user already reacted
      const existingReaction = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM dao_reactions WHERE proposal_id = ? AND user_address = ?'
      )
        .bind(proposalId, userAddress)
        .first();

      if (existingReaction) {
        // Update existing reaction
        await this.env.CONFIG_DB.prepare(
          'UPDATE dao_reactions SET reaction_type = ?, timestamp = ? WHERE proposal_id = ? AND user_address = ?'
        )
          .bind(reactionType, Date.now(), proposalId, userAddress)
          .run();
      } else {
        // Add new reaction
        await this.env.CONFIG_DB.prepare(
          'INSERT INTO dao_reactions (proposal_id, user_address, reaction_type, timestamp) VALUES (?, ?, ?, ?)'
        )
          .bind(proposalId, userAddress, reactionType, Date.now())
          .run();
      }

      // Update proposal reaction counts
      await this.updateProposalReactionCounts(proposalId);

      return { success: true };
    } catch (error: any) {
      console.error('[DAO] Add reaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get proposals sorted by reaction count
   */
  async getTrendingProposals(
    limit: number = 20,
    status?: ProposalStatus
  ): Promise<FeatureProposal[]> {
    try {
      let query = `
        SELECT * FROM dao_proposals
        WHERE 1=1
      `;

      const params: any[] = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += `
        ORDER BY
          json_extract(reactions, '$.upvote') DESC,
          json_extract(reactions, '$.interested') DESC,
          created_at DESC
        LIMIT ?
      `;
      params.push(limit);

      const result = await this.env.CONFIG_DB.prepare(query)
        .bind(...params)
        .all();

      return this.parseProposals(result.results);
    } catch (error) {
      console.error('[DAO] Get trending proposals error:', error);
      return [];
    }
  }

  /**
   * Get proposals by type
   */
  async getProposalsByType(type: ProposalType, limit: number = 20): Promise<FeatureProposal[]> {
    try {
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM dao_proposals WHERE type = ? ORDER BY created_at DESC LIMIT ?'
      )
        .bind(type, limit)
        .all();

      return this.parseProposals(result.results);
    } catch (error) {
      console.error('[DAO] Get proposals by type error:', error);
      return [];
    }
  }

  /**
   * Move top proposals to voting
   * Called by cron job or manually by DAO admins
   */
  async moveTopProposalsToVoting(threshold: number = 50): Promise<{
    success: boolean;
    movedProposals: string[];
    error?: string;
  }> {
    try {
      // Get proposals with enough upvotes
      const result = await this.env.CONFIG_DB.prepare(
        `SELECT * FROM dao_proposals
         WHERE status = ?
         AND json_extract(reactions, '$.upvote') >= ?
         ORDER BY json_extract(reactions, '$.upvote') DESC
         LIMIT 10`
      )
        .bind(ProposalStatus.ACTIVE, threshold)
        .all();

      const proposals = this.parseProposals(result.results);
      const movedProposals: string[] = [];

      for (const proposal of proposals) {
        const votingEndTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

        await this.env.CONFIG_DB.prepare(
          `UPDATE dao_proposals
           SET status = ?, voting_start_time = ?, voting_end_time = ?, moved_to_voting_at = ?
           WHERE id = ?`
        )
          .bind(
            ProposalStatus.VOTING,
            Date.now(),
            votingEndTime,
            Date.now(),
            proposal.id
          )
          .run();

        movedProposals.push(proposal.id);

        // Log to analytics
        if (this.env.ANALYTICS) {
          this.env.ANALYTICS.writeDataPoint({
            blobs: ['dao_proposal_to_voting', proposal.type],
            doubles: [proposal.reactions.upvote],
            indexes: [proposal.id],
          });
        }
      }

      return { success: true, movedProposals };
    } catch (error: any) {
      console.error('[DAO] Move to voting error:', error);
      return { success: false, movedProposals: [], error: error.message };
    }
  }

  /**
   * Get proposal details
   */
  async getProposal(proposalId: string): Promise<FeatureProposal | null> {
    try {
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM dao_proposals WHERE id = ?'
      )
        .bind(proposalId)
        .first();

      if (!result) return null;

      return this.parseProposal(result);
    } catch (error) {
      console.error('[DAO] Get proposal error:', error);
      return null;
    }
  }

  /**
   * Get comments for a proposal
   */
  async getProposalComments(proposalId: string): Promise<ProposalComment[]> {
    try {
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM dao_comments WHERE proposal_id = ? ORDER BY created_at DESC'
      )
        .bind(proposalId)
        .all();

      return result.results.map((row: any) => ({
        id: row.id,
        proposalId: row.proposal_id,
        userId: row.user_id,
        userAddress: row.user_address,
        content: row.content,
        reactions: JSON.parse(row.reactions || '{}'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('[DAO] Get comments error:', error);
      return [];
    }
  }

  /**
   * Add comment to proposal
   */
  async addComment(
    proposalId: string,
    userAddress: string,
    content: string
  ): Promise<{ success: boolean; commentId?: string; error?: string }> {
    try {
      const commentId = crypto.randomUUID();
      const now = Date.now();

      await this.env.CONFIG_DB.prepare(
        `INSERT INTO dao_comments (id, proposal_id, user_address, content, reactions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          commentId,
          proposalId,
          userAddress,
          content,
          JSON.stringify({}),
          now,
          now
        )
        .run();

      // Update comment count
      await this.env.CONFIG_DB.prepare(
        'UPDATE dao_proposals SET comment_count = comment_count + 1 WHERE id = ?'
      )
        .bind(proposalId)
        .run();

      return { success: true, commentId };
    } catch (error: any) {
      console.error('[DAO] Add comment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update proposal reaction counts
   */
  private async updateProposalReactionCounts(proposalId: string): Promise<void> {
    const reactions = await this.env.CONFIG_DB.prepare(
      'SELECT reaction_type, COUNT(*) as count FROM dao_reactions WHERE proposal_id = ? GROUP BY reaction_type'
    )
      .bind(proposalId)
      .all();

    const reactionCounts: Record<ReactionType, number> = {
      [ReactionType.UPVOTE]: 0,
      [ReactionType.DOWNVOTE]: 0,
      [ReactionType.LOVE]: 0,
      [ReactionType.INTERESTED]: 0,
      [ReactionType.CRITICAL]: 0,
    };

    for (const row of reactions.results) {
      const reactionType = (row as any).reaction_type as ReactionType;
      reactionCounts[reactionType] = (row as any).count;
    }

    await this.env.CONFIG_DB.prepare(
      'UPDATE dao_proposals SET reactions = ?, updated_at = ? WHERE id = ?'
    )
      .bind(JSON.stringify(reactionCounts), Date.now(), proposalId)
      .run();
  }

  /**
   * Parse proposal from database row
   */
  private parseProposal(row: any): FeatureProposal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      proposerId: row.proposer_id || crypto.randomUUID(),
      proposerAddress: row.proposer_address,
      proposerNftTokenId: row.proposer_nft_token,
      reactions: JSON.parse(row.reactions || '{}'),
      commentCount: row.comment_count || 0,
      votingStartTime: row.voting_start_time,
      votingEndTime: row.voting_end_time,
      votesFor: row.votes_for,
      votesAgainst: row.votes_against,
      tags: JSON.parse(row.tags || '[]'),
      relatedAgents: JSON.parse(row.related_agents || '[]'),
      estimatedComplexity: row.complexity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      movedToVotingAt: row.moved_to_voting_at,
      implementedAt: row.implemented_at,
    };
  }

  /**
   * Parse multiple proposals
   */
  private parseProposals(rows: any[]): FeatureProposal[] {
    return rows.map((row) => this.parseProposal(row));
  }

  /**
   * Get DAO statistics
   */
  async getDAOStats(): Promise<{
    totalProposals: number;
    activeProposals: number;
    votingProposals: number;
    implementedProposals: number;
    totalReactions: number;
    totalComments: number;
  }> {
    try {
      const stats = await this.env.CONFIG_DB.prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'voting' THEN 1 ELSE 0 END) as voting,
          SUM(CASE WHEN status = 'implemented' THEN 1 ELSE 0 END) as implemented,
          SUM(comment_count) as total_comments
         FROM dao_proposals`
      ).first();

      const reactionsCount = await this.env.CONFIG_DB.prepare(
        'SELECT COUNT(*) as count FROM dao_reactions'
      ).first();

      return {
        totalProposals: (stats as any)?.total || 0,
        activeProposals: (stats as any)?.active || 0,
        votingProposals: (stats as any)?.voting || 0,
        implementedProposals: (stats as any)?.implemented || 0,
        totalReactions: (reactionsCount as any)?.count || 0,
        totalComments: (stats as any)?.total_comments || 0,
      };
    } catch (error) {
      console.error('[DAO] Get stats error:', error);
      return {
        totalProposals: 0,
        activeProposals: 0,
        votingProposals: 0,
        implementedProposals: 0,
        totalReactions: 0,
        totalComments: 0,
      };
    }
  }
}
