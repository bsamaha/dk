import { z } from 'zod';
import type {
  PlayersResponse,
  MetadataResponse,
  PositionStatsResponse,
  DraftSlotResponse,
  Player,
} from '../types';
import { Position } from '../types';

// -------------------------------
// Schemas
// -------------------------------

export const PlayerSchema = z.object({
  name: z.string().min(1),
  position: z
    .string()
    .min(1)
    .transform((val): Position => {
      if (Object.values(Position).includes(val as Position)) {
        return val as Position;
      }
      throw new Error(`Invalid position: ${val}`);
    }),
  team: z.string().min(1),
  avg_pick: z.number().nullable(),
  min_pick: z.number().nullable(),
  max_pick: z.number().nullable(),
  draft_percentage: z.number(),
});

// Metadata schema
export const MetadataResponseSchema: z.ZodSchema<MetadataResponse> = z.object({
  total_players: z.number(),
  total_drafts: z.number(),
  total_teams: z.number(),
  all_players: z.array(z.string()),
});

// Position stats schemas
export const PositionStatsSchema = z.object({
  position: z.string().transform((val): Position => {
    if (Object.values(Position).includes(val as Position)) {
      return val as Position;
    }
    throw new Error(`Invalid position: ${val}`);
  }),
  total_drafted: z.number(),
  unique_players: z.number(),

  median_draft_count: z.number(),
});
export const PositionStatsResponseSchema = z.object({
  position_stats: z.array(PositionStatsSchema),
  total_picks: z.number(),
}) as z.ZodType<PositionStatsResponse>;

export const PlayersResponseSchema = z.object({
  players: z.array(PlayerSchema),
  total_count: z.number(),
  page_info: z.object({
    total_count: z.number(),
    limit: z.number(),
    offset: z.number(),
    has_next: z.boolean(),
    has_previous: z.boolean(),
    current_page: z.number(),
    total_pages: z.number(),
  }),
}) as z.ZodType<PlayersResponse>;

// -------------------------------
// Additional Schemas (Phase-3)
// -------------------------------

export const FirstPlayerDraftStatsSchema = z.object({
  Position: z.string(),
  avg_first_pick: z.number(),
  min_first_pick: z.number(),
  max_first_pick: z.number(),
});

export const PositionRoundCountSchema = z.object({
  round: z.number(),
  count: z.number(),
});
export const PositionRoundCountsResponseSchema = z.array(
  PositionRoundCountSchema
);

// Combinations
export const TeamCombinationSchema = z.object({
  draft_id: z.number(),
  draft_position: z.number(),
  players: z.array(z.string()),
  position_counts: z.string(),
});
export const CombinationsResponseSchema = z.object({
  combinations: z.array(TeamCombinationSchema),
  total_combinations: z.number(),
  filter_applied: z.object({
    required_players: z.array(z.string()),
    n_rounds: z.number(),
    limit: z.number(),
  }),
});

// Roster construction
export const RosterConstructionSchema = z.object({
  draft_id: z.number(),
  draft_position: z.number(),
  position_counts: z.record(z.string(), z.number()),
});
export const RosterConstructionResponseSchema = z.object({
  roster_constructions: z.array(RosterConstructionSchema),
});
export const RosterConstructionCountSchema = z.object({
  QB: z.number(),
  RB: z.number(),
  WR: z.number(),
  TE: z.number(),
  count: z.number(),
});

// Teams
export const TeamsResponseSchema = z.object({
  teams: z.array(z.string()),
  total_count: z.number(),
});

// Player details
export const PlayerDetailsSchema = z.object({
  player_name: z.string(),
  position: z.string(),
  team: z.string(),
  picks: z.array(z.number()),
  rounds: z.array(z.number()),
  // Backend may return null for these stats; accept null/undefined
  avg_pick: z.number().nullable().optional(),
  min_pick: z.number().nullable().optional(),
  max_pick: z.number().nullable().optional(),
  std_dev_pick: z.number().nullable().optional(),
  total_drafts: z.number().nullable().optional(),
});

// Draft slot
export const DraftSlotRowSchema = z.object({
  player: z.string(),
  slot: z.number(),
  overall: z.number(),
  p_slot: z.number(),
  p_overall: z.number(),
  score: z.number(),
});
export const DraftSlotResponseSchema = z.object({
  slot: z.number(),
  metric: z.string().transform((val): 'count' | 'percent' | 'ratio' => {
    if (['count', 'percent', 'ratio'].includes(val)) {
      return val as 'count' | 'percent' | 'ratio';
    }
    throw new Error(`Invalid metric: ${val}`);
  }),
  rows: z.array(DraftSlotRowSchema),
}) as z.ZodType<DraftSlotResponse>;

// Week 17 bringback
export const Week17BringBackPlayerSchema = z.object({
  player: z.string(),
  position: z.string(),
  percentage: z.number(),
  draft_count: z.number().nullable().optional(),
  co_occurrence_count: z.number().nullable().optional(),
});
export const Week17BringBackResponseSchema = z.object({
  scope: z.string(),
  entity: z.string(),
  opponent: z.string().optional(),
  total_drafts: z.number(),
  players: z.array(Week17BringBackPlayerSchema),
});

// Search players response
export const SearchPlayersResponseSchema = z.object({
  query: z.string(),
  results: z.array(PlayerSchema),
  total_found: z.number(),
}) as z.ZodType<{
  query: string;
  results: Player[];
  total_found: number;
}>;

// Generic helper to validate arbitrary API responses.
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T {
  return schema.parse(data);
}
