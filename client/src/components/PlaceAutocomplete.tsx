import { useEffect, useMemo, useState } from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";

export type PlaceOption = {
  label: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

function toPlaceOption(result: NominatimResult): PlaceOption {
  return {
    label: result.display_name,
    address: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
    city: result.address?.city ?? result.address?.town ?? result.address?.village ?? result.address?.municipality
  };
}

export default function PlaceAutocomplete({
  label,
  value,
  city,
  required,
  onAddressChange,
  onPlaceSelect
}: {
  label: string;
  value?: string;
  city?: string;
  required?: boolean;
  onAddressChange: (address: string) => void;
  onPlaceSelect: (place: PlaceOption) => void;
}) {
  const [inputValue, setInputValue] = useState(value ?? "");
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  const searchUrl = useMemo(() => {
    const query = inputValue.trim();
    if (query.length < 3) return "";
    const cityQuery = city?.trim();
    const params = new URLSearchParams({
      q: cityQuery ? `${query}, ${cityQuery}, Lithuania` : query,
      format: "json",
      addressdetails: "1",
      countrycodes: "lt",
      bounded: "1",
      viewbox: "20.9,56.5,26.9,53.8",
      limit: "6"
    });
    return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  }, [city, inputValue]);

  useEffect(() => {
    if (!searchUrl) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(searchUrl, { signal: controller.signal })
        .then((response) => response.json())
        .then((results: NominatimResult[]) => setOptions(results.map(toPlaceOption)))
        .catch((error) => {
          if (error.name !== "AbortError") setOptions([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchUrl]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      filterOptions={(items) => items}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
      inputValue={inputValue}
      onInputChange={(_event, nextValue) => {
        setInputValue(nextValue);
        onAddressChange(nextValue);
      }}
      onChange={(_event, option) => {
        if (!option || typeof option === "string") return;
        setInputValue(option.address);
        onPlaceSelect(option);
      }}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          helperText={city?.trim() ? `Search ${city.trim()}, Lithuania and select a place.` : "Search Lithuania and select a place to fill address, latitude, and longitude."}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
}
