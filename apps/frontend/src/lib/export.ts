/**
 * Utility functions for exporting data in various formats (PDF, CSV, Excel, DOCX).
 */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data as a CSV file.
 */
export function exportToCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(val => {
      const escaped = String(val ?? '').replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(','))
  ].join('\n');

  // Prefix with UTF-8 BOM so Excel opens it with correct encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Exports data as an Excel XML Spreadsheet / HTML Table format (.xls).
 * This allows styling (headers, colors) when opened in Excel.
 */
export function exportToExcelHTML(title: string, headers: string[], rows: string[][], filename: string) {
  let tableHTML = `<table><thead><tr>`;
  headers.forEach(h => {
    tableHTML += `<th>${escapeHTML(h)}</th>`;
  });
  tableHTML += `</tr></thead><tbody>`;

  rows.forEach(row => {
    tableHTML += `<tr>`;
    row.forEach(val => {
      tableHTML += `<td>${escapeHTML(String(val ?? ''))}</td>`;
    });
    tableHTML += `</tr>`;
  });
  tableHTML += `</tbody></table>`;

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${escapeHTML(title.substring(0, 30))}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; margin-top: 20px; }
        th { background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 12px; font-size: 14px; text-align: left; }
        td { border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; color: #334155; }
        .org-header { font-size: 22px; font-weight: bold; color: #0369a1; margin-bottom: 5px; font-family: sans-serif; }
        .title { font-size: 18px; font-weight: bold; color: #475569; margin-bottom: 20px; font-family: sans-serif; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="org-header">Ethiopia National Association on Intellectual Disability</div>
      <div class="title">${escapeHTML(title)}</div>
      ${tableHTML}
    </body>
    </html>
  `;

  const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Exports personal profile data as a styled Excel XML (.xls) sheet.
 */
export function exportProfileToExcel(title: string, sections: { title: string; fields: [string, string][] }[], filename: string) {
  let html = `<div class="title">${escapeHTML(title)}</div>`;

  sections.forEach(section => {
    html += `<h2>${escapeHTML(section.title)}</h2>`;
    html += `<table><tbody>`;
    section.fields.forEach(([label, val]) => {
      html += `<tr><td class="label">${escapeHTML(label)}</td><td>${escapeHTML(val)}</td></tr>`;
    });
    html += `</tbody></table><br/>`;
  });

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Profile Details</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; margin-bottom: 25px; }
        h2 { color: #0284c7; font-family: sans-serif; font-size: 16px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
        td { border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; color: #334155; }
        .org-header { font-size: 22px; font-weight: bold; color: #0369a1; margin-bottom: 5px; font-family: sans-serif; }
        .label { font-weight: bold; background-color: #f8fafc; color: #475569; width: 250px; }
        .title { font-size: 18px; font-weight: bold; color: #475569; margin-bottom: 25px; font-family: sans-serif; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="org-header">Ethiopia National Association on Intellectual Disability</div>
      <div class="title">${escapeHTML(title)}</div>
      ${html}
    </body>
    </html>
  `;

  const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Exports data as a DOCX/DOC file (Word-compatible HTML).
 */
export function exportToWordHTML(title: string, contentHTML: string, filename: string) {
  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #334155; padding: 40px; }
        .org-header { font-size: 26px; font-weight: bold; color: #0369a1; margin-bottom: 5px; text-align: center; }
        h1 { color: #475569; border-bottom: 2px solid #0284c7; padding-bottom: 10px; font-size: 20px; margin-bottom: 30px; text-align: center; }
        h2 { color: #0369a1; margin-top: 35px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
        th { background-color: #f8fafc; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 13px; color: #475569; }
        td { padding: 10px; border: 1px solid #cbd5e1; font-size: 13px; }
        .label { font-weight: bold; color: #475569; width: 30%; background-color: #f8fafc; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .grid td { border: none; padding: 8px; }
        .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; background-color: #f8fafc; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="org-header">Ethiopia National Association on Intellectual Disability</div>
      <h1>${escapeHTML(title)}</h1>
      ${contentHTML}
    </body>
    </html>
  `;

  const blob = new Blob([template], { type: 'application/msword;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Exports data as PDF using browser printing engine (clean iframe printable layout).
 */
export function exportToPDF(title: string, htmlBody: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export to PDF');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHTML(title)}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; }
          .header-container { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0284c7; padding-bottom: 20px; }
          .logo-container { margin-bottom: 15px; }
          .logo-container img { height: 80px; width: auto; }
          .org-header { font-size: 24px; font-weight: bold; color: #0369a1; margin-bottom: 4px; }
          h1 { color: #475569; margin: 10px 0; font-size: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .meta-header { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
          
          h2 { color: #0369a1; margin-top: 35px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background-color: #f8fafc; text-align: left; padding: 10px 14px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 12px; color: #475569; }
          td { padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 12px; color: #334155; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; }
          .field { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background-color: #f8fafc; page-break-inside: avoid; }
          .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
          .value { font-size: 14px; font-weight: 500; margin-top: 4px; color: #0f172a; }
          .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: #e2e8f0; color: #334155; }
          .badge-active { background-color: #dcfce7; color: #15803d; }
          .badge-inactive { background-color: #fee2e2; color: #b91c1c; }
          .badge-review { background-color: #fef9c3; color: #a16207; }
          @media print {
            body { padding: 0; }
            @page { margin: 2cm; }
            .header-container { border-bottom-width: 2pt; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo-container">
            <img src="${window.location.origin}/fikirlogo.jpg" alt="Logo" />
          </div>
          <div class="org-header">Ethiopia National Association on Intellectual Disability</div>
          <h1>${escapeHTML(title)}</h1>
          <div class="meta-header">
            <span>Report Date: ${dateStr}</span>
            <span>Generated at: ${timeStr}</span>
          </div>
        </div>
        ${htmlBody}
        <script>
          window.onload = function() {
            // Give time for the image to load before printing
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Escapes characters for HTML output.
 */
export function escapeHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats enum values to readable words.
 */
export function formatEnum(val?: string | null): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper to format date strings.
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}
