import axios from 'axios';

// Extend axios config to include metadata for performance tracking
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}
import type {
  MetadataResponse,
  PlayersResponse,
  PositionStatsResponse,
  PlayerFilter,
  CombinationFilter,
  CombinationsResponse,
  PlayerDetails,
  FirstPlayerDraftStats,
  PositionRoundCountsResponse,
  Position,
  DraftSlotResponse,
  RosterConstructionResponse,
  Player,
  RosterConstructionCount,
  Week17BringBackResponse,
} from '../types';
import { sanitizeSearchTerm, isValidSearchTerm } from '../utils/sanitization';
import { trackPerformance, trackError } from '../utils/analytics';
import { z } from 'zod';
import {
  validateApiResponse,
  PlayersResponseSchema,
  MetadataResponseSchema,
  PositionStatsResponseSchema,
  FirstPlayerDraftStatsSchema,
  CombinationsResponseSchema,
  RosterConstructionResponseSchema,
  RosterConstructionCountSchema,
  TeamsResponseSchema,
  PlayerDetailsSchema,
  DraftSlotResponseSchema,
  Week17BringBackResponseSchema,
  SearchPlayersResponseSchema,
} from '../utils/api-validation';

// Create axios instance with base configuration
// Determine API base URL dynamically
// Determine whether we're running under a local Vite/React dev server.
const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';
const isDevServerPort = window.location.port === '5173';

// 1) Prefer explicit build-time environment variable (defined in .env or CI)
const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  // 2) If we're on localhost *and* the port matches a known Vite dev server
  (isLocalhost && isDevServerPort
    ? 'http://localhost:8000/api'
    : // 3) Otherwise (docker / prod) use same-origin relative path handled by FastAPI
      '/api');

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Schema mapping for centralized validation
const endpointSchemas: Record<string, z.ZodSchema> = {
  '/metadata/': MetadataResponseSchema,
  '/players/': PlayersResponseSchema,
  '/players/search': SearchPlayersResponseSchema,
  '/positions/stats': PositionStatsResponseSchema,
  '/positions/stats/first_player': z.array(FirstPlayerDraftStatsSchema),
  '/combinations/': CombinationsResponseSchema,
  '/positions/roster-construction/': RosterConstructionResponseSchema,
  '/positions/roster-construction/counts': z.array(
    RosterConstructionCountSchema
  ),
  '/teams/': TeamsResponseSchema,
  '/players/details': PlayerDetailsSchema,
  '/analytics/draft-slot': DraftSlotResponseSchema,
  '/analytics/week17-bringback': Week17BringBackResponseSchema,
};

// Helper function to find matching schema for URL
function findSchemaForUrl(url: string): z.ZodSchema | null {
  // Remove query parameters for matching
  const path = url.split('?')[0];

  // Try exact match first
  if (endpointSchemas[path]) {
    return endpointSchemas[path];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, schema] of Object.entries(endpointSchemas)) {
    if (pattern.includes('{') || pattern.includes('*')) {
      // Simple pattern matching - could be enhanced with regex
      const patternParts = pattern.split('/');
      const pathParts = path.split('/');

      if (patternParts.length === pathParts.length) {
        let matches = true;
        for (let i = 0; i < patternParts.length; i++) {
          if (
            patternParts[i] !== pathParts[i] &&
            !patternParts[i].startsWith('{') &&
            patternParts[i] !== '*'
          ) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return schema;
        }
      }
    }
  }

  return null;
}

