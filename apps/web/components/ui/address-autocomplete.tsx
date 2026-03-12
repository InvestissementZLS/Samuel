"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelectAddress: (address: string, details?: any) => void;
    placeholder?: string;
    className?: string;
}

export function AddressAutocomplete({ value, onChange, onSelectAddress, placeholder, className }: AddressAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSuggestions = useCallback((input: string) => {
        if (!input || input.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        // Using Nominatim OpenStreetMap API for free address autocomplete
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&addressdetails=1&limit=5&countrycodes=ca`;
        
        fetch(url, { headers: { 'Accept-Language': 'fr,en' } })
            .then(res => res.json())
            .then(data => {
                setSuggestions(data);
                setShowSuggestions(true);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Nominatim fetch error:", err);
                setSuggestions([]);
                setIsLoading(false);
            });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        onChange(val);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        timeoutRef.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 500); // Debounce 500ms to respect OpenStreetMap usage limits
    };

    const handleSelect = (suggestion: any) => {
        const formattedAddress = suggestion.display_name;
        onChange(formattedAddress);
        setShowSuggestions(false);
        onSelectAddress(formattedAddress, suggestion);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <textarea
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder={placeholder || "Commencez à écrire une adresse..."}
                    className={className || "w-full rounded-md border p-2 bg-background text-foreground pr-8"}
                    rows={2}
                />
                {isLoading && (
                    <div className="absolute right-2 top-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-[9999] w-full bg-white border border-gray-200 mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => {
                        const mainText = suggestion.address.road 
                            ? `${suggestion.address.house_number || ''} ${suggestion.address.road}`.trim() 
                            : suggestion.name;
                        
                        const secondaryParts = [suggestion.address.city || suggestion.address.town || suggestion.address.village, suggestion.address.postcode, suggestion.address.state].filter(Boolean);
                        const secondaryText = secondaryParts.join(', ');

                        return (
                            <li 
                                key={suggestion.place_id}
                                onClick={() => handleSelect(suggestion)}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3 text-sm text-gray-700 border-b border-gray-100 last:border-0 transition-colors"
                            >
                                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">{mainText || suggestion.display_name.split(',')[0]}</span>
                                    <span className="text-xs text-gray-500">{secondaryText || suggestion.display_name}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
