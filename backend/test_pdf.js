const pdfService = require('./services/pdfService');
const fs = require('fs');
const path = require('path');

const dummyData = {
    prenom: 'Jean',
    nom: 'Dupont',
    matricule: 'MAT-2026-001-C1',
    centre_nom: 'Antananarivo',
    formation_nom: 'Gestion',
    type_paiement: 'formation',
    montant: 150000,
    date_paiement: new Date().toISOString(),
    designation: 'Mensualité de Mars 2026'
};

async function testPdf() {
    try {
        const buffer = await pdfService.generateReceiptBuffer(dummyData);
        const outputPath = path.join(__dirname, 'test_receipt.pdf');
        fs.writeFileSync(outputPath, buffer);
        console.log('PDF generated at:', outputPath);
    } catch (err) {
        console.error('Error:', err);
    }
}

testPdf();
