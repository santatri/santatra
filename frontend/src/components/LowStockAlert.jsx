// components/LowStockAlert.js
import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { supabase } from '../api/supabaseClient';
const LowStockAlert = () => {
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // 1. Récupération initiale des produits
        const fetchLowStockProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('produits')
                    .select('*')
                    .lt('quantite', 5);

                if (error) throw error;
                setLowStockProducts(data || []);
            } catch (error) {
                console.error('Erreur lors de la récupération des produits:', error);
                setLowStockProducts([]);
            }
        };

        fetchLowStockProducts();

        // 2. Souscription aux changements en temps réel
        const subscription = supabase
            .channel('produits-changes')
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'produits'
                },
                async (payload) => {
                    // Refetch all low stock products when any change occurs
                    await fetchLowStockProducts();
                }
            )
            .subscribe();

        // 3. Vérification périodique au cas où
        const interval = setInterval(fetchLowStockProducts, 30000);

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
        };
    }, []);

    if (lowStockProducts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50">
            <div className={`bg-yellow-100 border-2 border-yellow-400 rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${isExpanded ? 'w-64' : 'w-12 h-12'}`}>
                <div 
                    className="flex items-center justify-center p-2 bg-yellow-400 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <FaExclamationTriangle className="text-yellow-800 text-xl" />
                    {isExpanded && (
                        <span className="ml-2 font-bold text-yellow-800">
                            Stock faible ({lowStockProducts.length})
                        </span>
                    )}
                </div>

                {isExpanded && (
                    <div className="p-2 max-h-64 overflow-y-auto">
                        <ul className="divide-y divide-yellow-200">
                            {lowStockProducts.map((product) => (
                                <li key={product.id} className="py-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm truncate">{product.nom}</span>
                                        <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                            {product.quantite} restant(s)
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LowStockAlert;