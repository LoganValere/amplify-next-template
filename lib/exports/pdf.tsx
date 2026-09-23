import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfRow = {
  date: string;
  start: string;
  end: string;
  durationHours: number;
  person: string;
  account: string;
  category: string;
  notes: string;
  source: string;
};

export async function renderTimesheetPdf(rows: PdfRow[], from: string, to: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]);
  let y = 750;
  const draw = (text: string, x: number, size: number, useBold = false) => {
    page.drawText(text.slice(0, 90), {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.07, 0.07, 0.07),
    });
  };
  draw("Valere Portal", 48, 16, true);
  y -= 22;
  draw(`Timesheet ${from} to ${to}`, 48, 10);
  y -= 16;
  draw(`Generated ${new Date().toISOString()}`, 48, 9);
  y -= 24;
  draw("Date          Person              Account             Category       Hours", 48, 9, true);
  y -= 14;
  const limited = rows.slice(0, 2000);
  for (const row of limited) {
    if (y < 48) {
      page = doc.addPage([612, 792]);
      y = 750;
    }
    const line = `${row.date.padEnd(12)} ${row.person.slice(0, 16).padEnd(18)} ${row.account.slice(0, 16).padEnd(18)} ${row.category.slice(0, 12).padEnd(14)} ${row.durationHours.toFixed(2)}`;
    draw(line, 48, 8);
    y -= 12;
  }
  y -= 10;
  const total = limited.reduce((sum, row) => sum + row.durationHours, 0);
  draw(`Total hours: ${total.toFixed(2)}`, 48, 11, true);
  const bytes = await doc.save();
  return Buffer.from(bytes);
}
