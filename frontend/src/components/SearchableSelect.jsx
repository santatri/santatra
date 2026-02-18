import React, { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

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
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Fermer quand on clique en dehors
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mettre à jour les options filtrées
    useEffect(() => {
        setFilteredOptions(
            options.filter(option =>
                option.label.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
        setHighlightedIndex(-1); // reset highlight when search changes
    }, [searchTerm, options]);

    // Trouver l'option sélectionnée
    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Navigation clavier
    const handleKeyDown = (e) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                break;
            default:
                break;
        }
    };

    // Faire défiler pour voir l'élément en surbrillance
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const highlightedElement = listRef.current.children[highlightedIndex];
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div
            className={`relative ${className}`}
            ref={wrapperRef}
            onKeyDown={handleKeyDown}
        >
            {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}

            {/* Bouton / affichage */}
            <div
                className={`
                    w-full border rounded px-2 py-2 text-xs flex justify-between items-center bg-white cursor-pointer
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

            {/* Liste déroulante */}
            {isOpen && !disabled && (
                <div
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col"
                    ref={listRef}
                >
                    {/* Barre de recherche */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    className={`
                                        px-3 py-2 text-xs cursor-pointer transition-colors
                                        ${index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}
                                        ${value === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}
                                    `}
                                    onClick={() => handleSelect(option)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    onMouseDown={(e) => e.preventDefault()} // Empêche la perte de focus
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