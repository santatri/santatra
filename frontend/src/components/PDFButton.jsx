import React, { useState, useEffect, useCallback, memo } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import './polyfills';

const PDFButton = memo(({ facture, clients }) => {
    const [pdfState, setPdfState] = useState({
        pdfDoc: null,
        status: 'idle' // 'idle' | 'generating' | 'ready' | 'error'
    });
    const [isClient, setIsClient] = useState(false);
    const [PDFDownloadLink, setPDFDownloadLink] = useState(null);
    const [FacturePDF, setFacturePDF] = useState(null);
    const [acompteInput, setAcompteInput] = useState('');

    useEffect(() => {
        setIsClient(true);
        
        if (typeof window !== 'undefined') {
            window.global = window;
            if (!window.Buffer) {
                import('buffer').then(({ Buffer }) => {
                    window.Buffer = Buffer;
                });
            }
        }

        const loadDependencies = async () => {
            try {
                const [facturePDF, reactPDF] = await Promise.all([
                    import('./FacturePDF'),
                    import('@react-pdf/renderer')
                ]);
                setFacturePDF(() => facturePDF.default);
                setPDFDownloadLink(() => reactPDF.PDFDownloadLink);
            } catch (error) {
                console.error("Erreur de chargement des dépendances:", error);
                setPdfState({ pdfDoc: null, status: 'error' });
            }
        };

        loadDependencies();
    }, []);

    const generatePDF = useCallback(async () => {
        if (!isClient || !FacturePDF || !PDFDownloadLink) {
            console.error("Dépendances non chargées");
            return;
        }
        
        setPdfState({ pdfDoc: null, status: 'generating' });
        
        try {
            const client = clients.find(c => c.id === facture.client_id) || {};
            
            setPdfState({ 
                pdfDoc: (
                    <FacturePDF 
                        facture={facture} 
                        clientName={client.nom || "Client inconnu"}
                        clientEmail={client.email || ""}
                        clientAdresse={client.adresse || ""}
                        clientTelephone={client.telephone || ""}
                        clientstat={client.stat || ""}
                        clientnif={client.nif || ""}
                        acompteManuel={acompteInput || null}
                        responsable={facture.responsable || null}
                    />
                ),
                status: 'ready'
            });
        } catch (error) {
            console.error("Erreur de génération PDF:", error);
            setPdfState({ pdfDoc: null, status: 'error' });
        }
    }, [facture, clients, isClient, FacturePDF, PDFDownloadLink, acompteInput]);

    if (!isClient) {
        return (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md opacity-50 cursor-not-allowed text-sm md:text-base">
                Chargement...
            </button>
        );
    }

    return (
        <div className="space-y-3 w-full max-w-md mx-auto">
            {/* Zone de saisie responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                <label className="text-sm font-medium text-gray-700 sm:w-1/3">
                    Acompte (MGA):
                </label>
                <div className="w-full sm:w-2/3">
                    <input
                        type="number"
                        value={acompteInput}
                        onChange={(e) => setAcompteInput(e.target.value)}
                        placeholder="Montant ou laisser vide pour 70%"
                        className="w-full px-3 py-2 border rounded-md text-sm md:text-base"
                        min="0"
                        max={facture.prix_total || ''}
                    />
                    {facture.prix_total && (
                        <p className="text-xs text-gray-500 mt-1">
                            Maximum: {parseFloat(facture.prix_total).toLocaleString('fr-FR')} MGA
                        </p>
                    )}
                </div>
            </div>

            {/* États du bouton */}
            {pdfState.status === 'generating' ? (
                <div className="flex items-center justify-center bg-gray-100 px-4 py-3 rounded-md w-full">
                    <RotatingLines strokeColor="#3b82f6" width="24" />
                    <span className="ml-2 text-sm md:text-base">Génération en cours...</span>
                </div>
            ) : pdfState.status === 'error' ? (
                <button 
                    onClick={generatePDF}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md w-full text-sm md:text-base transition-colors"
                >
                    Erreur - Cliquez pour réessayer
                </button>
            ) : pdfState.status === 'ready' && PDFDownloadLink && pdfState.pdfDoc ? (
                <>
                    <PDFDownloadLink
                        document={pdfState.pdfDoc}
                        fileName={`facture_${facture.numero_facture || facture.id}.pdf`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md flex items-center justify-center w-full text-sm md:text-base transition-colors"
                    >
                        {({ loading }) => loading ? (
                            <>
                                <RotatingLines strokeColor="#ffffff" width="20" className="mr-2" />
                                <span className="text-sm md:text-base">Préparation du PDF...</span>
                            </>
                        ) : 'Télécharger la facture'}
                    </PDFDownloadLink>
                    <button
                        onClick={() => {
                            setPdfState({ pdfDoc: null, status: 'idle' });
                            setAcompteInput('');
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md w-full text-sm transition-colors"
                    >
                        Modifier les informations
                    </button>
                </>
            ) : (
                <button
                    onClick={generatePDF}
                    disabled={pdfState.status === 'generating'}
                    className={`bg-blue-600 text-white px-4 py-3 rounded-md w-full text-sm md:text-base transition-colors ${
                        pdfState.status === 'generating' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                    }`}
                >
                    Générer la facture
                </button>
            )}
        </div>
    );
});

export default PDFButton;