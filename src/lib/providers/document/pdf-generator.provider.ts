import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DocumentProvider, QuoteSnapshot } from './document-provider.factory';

export class PdfGeneratorProvider implements DocumentProvider {
  async generateQuoteDocument(snapshot: QuoteSnapshot): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 50;

    let cursorY = height - margin;

    // Header
    page.drawText(`Quotation: ${snapshot.quote.id}`, {
      x: margin,
      y: cursorY,
      size: 18,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    cursorY -= 30;

    // Company & Customer
    page.drawText(`Tenant: ${snapshot.tenant.name}`, { x: margin, y: cursorY, size: 12, font: timesRomanFont });
    cursorY -= 20;
    page.drawText(`Customer: ${snapshot.customer.name}`, { x: margin, y: cursorY, size: 12, font: timesRomanFont });
    cursorY -= 40;

    // Table Header
    page.drawText('Item', { x: margin, y: cursorY, size: 12, font: timesRomanBold });
    page.drawText('Qty', { x: margin + 200, y: cursorY, size: 12, font: timesRomanBold });
    page.drawText('Unit Price', { x: margin + 250, y: cursorY, size: 12, font: timesRomanBold });
    page.drawText('Discount %', { x: margin + 350, y: cursorY, size: 12, font: timesRomanBold });
    page.drawText('Subtotal', { x: margin + 450, y: cursorY, size: 12, font: timesRomanBold });
    cursorY -= 20;

    // Items
    for (const item of snapshot.lineItems) {
      page.drawText(`${item.productId}`, { x: margin, y: cursorY, size: 10, font: timesRomanFont });
      page.drawText(`${item.quantity}`, { x: margin + 200, y: cursorY, size: 10, font: timesRomanFont });
      page.drawText(`$${item.unitPrice.toString()}`, { x: margin + 250, y: cursorY, size: 10, font: timesRomanFont });
      page.drawText(`${item.discount}%`, { x: margin + 350, y: cursorY, size: 10, font: timesRomanFont });
      page.drawText(`$${item.subtotal.toString()}`, { x: margin + 450, y: cursorY, size: 10, font: timesRomanFont });
      cursorY -= 20;
    }

    cursorY -= 20;
    page.drawText(`Subtotal: $${snapshot.quote.subtotal.toString()}`, { x: margin + 350, y: cursorY, size: 12, font: timesRomanBold });
    cursorY -= 20;
    page.drawText(`Discount Total: $${snapshot.quote.discountTotal.toString()}`, { x: margin + 350, y: cursorY, size: 12, font: timesRomanBold });
    cursorY -= 20;
    page.drawText(`Grand Total: $${snapshot.quote.grandTotal.toString()}`, { x: margin + 350, y: cursorY, size: 14, font: timesRomanBold });

    return await pdfDoc.save();
  }
}
