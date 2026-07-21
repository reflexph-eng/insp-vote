export type PdfLine = {
  text: string;
  bold?: boolean;
  size?: number;
  indent?: number;
};

function pdfString(value: string): Buffer {
  const normalized = value
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
  const bytes = Buffer.from(normalized, "latin1");
  const out: number[] = [];
  for (const byte of bytes) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out.push(0x5c, byte);
    else if (byte === 0x0a || byte === 0x0d) out.push(0x20);
    else out.push(byte);
  }
  return Buffer.from(out);
}

function objectBuffer(id: number, body: Buffer | string): Buffer {
  const bodyBuffer = typeof body === "string" ? Buffer.from(body, "binary") : body;
  return Buffer.concat([
    Buffer.from(`${id} 0 obj\n`, "binary"),
    bodyBuffer,
    Buffer.from("\nendobj\n", "binary"),
  ]);
}

export function createSimplePdf(pages: PdfLine[][]): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 48;
  const topY = 795;
  const objects: Buffer[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  // 1 catalog, 2 pages tree, 3 regular font, 4 bold font
  let nextId = 5;
  for (let index = 0; index < pages.length; index += 1) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }

  objects[1] = objectBuffer(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = objectBuffer(
    2,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  objects[3] = objectBuffer(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects[4] = objectBuffer(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  pages.forEach((lines, pageIndex) => {
    const pageId = pageObjectIds[pageIndex];
    const contentId = contentObjectIds[pageIndex];
    const commands: Buffer[] = [Buffer.from("BT\n", "binary")];
    let y = topY;

    for (const line of lines) {
      const size = line.size ?? 10;
      const leading = Math.max(size + 5, 14);
      const font = line.bold ? "F2" : "F1";
      const x = marginX + (line.indent ?? 0);
      commands.push(Buffer.from(`/${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(`, "binary"));
      commands.push(pdfString(line.text));
      commands.push(Buffer.from(") Tj\n", "binary"));
      y -= leading;
    }

    commands.push(Buffer.from("ET", "binary"));
    const stream = Buffer.concat(commands);
    objects[contentId] = objectBuffer(
      contentId,
      Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "binary"),
        stream,
        Buffer.from("\nendstream", "binary"),
      ]),
    );
    objects[pageId] = objectBuffer(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  });

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const ordered = objects.slice(1);
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const object of ordered) {
    offsets.push(cursor);
    cursor += object.length;
  }

  const xrefOffset = cursor;
  const xrefLines = [
    `xref\n0 ${ordered.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
  ];
  const trailer = `trailer\n<< /Size ${ordered.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.concat([header, ...ordered, Buffer.from(xrefLines.join(""), "binary"), Buffer.from(trailer, "binary")]);
}

export function paginateLines(lines: PdfLine[], maxLines = 45): PdfLine[][] {
  const pages: PdfLine[][] = [];
  for (let index = 0; index < lines.length; index += maxLines) {
    pages.push(lines.slice(index, index + maxLines));
  }
  return pages.length ? pages : [[{ text: "Aucune donnée." }]];
}
