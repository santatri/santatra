import React from 'react';
import { FaSync } from 'react-icons/fa';

const RefreshButton = ({ onClick, loading, className = '' }) => {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`inline-flex items-center justify-center p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${loading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
            title="Actualiser les données"
        >
            <FaSync className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
    );
};

export default RefreshButton;
