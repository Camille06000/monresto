export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\ufeff/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/[^\w_]/g, '');

function detectDelimiter(line: string): string {
  const comma = (line.match(/,/g) ?? []).length;
  const semicolon = (line.match(/;/g) ?? []).length;
  const tab = (line.match(/\t/g) ?? []).length;
  if (semicolon >= comma && semicolon >= tab && semicolon > 0) return ';';
  if (tab >= comma && tab > 0) return '\t';
  return ',';
}

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields.map((value) => value.trim());
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = parseLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeHeader).filter((header) => header.length > 0);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    if (Object.values(row).some((value) => value.trim().length > 0)) rows.push(row);
  }

  return { headers, rows };
}
