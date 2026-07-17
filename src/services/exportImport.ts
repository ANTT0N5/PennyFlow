import type { Transaction, Category, Settings } from '@/types';
import { format } from '@/utils/date';
// ===== CSV =====
export function exportToCSV(transactions: Transaction[], categories: Category[], settings: Settings): string {
  const headers = ['Fecha', 'Hora', 'Tipo', 'Importe', 'Concepto', 'Categoría', 'Etiquetas', 'Notas'];
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return [
      format(new Date(t.date), settings.dateFormat),
      t.time || '',
      t.type === 'expense' ? 'Gasto' : 'Ingreso',
      t.amount.toFixed(2),
      `"${t.concept.replace(/"/g, '""')}"`,
      `"${cat?.name || ''}"`,
      `"${t.tags.join(', ')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

// ===== JSON =====
export function exportToJSON(transactions: Transaction[], categories: Category[]): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories
  }, null, 2);
}

// ===== Excel (formato SpreadsheetML 2003 — abre en Excel sin dependencias) =====
export function exportToExcel(transactions: Transaction[], categories: Category[], settings: Settings): string {
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return `
      <Row>
        <Cell><Data ss:Type="String">${format(new Date(t.date), settings.dateFormat)}</Data></Cell>
        <Cell><Data ss:Type="String">${t.time || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${t.type === 'expense' ? 'Gasto' : 'Ingreso'}</Data></Cell>
        <Cell><Data ss:Type="Number">${t.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.concept)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(cat?.name || '')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.tags.join(', '))}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.note || '')}</Data></Cell>
      </Row>`;
  }).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Movimientos">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Fecha</Data></Cell>
        <Cell><Data ss:Type="String">Hora</Data></Cell>
        <Cell><Data ss:Type="String">Tipo</Data></Cell>
        <Cell><Data ss:Type="String">Importe</Data></Cell>
        <Cell><Data ss:Type="String">Concepto</Data></Cell>
        <Cell><Data ss:Type="String">Categoría</Data></Cell>
        <Cell><Data ss:Type="String">Etiquetas</Data></Cell>
        <Cell><Data ss:Type="String">Notas</Data></Cell>
      </Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ===== PDF (HTML imprimible — se abre con print dialog) =====
export function exportToPDF(transactions: Transaction[], categories: Category[], settings: Settings): string {
  const rows = transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return `<tr>
      <td>${format(new Date(t.date), settings.dateFormat)}</td>
      <td>${t.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
      <td style="text-align:right">${t.amount.toFixed(2)} ${settings.currency}</td>
      <td>${escapeHtml(t.concept)}</td>
      <td>${escapeHtml(cat?.name || '')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Movimientos - Finanzas Personales</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1e293b; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .expense { color: #dc2626; }
    .income { color: #059669; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Informe de Movimientos</h1>
  <div class="meta">
    Generado el ${format(new Date(), settings.dateFormat + ' HH:mm')} · ${transactions.length} movimientos
  </div>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Tipo</th>
        <th style="text-align:right">Importe</th>
        <th>Concepto</th>
        <th>Categoría</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ===== Descarga de archivos =====
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ===== Importación =====
export function parseCSV(content: string): Partial<Transaction>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detectar separador (, o ;)
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = parseCSVLine(lines[0], sep);

  const result: Partial<Transaction>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], sep);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.toLowerCase().trim()] = values[idx] || '';
    });

    const type = (row.tipo || row.type || '').toLowerCase().includes('ing')
      ? 'income'
      : 'expense';
    const amount = parseFloat((row.importe || row.amount || '0').replace(',', '.'));
    const dateStr = row.fecha || row.date || '';
    const parsedDate = parseDate(dateStr);

    result.push({
      type: type as 'expense' | 'income',
      amount: isNaN(amount) ? 0 : amount,
      concept: row.concepto || row.concept || '',
      date: parsedDate,
      time: row.hora || row.time || undefined,
      note: row.notas || row.note || undefined
    });
  }
  return result;
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseDate(str: string): number {
  // dd/MM/yyyy
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])).getTime();
  // yyyy-MM-dd
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])).getTime();
  // ISO
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();
  return Date.now();
}

export function parseJSON(content: string): { transactions?: Partial<Transaction>[]; categories?: Partial<Category>[] } {
  const parsed = JSON.parse(content);
  return {
    transactions: parsed.transactions || [],
    categories: parsed.categories || []
  };
}
