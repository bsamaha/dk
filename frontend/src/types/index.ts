// API Response Types
export interface MetadataResponse {
  total_players: number;
  total_drafts: number;
  total_teams: number;
  all_players: string[];
}

export interface Player {
  name: string;
  position: Position;
  team: string;
  avg_pick: number | null;
  min_pick: number | null;
  max_pick: number | null;
  draft_percentage: number;
}

export interface PlayerDetails {
  player_name: string;
  position: string;
  team: string;
  picks: number[];
  rounds: number[];
  avg_pick?: number;
  min_pick?: number;
  max_pick?: number;
  std_dev_pick?: number;
  total_drafts?: number;
}

export interface PlayersResponse {
  players: Player[];
  total_count: number;
  page_info: {
    total_count: number;
    limit: number;
    offset: number;
    has_next: boolean;
    has_previous: boolean;
    current_page: number;
    total_pages: number;
  };
}

export interface PositionStats {
  position: Position;
  total_drafted: number;
  unique_players: number;
  avg_pick: number;
  avg_draft_position: number;
  median_draft_count: number;
}

export interface PositionStatsResponse {
  position_stats: PositionStats[];
  total_picks: number;
}

export interface FirstPlayerDraftStats {
  Position: string;
  avg_first_pick: number;
  min_first_pick: number;
  max_first_pick: number;
}

export interface PositionRoundCount {
  round: number;
  count: number;
}

export interface PositionRoundCountsResponse {
  position: Position;
  round_counts: PositionRoundCount[];
}

export interface TeamCombination {
  team_id: number;
  draft_id: number;
  draft_position: number;
  players: string[];
  position_counts: string;
}

export interface CombinationsResponse {
  combinations: TeamCombination[];
  total_combinations: number;
  filter_applied: {
    required_players: string[];
    n_rounds: number;
    limit: number;
  };
}

export interface RosterConstruction {
  draft_id: number;
  team_id: number;
  position_counts: Record<string, number>;
}

export interface RosterConstructionResponse {
  roster_constructions: RosterConstruction[];
}

export interface RosterConstructionCount {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K?: number;
  DST?: number;
  count: number;
}

// Position type using const assertion
export const Position = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DST: "DST"
} as const;

export type Position = typeof Position[keyof typeof Position];

// Filter Types
export const SortableColumn = {
  NAME: "name",
  POSITION: "position",
  TEAM: "team",
  DRAFT_PERCENTAGE: "draft_percentage",
  AVG_PICK: "avg_pick",
  AVG_ROUND: "avg_round",
} as const;

export type SortableColumn = typeof SortableColumn[keyof typeof SortableColumn];

export const SortOrder = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortOrder = typeof SortOrder[keyof typeof SortOrder];

export interface PlayerFilter {
  positions?: Position[];
  search_term?: string;
  limit?: number;
  offset?: number;
  sort_by?: SortableColumn;
  sort_order?: SortOrder;
}

export interface CombinationFilter {
  required_players: string[];
  n_rounds: number;
  limit?: number;
}

// UI State Types
export interface AppState {
  selectedPlayers: string[];
  currentView: 'overview' | 'players' | 'combinations';
  filters: PlayerFilter;
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}
