import axios from 'axios';
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
  RosterConstructionResponse
} from '../types';


// Create axios instance with base configuration
// Determine API base URL dynamically
// Determine whether we're running under a local Vite/React dev server.
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isDevServerPort = window.location.port === '5173' || window.location.port === '3000';

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

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
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
    
    if (filters.search_term) {
      params.append('search_term', filters.search_term);
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
  async searchPlayers(query: string, limit: number = 20): Promise<{
    query: string;
    results: any[];
    total_found: number;
  }> {
    const response = await api.get(`/players/search?q=${encodeURIComponent(query)}&limit=${limit}`);
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
  async getPositionDraftCountsByRound(position: Position, aggregation: 'mean' | 'median' = 'mean'): Promise<PositionRoundCountsResponse> {
    const response = await api.get(`/positions/stats/${position}/by_round?aggregation=${aggregation}`);
    return response.data;
  },

  // Get player combinations
  async getPlayerCombinations(filters: CombinationFilter): Promise<CombinationsResponse> {
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
  async getRosterConstructionCounts(): Promise<any> { // TODO: Define a proper type for this
    const response = await api.get('/positions/roster-construction/counts');
    return response.data;
  },

  // Get team data
  async getTeams(limit: number = 100): Promise<any> {
    const response = await api.get(`/teams/?limit=${limit}`);
    return response.data;
  },

  // Get player details
  async getPlayerDetails(playerName: string, position: string, team: string): Promise<PlayerDetails> {
    const params = new URLSearchParams({
      player_name: playerName,
      position: position,
      team: team,
    });
    const response = await api.get(`/players/details?${params.toString()}`);
    return response.data;
  },
};

export default api;
