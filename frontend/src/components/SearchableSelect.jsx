import React, { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

const SearchableSelect = ({
    options = [],
    value,
    onChange,
    placeholder = "Sélectionner...",
    label,
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Update filtered options when search term or options change
    useEffect(() => {
        setFilteredOptions(
            options.filter(option =>
                option.label.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, options]);

    // Find selected option label
    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}

            <div
                className={`
          w-full border rounded px-2 py-1.5 text-xs flex justify-between items-center bg-white cursor-pointer
          ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:border-blue-400'}
          ${isOpen ? 'ring-1 ring-blue-500 border-blue-500' : 'border-gray-300'}
        `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                            <input
                                type="text"
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`
                    px-3 py-2 text-xs cursor-pointer hover:bg-blue-50
                    ${value === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}
                  `}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                Aucun résultat
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
