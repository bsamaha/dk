import { useState, useMemo } from 'react';
import { MultiSelect } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

interface PlayerAutocompleteProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const PlayerAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Search and select players...",
  disabled = false,
  className = ""
}: PlayerAutocompleteProps) => {
  const [searchValue, setSearchValue] = useState('');

  // Fetch all players for autocomplete using metadata endpoint
  const { data: metadataData, isLoading, error } = useQuery({
    queryKey: ['metadata', 'all-players'],
    queryFn: () => apiService.getMetadata(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Memoize player options to avoid re-computation
  const playerOptions = useMemo(() => {
    try {
      console.log('Processing metadata data:', metadataData);
      if (!metadataData) {
        console.log('No metadataData received');
        return [];
      }
      if (!metadataData.all_players) {
        console.log('No all_players property in metadata:', Object.keys(metadataData));
        return [];
      }
      if (!Array.isArray(metadataData.all_players)) {
        console.log('all_players is not an array:', typeof metadataData.all_players, metadataData.all_players);
        return [];
      }
      
      console.log('Processing player options from', metadataData.all_players.length, 'players');
      
      // Use Set to track unique player names and prevent duplicates
      const uniqueNames = new Set<string>();
      const options: string[] = [];
      
      metadataData.all_players.forEach((playerName: string) => {
        if (playerName && typeof playerName === 'string' && !uniqueNames.has(playerName)) {
          uniqueNames.add(playerName);
          options.push(playerName);
        }
      });
      
      console.log('Generated', options.length, 'unique player options');
      return options.sort();
    } catch (error) {
      console.error('Error processing player options:', error);
      return [];
    }
  }, [metadataData]);

  // Filter options based on search value
  const filteredOptions = useMemo(() => {
    try {
      if (!searchValue) return playerOptions;
      
      const search = searchValue.toLowerCase();
      return playerOptions.filter(playerName => 
        playerName && playerName.toLowerCase().includes(search)
      );
    } catch (err) {
      console.error('Error filtering options:', err);
      return playerOptions;
    }
  }, [playerOptions, searchValue]);

  // Show error state if API call failed
  if (error) {
    console.error('PlayerAutocomplete API error:', error);
    return (
      <div className="text-red-600 text-sm p-2 bg-red-50 rounded border">
        Failed to load players. Please refresh the page.
      </div>
    );
  }

  return (
    <MultiSelect
      data={filteredOptions}
      value={value}
      onChange={onChange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      placeholder={isLoading ? 'Loading players...' : placeholder}
      searchable
      clearable
      disabled={disabled || isLoading}
      className={className}
      limit={20}
      maxDropdownHeight={300}
      comboboxProps={{
        transitionProps: { duration: 200, transition: 'pop' },
      }}
      styles={{
        pill: {
          backgroundColor: '#f97316',
          color: 'white',
          '&:hover': {
            backgroundColor: '#ea580c',
          },
        },
        pillsList: {
          gap: '4px',
        },
        dropdown: {
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        },
        input: {
          borderColor: '#e5e7eb',
          '&:focus': {
            borderColor: '#1e3a8a',
          },
        },
      }}
      renderOption={({ option, checked }) => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {}}
            className="text-navy-600 focus:ring-navy-500"
          />
          <span className="flex-1">{option.label}</span>
        </div>
      )}
    />
  );
};

export default PlayerAutocomplete;
