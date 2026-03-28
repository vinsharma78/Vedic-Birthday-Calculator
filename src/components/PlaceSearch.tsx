import * as React from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';

export interface PlaceResult {
  address: string;
  coords: {
    lat: number;
    lng: number;
  };
}

interface PlaceSearchProps {
  onPlaceSelect: (result: PlaceResult) => void;
  disabled?: boolean;
  defaultValue?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export function PlaceSearch({ onPlaceSelect, disabled, defaultValue }: PlaceSearchProps) {
  const [query, setQuery] = React.useState(defaultValue || '');
  const [results, setResults] = React.useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (defaultValue !== undefined) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Nominatim search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 500);
  };

  const handleSelect = (result: NominatimResult) => {
    setQuery(result.display_name);
    setIsOpen(false);
    onPlaceSelect({
      address: result.display_name,
      coords: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && results.length > 0 && setIsOpen(true)}
          placeholder="Search for your birth city..."
          className={`w-full bg-white border border-black/10 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-start gap-3 transition-colors border-b border-black/5 last:border-0"
            >
              <MapPin className="w-4 h-4 mt-1 text-primary shrink-0" />
              <span className="text-sm text-stone-700 line-clamp-2">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
