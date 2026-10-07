export type CsvRow = Record<string, string | number | boolean | null>;
export function csvText(rows: CsvRow[], columns?: string[]) {
  const headers = columns || Object.keys(rows[0] || { note: '' });
  const cell = (value: unknown) => {
    let text = value == null ? '' : String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      headers.map(cell).join(','),
      ...rows.map((row) => headers.map((key) => cell(row[key])).join(',')),
    ].join('\r\n')
  );
}
export function downloadCsv(filename: string, rows: CsvRow[], columns?: string[]) {
  const url = URL.createObjectURL(
    new Blob([csvText(rows, columns)], { type: 'text/csv;charset=utf-8;' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
