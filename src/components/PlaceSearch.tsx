import * as React from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

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

export function PlaceSearch({ onPlaceSelect, disabled, defaultValue }: PlaceSearchProps) {
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const onPlaceSelectRef = React.useRef(onPlaceSelect);
  
  // Keep the ref up to date
  React.useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  // Update input value when defaultValue changes from outside
  React.useEffect(() => {
    if (inputRef.current && defaultValue !== undefined && inputRef.current.value !== defaultValue) {
      inputRef.current.value = defaultValue;
    }
  }, [defaultValue]);

  React.useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        onPlaceSelectRef.current({
          address: place.formatted_address || place.name || '',
          coords: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
        });
      }
    });

    return () => {
      if (window.google?.maps?.event && listener) {
        listener.remove();
      }
    };
  }, [placesLib]);

  const handleBlur = async () => {
    if (!geocodingLib || !inputRef.current?.value) return;
    
    // Small delay to allow place_changed to fire first if it was a selection
    setTimeout(async () => {
      const geocoder = new geocodingLib.Geocoder();
      try {
        const result = await geocoder.geocode({ address: inputRef.current!.value });
        if (result.results && result.results[0]) {
          const first = result.results[0];
          onPlaceSelectRef.current({
            address: first.formatted_address,
            coords: {
              lat: first.geometry.location.lat(),
              lng: first.geometry.location.lng(),
            },
          });
        }
      } catch (e) {
        console.error('Geocoding failed on blur:', e);
      }
    }, 200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update the address string in the parent, but without coordinates yet
    // This provides immediate feedback in the UI
    onPlaceSelectRef.current({
      address: e.target.value,
      coords: null as any // Parent should handle null coords as "not yet geocoded"
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      disabled={disabled}
      onBlur={handleBlur}
      onChange={handleChange}
      placeholder="Search for your birth city..."
      className={`w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    />
  );
}
