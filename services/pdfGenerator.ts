import { jsPDF } from "jspdf";
import { BookingResponse } from "../types";

export const generateTicketPDF = (booking: BookingResponse) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Data extraction with fallbacks
    const name = booking.Name || booking.name || "Guest";
    const bookingId = booking["Booking ID"] || booking["Booking Id"] || "PENDING";
    const phone = booking.Phone || booking.phone || "-";
    const bus = booking.Bus || booking.bus || "-";
    const date = booking.Date || booking.dateFormatted || "-";
    const time = booking.Time || booking.time || "-";
    const route = (booking.Pickup || booking.pickup) && (booking.Destination || booking.destination) 
      ? `${booking.Pickup || booking.pickup} → ${booking.Destination || booking.destination}` 
      : "-";
    
    // Treat as strings for display
    const maleSeats = String(booking["Male Seat"] || booking.maleSeats || "0");
    const femaleSeats = String(booking["Female Seat"] || booking.femaleSeats || "0");
    
    // Header
    doc.setFillColor(0, 102, 255); // Bright Blue (#0066FF)
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(203, 213, 225); // Silver/Slate 300
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LAGAN BUS BOOKING', pageWidth / 2, 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Elite Travel Services', pageWidth / 2, 15, { align: 'center' });

    // Border
    doc.setDrawColor(0, 102, 255); // Blue Border
    doc.setLineWidth(0.5);
    doc.rect(5, 25, pageWidth - 10, pageHeight - 35, 'S');

    let yPos = 35;

    // Passenger Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255); // Blue
    doc.text('PASSENGER DETAILS', 10, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${name}`, 15, yPos); yPos += 6;
    doc.text(`Booking ID: ${bookingId}`, 15, yPos); yPos += 6;
    doc.text(`Phone: ${phone}`, 15, yPos); yPos += 10;

    // Travel Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255); // Blue
    doc.text('TRAVEL DETAILS', 10, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Bus: ${bus}`, 15, yPos); yPos += 6;
    doc.text(`Date: ${date}`, 15, yPos); yPos += 6;
    doc.text(`Time: ${time}`, 15, yPos); yPos += 6;
    doc.text(`Route: ${route}`, 15, yPos); yPos += 6;
    doc.text(`Male Seat(s): ${maleSeats}`, 15, yPos); yPos += 6;
    doc.text(`Female Seat(s): ${femaleSeats}`, 15, yPos); yPos += 10;

    // Footer Info
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(10, yPos, pageWidth - 20, 30, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255); // Blue
    doc.text('IMPORTANT NOTES:', 15, yPos + 7);
    yPos += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text('• Arrive 15 minutes before departure', 15, yPos); yPos += 5;
    doc.text('• Show this ticket to conductor', 15, yPos); yPos += 5;
    doc.text('• For assistance: +94701362527', 15, yPos);

    // Save
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    doc.save(`Lagan_Ticket_${safeName}.pdf`);
    return true;
  } catch (error) {
    console.error("PDF Error", error);
    return false;
  }
};