import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { MultiSelect, Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { sanitizeSearchTerm } from '../../utils/sanitization';

interface PlayerAutocompleteMultiProps {
  multiple?: true;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface PlayerAutocompleteSingleProps {
  multiple: false;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type PlayerAutocompleteProps =
  | PlayerAutocompleteMultiProps
  | PlayerAutocompleteSingleProps;

const PlayerAutocomplete = (props: PlayerAutocompleteProps) => {
  const {
    multiple = false,
    placeholder = 'Search and select players...',
    disabled = false,
    className = '',
  } = props as PlayerAutocompleteProps & { multiple?: boolean };
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, 300);

  // Fetch all players for autocomplete using metadata endpoint
  const {
    data: metadataData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['metadata', 'all-players'],
    queryFn: () => apiService.getMetadata(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Memoize player options to avoid re-computation
  const playerOptions = useMemo(() => {
    if (!metadataData) {
      return [];
    }
    try {
      if (!metadataData.all_players) {
        console.log(
          'No all_players property in metadata:',
          Object.keys(metadataData)
        );
        return [];
      }
      if (!Array.isArray(metadataData.all_players)) {
        console.log(
          'all_players is not an array:',
          typeof metadataData.all_players,
          metadataData.all_players
        );
        return [];
      }

      // Use Set to track unique player names and prevent duplicates
      const uniqueNames = new Set<string>();
      const options: string[] = [];

      metadataData.all_players.forEach((playerName: string) => {
        if (
          playerName &&
          typeof playerName === 'string' &&
          !uniqueNames.has(playerName)
        ) {
          uniqueNames.add(playerName);
          options.push(playerName);
        }
      });

      return options.sort();
    } catch (error) {
      console.error('Error processing player options:', error);
      return [];
    }
  }, [metadataData]);

  // Filter options based on search value
  const filteredOptions = useMemo(() => {
    try {
      if (!debouncedSearch) return playerOptions;

      const search = debouncedSearch.toLowerCase();
      return playerOptions.filter(
        playerName => playerName && playerName.toLowerCase().includes(search)
      );
    } catch (err) {
      console.error('Error filtering options:', err);
      return playerOptions;
    }
  }, [playerOptions, debouncedSearch]);

  // Show error state if API call failed
  if (error) {
    console.error('PlayerAutocomplete API error:', error);
    return (
      <div className="text-red-600 text-sm p-2 bg-red-50 rounded border">
        Failed to load players. Please refresh the page.
      </div>
    );
  }

  if (multiple === false) {
    // Single select
    const { value, onChange } = props as PlayerAutocompleteSingleProps;
    const selectedClass = value ? 'brand-input-selected' : '';
    return (
      <Select
        className={`brand-input ${selectedClass} ${className}`}
        data={filteredOptions}
        value={value}
        onChange={v => onChange(v || '')}
        searchValue={searchValue}
        onSearchChange={v => setSearchValue(sanitizeSearchTerm(v))}
        placeholder={isLoading ? 'Loading players...' : placeholder}
        searchable
        clearable
        disabled={disabled || isLoading}

        maxDropdownHeight={320}
        comboboxProps={{ transitionProps: { duration: 200, transition: 'pop' } }}
        styles={{
          dropdown: {
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
          input: { borderColor: '#e5e7eb', '&:focus': { borderColor: '#00A86B' } },
        }}
        classNames={{ option: 'player-autocomplete-option' }}
      />
    );
  }

  // Multi-select (default)
  const { value, onChange } = props as PlayerAutocompleteMultiProps;
  return (
    <MultiSelect
      className={`brand-input ${className}`}
      data={filteredOptions}
      value={value}
      onChange={newValues => {
        onChange(newValues);
      }}
      searchValue={searchValue}
      onSearchChange={val => setSearchValue(sanitizeSearchTerm(val))}
      placeholder={isLoading ? 'Loading players...' : placeholder}
      searchable
      clearable
      disabled={disabled || isLoading}
      limit={50}
      maxDropdownHeight={320}
      comboboxProps={{ transitionProps: { duration: 200, transition: 'pop' } }}
      styles={{
        dropdown: {
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        },
        input: { borderColor: '#e5e7eb', '&:focus': { borderColor: '#00A86B' } },
      }}
      classNames={{ option: 'player-autocomplete-option' }}
    />
  );
};

export default PlayerAutocomplete;
