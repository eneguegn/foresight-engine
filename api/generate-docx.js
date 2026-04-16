import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
         HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType, PageBreak } from "docx";

export const config = { maxDuration: 30 };

const NAVY = "0D1B3E", GREEN = "1B5E20", BLUE = "0D47A1", RED = "B71C1C", WHITE = "FFFFFF";

function getColor(heading) {
  const u = heading.toUpperCase();
  if (u.includes("OPTIMISTIC")) return GREEN;
  if (u.includes("BASELINE"))   return BLUE;
  if (u.includes("DISRUPTIVE")) return RED;
  return NAVY;
}

function inlineRuns(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map(p => {
    if (p.startsWith("**") && p.endsWith("**"))
      return new TextRun({ text: p.slice(2,-2), bold: true, size: 22, font: "Calibri" });
    if (p.startsWith("*")  && p.endsWith("*"))
      return new TextRun({ text: p.slice(1,-1), italics: true, size: 22, font: "Calibri" });
    return new TextRun({ text: p, size: 22, font: "Calibri" });
  });
}

function buildTable(tableLines) {
  const headers  = tableLines[0].split("|").map(c => c.trim()).filter(Boolean);
  const dataRows = tableLines.slice(2);
  const colW = Math.floor(9360 / headers.length);
  const b = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: b, bottom: b, left: b, right: b };
  const cell = (text, bg, color = "000000", bold = false) =>
    new TableCell({
      borders, width: { size: colW, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold, color, size: 18, font: "Calibri" })] })]
    });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: headers.map(() => colW),
    rows: [
      new TableRow({ children: headers.map(h => cell(h, NAVY, WHITE, true)) }),
      ...dataRows.map((row, i) => new TableRow({
        children: row.split("|").map(c => c.trim()).filter(Boolean)
                     .map(c => cell(c, i % 2 === 0 ? "F8F8F8" : "FFFFFF"))
      }))
    ]
  });
}

function parseToDocx(markdown, topic, region) {
  const children = [];

  // Title page
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 2880, after: 480 },
    children: [new TextRun({ text: topic || "Strategic Foresight Report", bold: true, size: 52, color: NAVY, font: "Calibri" })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: `A ${region || ""} Contextualisation`, size: 28, italics: true, color: "555555", font: "Calibri" })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 3600 },
    children: [new TextRun({ text: "Three Scenarios · Ten-Year Horizon", size: 24, color: "888888", font: "Calibri" })]
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  const lines = markdown.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("|")) {
      const tLines = [];
      while (i < lines.length && lines[i].startsWith("|")) { tLines.push(lines[i]); i++; }
      if (tLines.length >= 2) children.push(buildTable(tLines));
      continue;
    }
    if      (line.startsWith("# "))   children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: children.length > 5, children: [new TextRun({ text: line.slice(2),  color: NAVY,            bold: true, size: 32, font: "Calibri" })] }));
    else if (line.startsWith("## "))  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.slice(3),  color: getColor(line.slice(3)), bold: true, size: 26, font: "Calibri" })] }));
    else if (line.startsWith("### ")) children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: line.slice(4),  color: "333333",        bold: true, size: 22, font: "Calibri" })] }));
    else if (line.trim() === "")      children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 80 } }));
    else                              children.push(new Paragraph({ children: inlineRuns(line), spacing: { after: 160, line: 276 } }));
    i++;
  }
  return children;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const raw = await new Promise((resolve, reject) => {
    let d = ""; req.on("data", c => d += c); req.on("end", () => resolve(d)); req.on("error", reject);
  });
  const { report, topic, region } = JSON.parse(raw);
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 32, bold: true, font: "Calibri" }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 26, bold: true, font: "Calibri" }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { size: 22, bold: true, font: "Calibri" }, paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } },
      ]
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: parseToDocx(report, topic, region)
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="foresight-report.docx"`);
  res.status(200).send(buffer);
}