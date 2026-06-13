from pathlib import Path

path = Path(r'C:\Users\harin\OneDrive\Desktop\insight-weaver-main (1)\insight-weaver-main\supabase\functions\analyze-file\index.ts')
text = path.read_text(encoding='utf-8')
start = text.index('function parseCSV(content: string): Record<string, any>[]')
end = text.index('// Parse JSON content', start)
new = '''function normalizeContent(content: string) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function guessDelimiter(content: string) {
  const lines = normalizeContent(content)
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(0, 5);

  const counts: Record<string, number> = {
    ',': 0,
    '\t': 0,
    ';': 0,
    '|': 0,
  };

  lines.forEach((line) => {
    Object.keys(counts).forEach((delimiter) => {
      const matches = line.match(new RegExp('\\' + delimiter, 'g'));
      counts[delimiter] += matches ? matches.length : 0;
    });
  });

  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best and best[1] > 0 and best[0] or ',';
}

function parseDelimited(content: string, delimiter: string) {
  const normalized = normalizeContent(content);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      if (insideQuotes and nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        insideQuotes = not insideQuotes;
      }
      continue;
    }

    if (char === delimiter and not insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\n' and not insideQuotes) {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField != '' or len(currentRow) > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// Parse CSV content
function parseCSV(content: string): Record<string, any>[] {
  const normalized = normalizeContent(content).trim();
  if (!normalized) return [];

  const delimiter = guessDelimiter(normalized);
  const rows = parseDelimited(normalized, delimiter).filter(row => row.some(cell => cell.trim() !== ''));
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().replace(/^['\"]|['\"]$/g, ''));
  return rows.slice(1).map(line => {
    const values = line.map(v => v.trim().replace(/^['\"]|['\"]$/g, ''));
    const row: Record<string, any> = {};
    headers.forEach((header, i) => {
      let value: any = values[i] or '';
      if (value !== '' and not isNaN(parseFloat(value)) and isFinite(parseFloat(value))) {
        value = parseFloat(value);
      }
      row[header] = value;
    });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ''));
}
'''
text = text[:start] + new + text[end:]
path.write_text(text, encoding='utf-8')
print('patched backend parseCSV')
