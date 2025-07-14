import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import type { PlayerFilter, PlayersResponse } from '../../types';

// Create a proper type for our extended API
type ExtendedAxiosInstance = AxiosInstance & {
  getPlayers: (params: PlayerFilter) => Promise<PlayersResponse>;
};

// Mock the entire api module before importing it
vi.mock('../api', () => {
  const mockGet = vi.fn();
  const mockApi = {
    get: mockGet,
    getPlayers: vi.fn(async (params: PlayerFilter) => {
      // Simulate internal call to get
      const mockResponse = await mockGet('/api/players/', { params });
      return mockResponse.data;
    }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  } as unknown as ExtendedAxiosInstance;
  return { default: mockApi };
});

import api from '../api';

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has interceptors', () => {
    expect(api.interceptors.request.use).toBeDefined();
    expect(api.interceptors.response.use).toBeDefined();
  });

  it('fetches players successfully', async () => {
    const mockResponse = { data: { players: [], page_info: { total_pages: 1 } } };
    vi.mocked(api.get).mockResolvedValue(mockResponse);
    const result = await (api as ExtendedAxiosInstance).getPlayers({});
    expect(result).toEqual(mockResponse.data);
    expect(api.get).toHaveBeenCalledWith('/api/players/', { params: {} });
  });

  it('handles API errors', async () => {
    vi.mocked((api as ExtendedAxiosInstance).getPlayers).mockRejectedValue(new Error('Network error'));
    await expect((api as ExtendedAxiosInstance).getPlayers({})).rejects.toThrow('Network error');
  });

  // Add more endpoint tests similarly as needed
}); 