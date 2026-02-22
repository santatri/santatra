const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const COLORS = {
  primary: '#1e3c72',
  secondary: '#0b3b5c',
  tableHeaderBg: '#eef2ff',
  tableBorder: '#d1d9e6',
  textDark: '#333333',
  textLight: '#777777'
};

const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold'
};

const LAYOUT = {
  margin: 40,
  pageWidth: null,
  leftMargin: 40
};

// ================= MAIN FUNCTION =================

function generateReceiptBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: LAYOUT.margin,
        size: 'A4'
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      LAYOUT.pageWidth =
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right;

      let y = drawHeader(doc);
      y = drawTitleAndDate(doc, data, y);
      y = drawStudentInfo(doc, data, y);
      y = drawPaymentDetails(doc, data, y);

      // Sécurité anti 2e page
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }

      drawFooter(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ================= HEADER =================

function drawHeader(doc) {
  const top = doc.page.margins.top;

  const logoPath = path.join(
    __dirname,
    '../../frontend/src/assets/images.jpg'
  );

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, LAYOUT.leftMargin, top, {
      width: 55
    });
  }

  doc
    .fontSize(18)
    .font(FONTS.bold)
    .fillColor(COLORS.primary)
    .text('CFPM de Madagascar', LAYOUT.leftMargin + 70, top + 5);

  doc
    .fontSize(9)
    .font(FONTS.regular)
    .fillColor(COLORS.textLight)
    .text(
      'Centre de Formation Professionnelle de Madagascar',
      LAYOUT.leftMargin + 70,
      top + 25
    );

  const lineY = top + 55;

  doc
    .strokeColor(COLORS.primary)
    .lineWidth(1)
    .moveTo(LAYOUT.leftMargin, lineY)
    .lineTo(LAYOUT.leftMargin + LAYOUT.pageWidth, lineY)
    .stroke();

  return lineY + 20;
}

// ================= TITLE + DATE =================

function drawTitleAndDate(doc, data, y) {
  const dateObj = data.date_paiement
    ? new Date(data.date_paiement)
    : new Date();

  const dateStr = dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  doc
    .fontSize(9)
    .fillColor(COLORS.textLight)
    .text(`Date : ${dateStr}`, LAYOUT.leftMargin, y - 15, {
      align: 'right',
      width: LAYOUT.pageWidth
    });

  doc
    .fontSize(22)
    .font(FONTS.bold)
    .fillColor(COLORS.primary)
    .text('REÇU DE PAIEMENT', LAYOUT.leftMargin, y, {
      align: 'center'
    });

  return y + 35;
}

// ================= STUDENT INFO =================

function drawStudentInfo(doc, data, y) {
  const boxHeight = 85;

  doc
    .roundedRect(
      LAYOUT.leftMargin,
      y,
      LAYOUT.pageWidth,
      boxHeight,
      6
    )
    .strokeColor(COLORS.tableBorder)
    .stroke();

  doc
    .fontSize(11)
    .font(FONTS.bold)
    .fillColor(COLORS.primary)
    .text('INFORMATIONS ÉTUDIANT', LAYOUT.leftMargin + 15, y + 10);

  const labelX = LAYOUT.leftMargin + 20;
  const valueX = LAYOUT.leftMargin + 130;
  let contentY = y + 30;

  doc.font(FONTS.bold).fillColor(COLORS.textDark);
  doc.text('Nom :', labelX, contentY);
  doc.font(FONTS.regular);
  doc.text(
    `${data.prenom || ''} ${data.nom || ''}`.trim() ||
    'Non renseigné',
    valueX,
    contentY
  );

  contentY += 18;

  doc.font(FONTS.bold).text('Centre :', labelX, contentY);
  doc.font(FONTS.regular).text(data.centre_nom || '-', valueX, contentY);

  contentY += 18;

  doc.font(FONTS.bold).text('Formation :', labelX, contentY);
  doc.font(FONTS.regular).text(data.formation_nom || '-', valueX, contentY);

  return y + boxHeight + 20;
}

// ================= PAYMENT DETAILS =================

function drawPaymentDetails(doc, data, y) {
  doc
    .fontSize(13)
    .font(FONTS.bold)
    .fillColor(COLORS.primary)
    .text('DÉTAIL DU PAIEMENT', LAYOUT.leftMargin, y);

  y += 20;

  const colDescX = LAYOUT.leftMargin + 15;
  const colAmountX =
    LAYOUT.leftMargin + LAYOUT.pageWidth - 110;

  const rowHeight = 28;

  doc
    .rect(LAYOUT.leftMargin, y, LAYOUT.pageWidth, rowHeight)
    .fillAndStroke(COLORS.tableHeaderBg, COLORS.tableBorder);

  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor(COLORS.primary)
    .text('Description', colDescX, y + 8)
    .text('Montant (Ar)', colAmountX, y + 8, {
      width: 100,
      align: 'right'
    });

  y += rowHeight;

  const typeLabels = {
    droits: "Droits d'inscription",
    formation: 'Frais de formation',
    livre: 'Achat de livre',
    examen: "Frais d'examen"
  };

  const description =
    (typeLabels[data.type_paiement] || data.type_paiement) +
    (data.designation ? ` – ${data.designation}` : '');

  const montant = Number(data.montant) || 0;
  const montantFormatted =
    montant.toLocaleString('fr-FR') + ' Ar';

  doc
    .rect(LAYOUT.leftMargin, y, LAYOUT.pageWidth, rowHeight)
    .strokeColor(COLORS.tableBorder)
    .stroke();

  doc
    .font(FONTS.regular)
    .fillColor(COLORS.textDark)
    .text(description.substring(0, 120), colDescX, y + 8, {
      width: LAYOUT.pageWidth - 150
    });

  doc
    .font(FONTS.bold)
    .fillColor(COLORS.secondary)
    .text(montantFormatted, colAmountX, y + 8, {
      width: 100,
      align: 'right'
    });

  y += rowHeight + 25;

  const totalBoxWidth = 240;
  const totalBoxX =
    LAYOUT.leftMargin +
    LAYOUT.pageWidth -
    totalBoxWidth;

  doc
    .roundedRect(totalBoxX, y, totalBoxWidth, 45, 6)
    .fill(COLORS.primary);

  doc
    .fillColor('#ffffff')
    .font(FONTS.bold)
    .fontSize(12)
    .text('TOTAL PAYÉ', totalBoxX + 20, y + 14);

  doc
    .fontSize(17)
    .text(montantFormatted, totalBoxX + 110, y + 10, {
      width: 110,
      align: 'right'
    });

  return y + 60;
}

// ================= FOOTER FIXED POSITION =================

function drawFooter(doc) {
  const footerHeight = 40;

  const bottomY =
    doc.page.height -
    doc.page.margins.bottom -
    footerHeight;

  const currentY = doc.y;

  doc.y = bottomY;

  doc
    .fontSize(8)
    .fillColor(COLORS.textLight)
    .text(
      'Ce reçu est généré automatiquement.',
      doc.page.margins.left,
      bottomY,
      {
        align: 'center',
        width:
          doc.page.width -
          doc.page.margins.left -
          doc.page.margins.right
      }
    );

  doc.text(
    'CFPM Madagascar • contact@cfpm.mg • www.cfpm.mg',
    doc.page.margins.left,
    bottomY + 15,
    {
      align: 'center',
      width:
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right
    }
  );

  doc.y = currentY;
}

module.exports = { generateReceiptBuffer };