import axios from 'axios';
import { getOrSet, HTTP_CACHE_TTL } from './httpCache';

// Create a unique symbol for metadata to prevent conflicts
const METADATA_SYMBOL = Symbol('analytics-metadata');

// Extend axios config to include metadata for performance tracking
declare module 'axios' {
  interface AxiosRequestConfig {
    [METADATA_SYMBOL]?: {
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
import { getOpenApiClient } from './openapiClient';
// Runtime validation is handled via backend's OpenAPI and optional generated client.
// We no longer maintain manual Zod schema mapping here.

// Create axios instance with base configuration
// Determine API base URL dynamically
// Determine whether we're running under a local Vite/React dev server.
// 1) Prefer explicit build-time environment variable (defined in .env or CI)
// 2) In development, always talk to the backend at localhost:8000
// 3) Otherwise (docker / prod) use same-origin relative path handled by FastAPI
// Prefer relative '/api' so Vite dev proxy handles CORS locally; allow explicit override via VITE_API_BASE_URL
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const loadLogger = () => import('../utils/logger');

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dev helper: log resolved API base once on module init
if (import.meta.env.DEV) {
  loadLogger().then(({ devLog }) =>
    devLog('[API] baseURL resolved', {
      baseURL,
      dev: import.meta.env.DEV,
      origin: typeof window !== 'undefined' ? window.location.origin : 'n/a',
    })
  );
}

// Note: For strong runtime validation, generate a client via `pnpm openapi:zod`
// which outputs `src/types/api.zod.ts`. You can integrate those schemas in
// components or services as needed.

// Add request interceptor for logging and performance tracking
api.interceptors.request.use(
  async config => {
    // Lazy-load logger for dev-only usage to keep initial bundle smaller
    if (import.meta.env.DEV) {
      const { devLog } = await loadLogger();
      devLog(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    // Add timestamp for performance tracking using symbol
    config[METADATA_SYMBOL] = { startTime: performance.now() };
    return config;
  },
  error => {
    // Ignore noisy logs for canceled requests (React StrictMode / fast nav)
    if (
      (error && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')) ||
      (typeof error?.message === 'string' && error.message.includes('canceled'))
    ) {
      return Promise.reject(error);
    }
    // Lazy log errors in dev
    if (import.meta.env.DEV) loadLogger().then(({ devError }) => devError('API Request Error:', error));
    trackError('API Request', error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for centralized validation and error handling
api.interceptors.response.use(
  async response => {
    if (import.meta.env.DEV) {
      const { devLog } = await loadLogger();
      devLog(`API Response: ${response.status} ${response.config.url}`);
    }

    // Track performance if we have start time
    if (response.config[METADATA_SYMBOL]?.startTime) {
      const duration =
        performance.now() - response.config[METADATA_SYMBOL].startTime;
      const endpoint = response.config.url?.split('?')[0] || 'unknown';
      trackPerformance(`API ${endpoint}`, duration);
    }

    return response;
  },
  error => {
    // Ignore canceled requests to avoid log noise in dev
    if (
      (error && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')) ||
      (typeof error?.message === 'string' && error.message.includes('canceled'))
    ) {
      return Promise.reject(error);
    }

    if (import.meta.env.DEV) loadLogger().then(({ devError }) => devError('API Response Error:', error.response?.status, error.response?.data));

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
  async getMetadata(signal?: AbortSignal): Promise<MetadataResponse> {
    // Try generated client first
    const client = await getOpenApiClient();
    if (client) {
      const res = await client.GET('/metadata/', { signal });
      return res.data as MetadataResponse;
    }
    return getOrSet(
      'GET /metadata/',
      async () => {
        const response = await api.get('/metadata/', { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.METADATA
    );
  },

  // Get players with filtering
  async getPlayers(
    filters: PlayerFilter = {},
    signal?: AbortSignal
  ): Promise<PlayersResponse> {
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

    const response = await api.get(`/players/?${params.toString()}`, { signal });
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
  async getPositionStats(signal?: AbortSignal): Promise<PositionStatsResponse> {
    const client = await getOpenApiClient();
    if (client) {
      const res = await client.GET('/positions/stats', { signal });
      return res.data as PositionStatsResponse;
    }
    return getOrSet(
      'GET /positions/stats',
      async () => {
        const response = await api.get('/positions/stats', { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.POSITION_STATS
    );
  },

  // Get first player draft stats
  async getFirstPlayerDraftStats(signal?: AbortSignal): Promise<FirstPlayerDraftStats[]> {
    const response = await api.get('/positions/stats/first_player', { signal });
    return response.data;
  },

  // Get position draft counts by round
  async getPositionDraftCountsByRound(
    position: Position,
    aggregation: 'mean' | 'median' = 'mean'
  , signal?: AbortSignal): Promise<PositionRoundCountsResponse> {
    const url = `/positions/stats/${position}/by_round?aggregation=${aggregation}`;
    if (import.meta.env.DEV) {
      loadLogger().then(({ devLog }) =>
        devLog('[API] getPositionDraftCountsByRound', {
          position,
          aggregation,
          url,
        })
      );
    }
    const client = await getOpenApiClient();
    if (client) {
      const res = await client.GET('/positions/stats/{position}/by_round', {
        params: { path: { position }, query: { aggregation } },
        signal,
      });
      return res.data as PositionRoundCountsResponse;
    }
    return getOrSet(
      `GET ${url}`,
      async () => {
        const response = await api.get(url, { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.ROUND_COUNTS
    );
  },

  // Get player combinations
  async getPlayerCombinations(
    filters: CombinationFilter,
    signal?: AbortSignal
  ): Promise<CombinationsResponse> {
    const params = new URLSearchParams();
    filters.required_players.forEach(p => params.append('required_players', p));
    params.append('n_rounds', filters.n_rounds.toString());
    params.append('limit', String(filters.limit ?? 50));
    if (typeof filters.offset === 'number') {
      params.append('offset', String(filters.offset));
    }
    const url = `/combinations/?${params.toString()}`;
    return getOrSet(
      `GET ${url}`,
      async () => {
        const response = await api.get(url, { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.COMBINATIONS
    );
  },

  // Get roster construction data
  async getRosterConstruction(signal?: AbortSignal): Promise<RosterConstructionResponse> {
    return getOrSet(
      'GET /positions/roster-construction/',
      async () => {
        const response = await api.get('/positions/roster-construction/', { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.ROSTER_CONSTRUCTION
    );
  },

  // Get aggregated roster construction counts
  async getRosterConstructionCounts(
    required_players?: string[],
    signal?: AbortSignal
  ): Promise<RosterConstructionCount[]> {
    const params = new URLSearchParams();
    if (required_players && required_players.length > 0) {
      required_players.forEach(p => params.append('required_players', p));
    }
    const url = `/positions/roster-construction/counts?${params.toString()}`;
    return getOrSet(
      `GET ${url}`,
      async () => {
        const response = await api.get(url, { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.ROSTER_COUNTS
    );
  },

  // Get team data
  async getTeams(
    limit: number = 100,
    signal?: AbortSignal
  ): Promise<{ teams: string[]; total_count: number }> {
    const url = `/teams/?limit=${limit}`;
    return getOrSet(
      `GET ${url}`,
      async () => {
        const response = await api.get(url, { signal });
        return response.data;
      },
      HTTP_CACHE_TTL.TEAMS
    );
  },

  // Get player details
  async getPlayerDetails(
    playerName: string,
    position: string,
    team: string
  , signal?: AbortSignal): Promise<PlayerDetails> {
    const params = new URLSearchParams({
      player_name: playerName,
      position: position,
      team: team,
    });
    const response = await api.get(`/players/details?${params.toString()}`,
      { signal }
    );
    return response.data;
  },

  // ---------------- Draft Slot Correlation ----------------
  async getDraftSlotCorrelation(
    slot: number,
    metric: 'count' | 'percent' | 'ratio' = 'percent',
    top_n: number = 25
  , signal?: AbortSignal): Promise<DraftSlotResponse> {
    const params = new URLSearchParams({
      slot: slot.toString(),
      metric,
      top_n: top_n.toString(),
    });
    const response = await api.get(
      `/analytics/draft-slot?${params.toString()}`,
      { signal }
    );
    return response.data;
  },

  // ---------------- Week 17 Bring Back ----------------
  async getWeek17Bringback(
    scope: 'team' | 'player',
    entity: string,
    limit: number = 10
  , signal?: AbortSignal): Promise<Week17BringBackResponse> {
    const params = new URLSearchParams({
      scope,
      entity,
      limit: limit.toString(),
    });
    const response = await api.get(
      `/analytics/week17-bringback?${params.toString()}`,
      { signal }
    );
    return response.data;
  },
};

export default api;
