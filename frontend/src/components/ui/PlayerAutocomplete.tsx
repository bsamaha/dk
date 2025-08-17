import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { MultiSelect, Select } from '@mantine/core';
// Note: Virtualization hooks are installed and ready if needed for giant lists
// import { useVirtualizer } from '@tanstack/react-virtual';
// import { useRef, useEffect } from 'react';
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
    // Reuse same cache entry as sidebar and overview to avoid duplicate requests
    queryKey: ['metadata'],
    queryFn: ({ signal }) => apiService.getMetadata(signal),
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
      const { all_players } = metadataData as unknown as {
        all_players?: unknown;
      };

      if (!all_players) {
        console.log('No all_players property in metadata:', Object.keys(metadataData));
        return [];
      }
      if (!Array.isArray(all_players)) {
        console.log('all_players is not an array:', typeof all_players, all_players);
        return [];
      }

      // Normalize to string[] whether the API returns string[] or { name: string }[]
      const names: string[] = [];
      for (const item of all_players as unknown[]) {
        if (typeof item === 'string') {
          names.push(item);
        } else if (
          item &&
          typeof item === 'object' &&
          'name' in (item as Record<string, unknown>) &&
          typeof (item as Record<string, unknown>).name === 'string'
        ) {
          names.push((item as Record<string, unknown>).name as string);
        }
      }

      // Use Set to track unique player names and prevent duplicates
      const uniqueNames = new Set<string>();
      const options: string[] = [];
      for (const name of names) {
        if (name && !uniqueNames.has(name)) {
          uniqueNames.add(name);
          options.push(name);
        }
      }

      // Avoid huge option arrays causing perf issues: hard cap
      return options.sort().slice(0, 5000);
    } catch (error) {
      console.error('Error processing player options:', error);
      return [];
    }
  }, [metadataData]);

  // Filter options based on search value
  const filteredOptions = useMemo(() => {
    try {
      const search = debouncedSearch.toLowerCase();
      return playerOptions.filter(
        playerName => playerName && playerName.toLowerCase().includes(search)
      );
    } catch (err) {
      console.error('Error filtering options:', err);
      return [];
    }
  }, [playerOptions, debouncedSearch]);

  // Virtualization for large lists
  // For now, rely on Mantine's performant list; enable react-virtual later if needed

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
        comboboxProps={{
          transitionProps: { duration: 200, transition: 'pop' },
          onOptionSubmit: (val: string) => onChange(val || ''),
        }}
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
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const trimmed = searchValue.trim().toLowerCase();
          const exactMatch = filteredOptions.find(
            opt => opt.toLowerCase() === trimmed
          );
          const candidate = exactMatch || filteredOptions[0];
          if (candidate && !value.includes(candidate)) {
            onChange([...value, candidate]);
            setSearchValue('');
          }
        }
      }}
      comboboxProps={{
        transitionProps: { duration: 200, transition: 'pop' },
        classNames: {
          option: 'player-autocomplete-option',
          dropdown: 'player-autocomplete-dropdown',
        },
        styles: {
          dropdown: {
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
        },
      }}
    />
  );
};

export default PlayerAutocomplete;