// Add request interceptor for logging and performance tracking
api.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    // Add timestamp for performance tracking
    config.metadata = { startTime: performance.now() };
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    trackError('API Request', error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for centralized validation and error handling
api.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} ${response.config.url}`);

    // Track performance if we have start time
    if (response.config.metadata?.startTime) {
      const duration = performance.now() - response.config.metadata.startTime;
      const endpoint = response.config.url?.split('?')[0] || 'unknown';
      trackPerformance(`API ${endpoint}`, duration);
    }

    // Apply schema validation if schema exists for this endpoint
    const schema = findSchemaForUrl(response.config.url || '');
    if (schema) {
      try {
        response.data = validateApiResponse(response.data, schema);
      } catch (error) {
        console.error('Schema validation failed:', error);
        trackError(
          'API Validation',
          `Schema validation failed for ${response.config.url}`
        );
        return Promise.reject(error);
      }
    }

    return response;
  },
  error => {
    console.error(
      'API Response Error:',
      error.response?.status,
      error.response?.data
    );

    // Track API errors
    const endpoint = error.config?.url?.split('?')[0] || 'unknown';
    const status = error.response?.status || 'network_error';
    trackError('API Response', `${status} - ${endpoint}`);

    return Promise.reject(error);
  }
);

// API Functions
export const apiService = {
  // Get metadata
  async getMetadata(): Promise<MetadataResponse> {
    const response = await api.get('/metadata/');
    return response.data;
  },

  // Get players with filtering
  async getPlayers(filters: PlayerFilter = {}): Promise<PlayersResponse> {
    const params = new URLSearchParams();

    const sanitizedSearch =
      filters.search_term && isValidSearchTerm(filters.search_term)
        ? sanitizeSearchTerm(filters.search_term)
        : undefined;
    if (sanitizedSearch) {
      params.append('search_term', sanitizedSearch);
    }

    if (filters.positions && filters.positions.length > 0) {
      filters.positions.forEach(pos => params.append('positions', pos));
    }

    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }

    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }

    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    const response = await api.get(`/players/?${params.toString()}`);
    return response.data;
  },

  // Search players by name
  async searchPlayers(
    query: string,
    limit: number = 20
  ): Promise<{
    query: string;
    results: Player[];
    total_found: number;
  }> {
    const response = await api.get(
      `/players/search?q=${encodeURIComponent(sanitizeSearchTerm(isValidSearchTerm(query) ? query : ''))}&limit=${limit}`
    );
    return response.data;
  },

  // Get position statistics
  async getPositionStats(): Promise<PositionStatsResponse> {
    const response = await api.get('/positions/stats');
    return response.data;
  },

  // Get first player draft stats
  async getFirstPlayerDraftStats(): Promise<FirstPlayerDraftStats[]> {
    const response = await api.get('/positions/stats/first_player');
    return response.data;
  },

  // Get position draft counts by round
  async getPositionDraftCountsByRound(
    position: Position,
    aggregation: 'mean' | 'median' = 'mean'
  ): Promise<PositionRoundCountsResponse> {
    const response = await api.get(
      `/positions/stats/${position}/by_round?aggregation=${aggregation}`
    );
    return response.data;
  },

  // Get player combinations
  async getPlayerCombinations(
    filters: CombinationFilter
  ): Promise<CombinationsResponse> {
    const params = new URLSearchParams();
    filters.required_players.forEach(p => params.append('required_players', p));
    params.append('n_rounds', filters.n_rounds.toString());
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    const response = await api.get(`/combinations/?${params.toString()}`);
    return response.data;
  },

  // Get roster construction data
  async getRosterConstruction(): Promise<RosterConstructionResponse> {
    const response = await api.get('/positions/roster-construction/');
    return response.data;
  },

  // Get aggregated roster construction counts
  async getRosterConstructionCounts(
    required_players?: string[]
  ): Promise<RosterConstructionCount[]> {
    const params = new URLSearchParams();
    if (required_players && required_players.length > 0) {
      required_players.forEach(p => params.append('required_players', p));
    }
    const response = await api.get(
      `/positions/roster-construction/counts?${params.toString()}`
    );
    return response.data;
  },

  // Get team data
  async getTeams(
    limit: number = 100
  ): Promise<{ teams: string[]; total_count: number }> {
    const response = await api.get(`/teams/?limit=${limit}`);
    return response.data;
  },

  // Get player details
  async getPlayerDetails(
    playerName: string,
    position: string,
    team: string
  ): Promise<PlayerDetails> {
    const params = new URLSearchParams({
      player_name: playerName,
      position: position,
      team: team,
    });
    const response = await api.get(`/players/details?${params.toString()}`);
    return response.data;
  },

  // ---------------- Draft Slot Correlation ----------------
  async getDraftSlotCorrelation(
    slot: number,
    metric: 'count' | 'percent' | 'ratio' = 'percent',
    top_n: number = 25
  ): Promise<DraftSlotResponse> {
    const params = new URLSearchParams({
      slot: slot.toString(),
      metric,
      top_n: top_n.toString(),
    });
    const response = await api.get(
      `/analytics/draft-slot?${params.toString()}`
    );
    return response.data;
  },

  // ---------------- Week 17 Bring Back ----------------
  async getWeek17Bringback(
    scope: 'team' | 'player',
    entity: string,
    limit: number = 10
  ): Promise<Week17BringBackResponse> {
    const params = new URLSearchParams({
      scope,
      entity,
      limit: limit.toString(),
    });
    const response = await api.get(
      `/analytics/week17-bringback?${params.toString()}`
    );
    return response.data;
  },
};

export default api;
