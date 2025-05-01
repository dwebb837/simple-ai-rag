import { Combobox } from '@headlessui/react';
import { useState, useCallback } from 'react';
import { debounce } from 'lodash-es';

export default function AsyncCombobox({
    onSearch,
    options,
    onChange,
}: {
    onSearch: (query: string) => Promise<void>;
    options: string[];
    onChange: (value: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Debounced search
    const debouncedSearch = useCallback(
        debounce(async (searchQuery: string) => {
            await onSearch(searchQuery);
            setIsLoading(false);
        }, 500),
        []
    );

    return (
        <Combobox as="div" className="relative" onChange={onChange}>
            <Combobox.Input
                className="w-full p-2 border rounded-lg"
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsLoading(true);
                    debouncedSearch(e.target.value);
                }}
                displayValue={(value: string) => value}
            />

            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg">
                {isLoading ? (
                    <div className="p-2 text-gray-500">Searching...</div>
                ) : options.length === 0 ? (
                    <div className="p-2 text-gray-500">No results found</div>
                ) : (
                    options.map((option) => (
                        <Combobox.Option
                            key={option}
                            value={option}
                            className={({ active }) =>
                                `px-4 py-2 ${active ? 'bg-blue-100' : 'bg-white'}`
                            }
                        >
                            {option}
                        </Combobox.Option>
                    ))
                )}
            </Combobox.Options>
        </Combobox>
    );
}
