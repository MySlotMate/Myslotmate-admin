// Generates a downloadable M-ticket PDF for a booking, mirroring the customer
// app's confirmation ticket. Uses jsPDF loaded from CDN (no bundled dep) and a
// QR code from api.qrserver.com. Cover image is best-effort (skipped on CORS).

/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiFetch, apiBaseUrl } from '../api/client';

// Routes a remote image through the backend so the browser can read it without
// CORS issues (S3 covers and the QR service don't all send CORS headers).
function proxiedImage(url: string): string {
  return `${apiBaseUrl}/image-proxy?url=${encodeURIComponent(url)}`;
}

const istFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
function fmtDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : istFmt.format(d);
}

function loadJsPdf(): Promise<any> {
  const w = window as any;
  if (w.jspdf) return Promise.resolve(w.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if (w.jspdf) resolve(w.jspdf.jsPDF);
      else reject(new Error('jsPDF loaded but not found on window'));
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.body.appendChild(script);
  });
}

async function getBase64FromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function buildTicket(
  doc: any,
  event: any,
  booking: any,
  guestName: string,
  coverBase64: string,
  qrBase64: string,
  bookingId: string,
) {
  const eventDate = booking?.occurrence_date ?? event?.time ?? '';

  const startX = 55;
  const startY = 30;
  const width = 100;
  const height = 165;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(243, 244, 246);
  doc.roundedRect(startX, startY, width, height, 6, 6, 'FD');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(startX - 0.2, startY - 0.2, width + 0.4, height + 0.4, 6.2, 6.2, 'D');
  doc.setLineWidth(0.2);

  // Top brand stripe
  doc.setFillColor(22, 48, 76);
  doc.roundedRect(startX + 0.1, startY + 0.1, width - 0.2, 8, 5.8, 5.8, 'F');
  doc.rect(startX + 0.1, startY + 5, width - 0.2, 3.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('M Y S L O T M A T E', startX + width / 2, startY + 5.5, { align: 'center' });

  // Header: cover image / placeholder
  const imgX = startX + 5;
  const imgY = startY + 12;
  const imgW = 20;
  const imgH = 26;
  if (coverBase64) {
    doc.addImage(coverBase64, 'PNG', imgX, imgY, imgW, imgH);
  } else {
    doc.setFillColor(22, 48, 76);
    doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('SLOT', imgX + imgW / 2, imgY + 11, { align: 'center' });
    doc.text('MATE', imgX + imgW / 2, imgY + 16, { align: 'center' });
  }

  // Event details
  const textX = startX + 28;
  let textY = startY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  const titleText = (event?.title ?? 'EXPERIENCE TICKET').toUpperCase();
  const titleLines = doc.splitTextToSize(titleText, 52);
  doc.text(titleLines, textX, textY);
  textY += titleLines.length * 4.2 + 0.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  const langs = Array.isArray(event?.languages) ? event.languages.join('/') : 'English';
  doc.text(`${event?.mood ?? 'Experience'} | ${langs}`, textX, textY);
  textY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(fmtDate(eventDate), textX, textY);
  textY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  const venueText = (event?.is_online ? 'Online Meet Link' : (event?.location ?? 'TBD')).toUpperCase();
  doc.text(doc.splitTextToSize(venueText, 52), textX, textY);

  // Vertical M-TICKET
  const verticalX = startX + width - 6;
  doc.setDrawColor(243, 244, 246);
  doc.line(verticalX - 3.5, startY + 12, verticalX - 3.5, startY + 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  let letterY = startY + 14.5;
  for (const letter of ['M', '-', 'T', 'I', 'C', 'K', 'E', 'T']) {
    doc.text(letter, verticalX, letterY, { align: 'center' });
    letterY += 3.2;
  }

  // Notch divider
  const dividerY = startY + 43;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.circle(startX, dividerY, 3.5, 'FD');
  doc.setFillColor(255, 255, 255);
  doc.rect(startX - 5, dividerY - 5, 5, 10, 'F');
  doc.circle(startX + width, dividerY, 3.5, 'FD');
  doc.setFillColor(255, 255, 255);
  doc.rect(startX + width, dividerY - 5, 5, 10, 'F');
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(229, 231, 235);
  doc.line(startX + 4, dividerY, startX + width - 4, dividerY);
  doc.setLineDashPattern([], 0);

  // Instruction pill
  const pillY = dividerY + 5;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(startX + 5, pillY, width - 10, 7, 3.5, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(75, 85, 99);
  doc.text('SHOW THIS MOBILE TICKET AT CHECK-IN', startX + width / 2, pillY + 4.8, { align: 'center' });

  // Inner card: QR + metadata
  const innerY = pillY + 11;
  const innerH = 38;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(startX + 5, innerY, width - 10, innerH, 4, 4, 'FD');

  const qrX = startX + 9;
  const qrY = innerY + 4;
  const qrSize = 22;
  if (qrBase64) {
    doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);
  } else {
    doc.setFillColor(243, 244, 246);
    doc.rect(qrX, qrY, qrSize, qrSize, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text('[QR CODE]', qrX + qrSize / 2, qrY + qrSize / 2 + 2, { align: 'center' });
  }
  doc.setFillColor(239, 68, 68);
  doc.rect(qrX, qrY + qrSize + 1.5, qrSize, 0.8, 'F');

  const infoX = startX + 37;
  const infoCenter = infoX + (width - 10 - 32) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  const qty = booking?.quantity ?? 1;
  doc.text(`${qty} Guest${qty > 1 ? 's' : ''} · Myslotmate Pass`, infoCenter, innerY + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text((guestName || 'Guest').toUpperCase(), infoCenter, innerY + 13.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  const displayBookingId = bookingId ? `XXXX${bookingId.slice(-6).toUpperCase()}` : 'N/A';
  doc.text(`BOOKING ID: ${displayBookingId}`, infoCenter, innerY + 18.5, { align: 'center' });

  const badgeW = 20;
  const badgeH = 5;
  const badgeX = infoCenter - badgeW / 2;
  const badgeY = innerY + 23.5;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(21, 128, 61);
  doc.text('CONFIRMED', infoCenter, badgeY + 3.6, { align: 'center' });

  // Barcode decoration
  const barcodeY = innerY + innerH + 4;
  doc.setDrawColor(22, 48, 76);
  let barX = startX + 39.5;
  for (const w of [0.3, 0.6, 0.2, 0.8, 0.3, 0.5, 0.2, 0.7, 0.3, 0.4, 0.8, 0.2, 0.5, 0.3, 0.7, 0.2, 0.6, 0.4, 0.3, 0.8]) {
    doc.setLineWidth(w);
    doc.line(barX, barcodeY, barX, barcodeY + 4);
    barX += w + 0.6;
  }
  doc.setLineWidth(0.2);

  // Cancellation banner
  const cancelY = barcodeY + 8;
  doc.setFillColor(249, 250, 251);
  doc.rect(startX + 0.1, cancelY, width - 0.2, 8, 'F');
  doc.setDrawColor(243, 244, 246);
  doc.line(startX + 0.1, cancelY, startX + width - 0.1, cancelY);
  doc.line(startX + 0.1, cancelY + 8, startX + width - 0.1, cancelY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('CANCELLATION POLICY RULES APPLY FOR BOOKINGS', startX + width / 2, cancelY + 5.2, { align: 'center' });

  // Total amount
  const amountY = cancelY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Total Amount', startX + 5, amountY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  const priceText = `Rs. ${booking?.amount_cents ? (booking.amount_cents / 100).toFixed(2) : '0.00'}`;
  doc.text(priceText, startX + width - 5, amountY + 7, { align: 'right' });

  // Gold footer
  const footerY = startY + height - 12;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(startX + 0.1, footerY, width - 0.2, 11.9, 5.8, 5.8, 'F');
  doc.rect(startX + 0.1, footerY, width - 0.2, 5, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.line(startX + 0.1, footerY, startX + width - 0.1, footerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14);
  doc.text('Scan QR code at the entrance to gain entry.', startX + width / 2, footerY + 7, { align: 'center' });
}

// downloadTicketPdf builds and saves the ticket PDF for a booking. It fetches
// full event details for a richer ticket; missing pieces fall back gracefully.
export async function downloadTicketPdf(eventId: string, booking: any, guestName: string): Promise<void> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let event: any = { title: '' };
  try {
    event = await apiFetch<any>(`/events/${eventId}`);
  } catch {
    /* fall back to a minimal ticket */
  }

  const bookingId = String(booking?.id ?? '');
  const verifyUrl = `https://myslotmate.com/experience/${eventId}/confirmation?booking=${bookingId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=16304c&data=${encodeURIComponent(verifyUrl)}`;
  const qrBase64 = await getBase64FromUrl(proxiedImage(qrUrl));

  let coverBase64 = '';
  if (event?.cover_image_url) {
    // via backend proxy → avoids S3 CORS so the cover actually renders
    coverBase64 = await getBase64FromUrl(proxiedImage(event.cover_image_url));
  }

  buildTicket(doc, event, booking, guestName, coverBase64, qrBase64, bookingId);
  const suffix = bookingId ? bookingId.slice(-6).toUpperCase() : 'booking';
  doc.save(`slotmate-ticket-${suffix}.pdf`);
}
