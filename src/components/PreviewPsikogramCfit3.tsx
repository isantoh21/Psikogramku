
import React, { useCallback, useRef, useState } from 'react';
import { Cfit3AppState, INITIAL_CFIT3_STATE } from '../types';
import { getIqClassification, formatDateId, calculateAge } from '../utils/scoring';
import { LOGO_ANNUR_BASE64 } from '../assets/logoAnnur';
import { FileText, Printer, Download, Loader2 } from 'lucide-react';

interface PreviewPsikogramCfit3Props {
  state?: Cfit3AppState;
}

export function PreviewPsikogramCfit3({ state }: PreviewPsikogramCfit3Props) {
  const safeState = state || INITIAL_CFIT3_STATE;
  const clientData = safeState.clientData || INITIAL_CFIT3_STATE.clientData;
  const kecerdasanUmum = safeState.kecerdasanUmum || INITIAL_CFIT3_STATE.kecerdasanUmum;
  const bakatKemampuan = safeState.bakatKemampuan || INITIAL_CFIT3_STATE.bakatKemampuan;
  const rmibInterests = safeState.rmibInterests || INITIAL_CFIT3_STATE.rmibInterests;
  const dreamJobs = safeState.dreamJobs || INITIAL_CFIT3_STATE.dreamJobs;
  const psikolog = safeState.psikologPemeriksa || INITIAL_CFIT3_STATE.psikologPemeriksa;
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  const renderFormattedRecommendation = (rawText?: string) => {
    if (!rawText || !rawText.trim()) {
      return (
        <span className="italic text-gray-500">
          Rekomendasi tindak lanjut belum diisi. Gunakan tombol &quot;Generate Rekomendasi AI&quot; di form input atau tulis rekomendasi di formulir.
        </span>
      );
    }

    // 1. Bersihkan judul pembuka yang redundan di paling atas (seperti "Rekomendasi Tindak Lanjut Psikologis")
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^(\*{0,2})rekomendasi\s+tindak\s+lanjut(\s+psikologis)?(\*{0,2})[:\s\n\r]*/i, '').trim();
    cleaned = cleaned.replace(/^(\*{0,2})rekomendasi\s+psikologis(\*{0,2})[:\s\n\r]*/i, '').trim();

    // 2. Pisahkan blok per nomor poin: 1., 2., 3., dst.
    const itemChunks = cleaned.split(/(?:^|\n)(?=\s*\d+[\.\)])/g).filter(c => c.trim().length > 0);

    if (itemChunks.length > 0 && itemChunks.some(c => /^\s*\d+[\.\)]/.test(c))) {
      return (
        <div className="space-y-1.5">
          {itemChunks.map((chunk, idx) => {
            const trimmed = chunk.trim();
            const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

            let title = '';
            let content = '';

            if (lines.length >= 2 && /^\d+[\.\)]/.test(lines[0])) {
              title = lines[0];
              content = lines.slice(1).join('\n');
            } else {
              const colonMatch = trimmed.match(/^(\d+[\.\)][^:\n]+:)\s*([\s\S]+)$/);
              if (colonMatch) {
                title = colonMatch[1].trim();
                content = colonMatch[2].trim();
              } else {
                const numMatch = trimmed.match(/^(\d+[\.\)][^\n]+)/);
                title = numMatch ? numMatch[1] : trimmed;
                content = trimmed.substring(title.length).trim();
              }
            }

            title = title.replace(/\*\*/g, '').trim();
            content = content.replace(/\*\*/g, '').trim();

            return (
              <div key={idx} className="text-[9px] leading-relaxed">
                <p className="font-bold text-gray-900 leading-snug mb-0.5">
                  <b>{title}</b>
                </p>
                {content && (
                  <p className="font-normal text-gray-800 text-justify leading-relaxed whitespace-pre-line">
                    {content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="text-[9px] font-normal leading-relaxed text-justify whitespace-pre-wrap">
        {cleaned}
      </div>
    );
  };

  const exportToDocx = () => {
    const element = document.getElementById('psikogram-preview-cfit3');
    if (!element) return;

    const contentHtml = element.innerHTML;

    const fullDocHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Laporan Hasil Pemeriksaan Psikologis - ${(clientData.nama || 'Klien')}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 210mm 297mm;
            margin: 9mm 12mm 9mm 12mm;
            mso-page-orientation: portrait;
            mso-header-margin: 0mm;
            mso-footer-margin: 0mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            line-height: 1.15;
            color: #000000;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            width: 100%;
          }
          td, th {
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            line-height: 1.15;
            mso-line-height-rule: exactly;
          }
          b, strong {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 186mm; margin: 0 auto;">
          ${contentHtml}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', fullDocHtml], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Panti_Clarak_${(clientData.nama || 'Klien').replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPdf = useCallback(async () => {
    const element = previewRef.current || document.getElementById('psikogram-preview-cfit3');
    if (!element || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jspdfModule = await import('jspdf');
      const jsPDFConstructor = jspdfModule.jsPDF || (jspdfModule.default && (jspdfModule.default as any).jsPDF) || jspdfModule.default;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save(`Laporan_Panti_Clarak_${(clientData.nama || 'Klien').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  }, [clientData.nama, isExportingPdf]);

  const exportAsImage = useCallback(async () => {
    const element = previewRef.current || document.getElementById('psikogram-preview-cfit3');
    if (!element || isExportingImage) return;
    setIsExportingImage(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `Laporan_Panti_Clarak_${(clientData.nama || 'Klien').replace(/\s+/g, '_')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Image export failed:', err);
    } finally {
      setIsExportingImage(false);
    }
  }, [clientData.nama, isExportingImage]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const getStar = (val: number, expected: number) => {
    return val === expected ? '✬' : '';
  };

  const renderAspectRow = (no: string, title: string, desc: string, val: number) => (
    <tr key={title} style={{ fontSize: '9px', lineHeight: '1.15' }}>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', verticalAlign: 'top', fontWeight: 500, width: '4%' }}>{no}</td>
      <td style={{ border: '1px solid black', padding: '1.5px 4px' }}>
        <span style={{ fontWeight: 'bold', color: '#111827' }}>{title}</span>
        <span style={{ color: '#374151', display: 'block', fontSize: '8.5px', lineHeight: '1.15' }}>{desc}</span>
      </td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 1)}</td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 2)}</td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 3)}</td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 4)}</td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 5)}</td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 6)}</td>
      <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '6.5%' }}>{getStar(val, 7)}</td>
    </tr>
  );

  const iqNum = safeState.iqScore !== '' ? Number(safeState.iqScore) : null;
  const testDateFormatted = clientData.tanggalTes ? formatDateId(clientData.tanggalTes) : '';
  const currentDateFormatted = formatDateId(new Date().toISOString().split('T')[0]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Action Bar (Hidden on Print) */}
      <div className="sticky top-0 z-20 w-full max-w-[210mm] bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2 mb-4 flex justify-between items-center print:hidden rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-700">Kertas A4</span>
          <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">210 mm × 297 mm (1 Lembar)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPdf}
            disabled={isExportingPdf}
            className="flex items-center text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            {isExportingPdf ? 'Menyimpan...' : 'Simpan PDF'}
          </button>
          <button
            onClick={exportAsImage}
            disabled={isExportingImage}
            className="flex items-center text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingImage ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            {isExportingImage ? 'Menyimpan...' : 'Simpan Gambar'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Cetak
          </button>
          <button
            onClick={exportToDocx}
            className="flex items-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Cetak Word (DOCX)
          </button>
        </div>
      </div>

      {/* Main A4 Paper Sheet */}
      <div
        ref={previewRef}
        id="psikogram-preview-cfit3"
        className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-black font-serif text-[9.5px] leading-tight print:shadow-none print:m-0 print:border-none print:w-[210mm] print:min-h-[297mm] print:max-h-[297mm] print:overflow-hidden mx-auto"
        style={{
          width: '210mm',
          minHeight: '297mm',
          maxHeight: '297mm',
          padding: '8mm 12mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#000000',
          pageBreakInside: 'avoid',
          breakInside: 'avoid'
        }}
      >
        {/* Header Kop Surat (Table layout for 100% Word & PDF fidelity) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderBottom: '2px solid black', marginBottom: '6px', paddingBottom: '3px' }}>
          <tbody>
            <tr>
              <td style={{ width: '68px', verticalAlign: 'middle', border: 'none', padding: '0 6px 4px 0' }}>
                <img
                  src={LOGO_ANNUR_BASE64}
                  alt="Logo AN-NUR Psycho Center"
                  width="64"
                  height="64"
                  style={{ width: '64px', height: '64px', objectFit: 'contain', display: 'block' }}
                />
              </td>
              <td style={{ verticalAlign: 'middle', border: 'none', padding: '0 0 4px 0', textAlign: 'left' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.15', letterSpacing: '0.5px' }}>
                  AN-NUR PSYCHO CENTER
                </div>
                <div style={{ fontSize: '9px', lineHeight: '1.2', color: '#1f2937' }}>
                  Layanan Konsultasi, Edukasi, dan Tes Psikologi Kota Probolinggo
                </div>
                <div style={{ fontSize: '8.5px', lineHeight: '1.2', color: '#374151' }}>
                  Jl. Hayam Wuruk II/2, Kec. Mayangan, Kota Probolinggo | SIPP: {psikolog?.sipp || '20250059-2025-01-0567'}
                </div>
                <div style={{ fontSize: '7.5px', lineHeight: '1.2', color: '#4b5563' }}>
                  Email: annurpsychocenter@gmail.com | IG: @annurpsychocenter
                </div>
              </td>
              <td style={{ width: '85px', verticalAlign: 'top', textAlign: 'right', border: 'none', padding: '0 0 4px 0' }}>
                <div style={{ display: 'inline-block', border: '1px solid black', padding: '2px 8px', fontWeight: 'bold', fontSize: '9px', letterSpacing: '1.5px', textAlign: 'center' }}>
                  RAHASIA
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', textDecoration: 'underline' }}>
            HASIL PEMERIKSAAN PSIKOLOGIS
          </span>
        </div>

        {/* Data Klien */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '9px', marginBottom: '6px' }}>
          <tbody>
            <tr>
              <td style={{ border: 'none', padding: '1px 0', width: '13%', fontWeight: 500 }}>Nama</td>
              <td style={{ border: 'none', padding: '1px 0', width: '2%' }}>:</td>
              <td style={{ border: 'none', padding: '1px 0', width: '43%', fontWeight: 'bold', textTransform: 'uppercase' }}>{clientData.nama || '-'}</td>
              <td style={{ border: 'none', padding: '1px 0', width: '16%', fontWeight: 500 }}>Jenjang / Sekolah</td>
              <td style={{ border: 'none', padding: '1px 0', width: '2%' }}>:</td>
              <td style={{ border: 'none', padding: '1px 0', fontWeight: 'bold' }}>
                {clientData.pendidikan ? `${clientData.pendidikan}` : ''} {clientData.asalSekolah ? `- ${clientData.asalSekolah}` : ''}
              </td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '1px 0', fontWeight: 500 }}>Usia</td>
              <td style={{ border: 'none', padding: '1px 0' }}>:</td>
              <td style={{ border: 'none', padding: '1px 0' }}>{calculateAge(clientData.tanggalLahir, clientData.tanggalTes) || '-'}</td>
              <td style={{ border: 'none', padding: '1px 0', fontWeight: 500 }}>Tanggal Tes</td>
              <td style={{ border: 'none', padding: '1px 0' }}>:</td>
              <td style={{ border: 'none', padding: '1px 0' }}>{testDateFormatted || '-'}</td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '1px 0', fontWeight: 500 }}>Jenis Kelamin</td>
              <td style={{ border: 'none', padding: '1px 0' }}>:</td>
              <td style={{ border: 'none', padding: '1px 0' }}>{clientData.jenisKelamin || '-'}</td>
              <td style={{ border: 'none', padding: '1px 0', fontWeight: 500 }}>No. Laporan</td>
              <td style={{ border: 'none', padding: '1px 0' }}>:</td>
              <td style={{ border: 'none', padding: '1px 0' }}>{clientData.nomorLaporan || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* 1. Taraf Kecerdasan IQ CFIT Skala 3 */}
        <div style={{ marginBottom: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', textAlign: 'center', fontSize: '8.5px', lineHeight: '1.15' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid black', padding: '2px', fontWeight: 'bold', textAlign: 'center', width: '20%' }} rowSpan={2}>
                  PSIKOGRAM<br />Taraf Kecerdasan (CFIT)
                </th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Sangat Rendah<br />&lt; 70</th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Rendah<br />70 - 79</th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Rata-rata Bawah<br />80 - 89</th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Rata-rata<br />90 - 109</th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Rata-rata Atas<br />110 - 119</th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Tinggi<br />120 - 129</th>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '11.4%' }}>Sangat Tinggi<br />&ge; 130</th>
              </tr>
              <tr style={{ height: '18px' }}>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum < 70 ? '✓' : ''}</td>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum >= 70 && iqNum <= 79 ? '✓' : ''}</td>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum >= 80 && iqNum <= 89 ? '✓' : ''}</td>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum >= 90 && iqNum <= 109 ? '✓' : ''}</td>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum >= 110 && iqNum <= 119 ? '✓' : ''}</td>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum >= 120 && iqNum <= 129 ? '✓' : ''}</td>
                <td style={{ border: '1px solid black', fontWeight: 'bold', fontSize: '12px' }}>{iqNum !== null && iqNum >= 130 ? '✓' : ''}</td>
              </tr>
            </thead>
          </table>
          <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', fontSize: '8px', marginTop: '1px', fontStyle: 'italic', color: '#374151' }}>
            <tbody>
              <tr>
                <td style={{ border: 'none', padding: '0', textAlign: 'left' }}>
                  * Skor IQ CFIT Skala 3: <strong style={{ fontStyle: 'normal' }}>{safeState.iqScore !== '' ? safeState.iqScore : '-'}</strong> ({safeState.iqLabel || getIqClassification(safeState.iqScore)})
                </td>
                <td style={{ border: 'none', padding: '0', textAlign: 'right' }}>
                  Raw Score: {safeState.rawScoreTotal !== '' ? safeState.rawScoreTotal : '-'} / 50
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Tabel Aspek Psikologis CFIT Skala 3 */}
        <div style={{ marginBottom: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', fontSize: '9px' }}>
                <th style={{ border: '1px solid black', padding: '1.5px', width: '4%' }} rowSpan={2}>No</th>
                <th style={{ border: '1px solid black', padding: '1.5px 4px', textAlign: 'left' }} rowSpan={2}>Aspek Psikologis</th>
                <th style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center' }} colSpan={7}>Kapasitas Aspek</th>
              </tr>
              <tr style={{ backgroundColor: '#e5e7eb', fontSize: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>SR</th>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>R</th>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>C-</th>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>C</th>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>C+</th>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>T</th>
                <th style={{ border: '1px solid black', padding: '1px', width: '6.5%' }}>ST</th>
              </tr>
            </thead>
            <tbody>
              {/* Bagian A */}
              <tr>
                <td style={{ border: '1px solid black', padding: '1.5px 4px', backgroundColor: '#f3f4f6', fontWeight: 'bold', fontSize: '9px' }} colSpan={9}>
                  A. Aspek Kecerdasan Umum
                </td>
              </tr>
              {renderAspectRow('1', 'Pemahaman', 'Kapasitas memahami pola aturan, instruksi, dan persyaratan masalah secara tepat.', kecerdasanUmum.pemahaman)}
              {renderAspectRow('2', 'Penalaran', 'Kapasitas menalar secara logis, menghubungkan beragam premis, serta menyelesaikan masalah baru (fluid intelligence).', kecerdasanUmum.penalaran)}
              {renderAspectRow('3', 'Daya Analisis', 'Kapasitas mengurai stimulus masalah menjadi bagian-bagian terperinci serta mendeteksi elemen kritis.', kecerdasanUmum.dayaAnalisis)}
              {renderAspectRow('4', 'Daya Sintesis', 'Kapasitas mengintegrasikan potongan informasi yang terpisah menjadi satu kesatuan pemahaman yang utuh.', kecerdasanUmum.dayaSintesis)}
              {renderAspectRow('5', 'Daya Ingat', 'Kapasitas memori kerja (working memory) dalam mempertahankan dan merecall aturan-aturan pola abstrak.', kecerdasanUmum.dayaIngat)}

              {/* Bagian B */}
              <tr>
                <td style={{ border: '1px solid black', padding: '1.5px 4px', backgroundColor: '#f3f4f6', fontWeight: 'bold', fontSize: '9px' }} colSpan={9}>
                  B. Aspek Bakat Kemampuan
                </td>
              </tr>
              {renderAspectRow('1', 'Sistematika Berpikir', 'Kemampuan alur berpikir terstruktur, runtut, dan berkesinambungan saat menghadapi deret tugas.', bakatKemampuan.sistematikaBerpikir)}
              {renderAspectRow('2', 'Logika Hubungan', 'Kemampuan menangkap korelasi kausal, analogi abstrak, dan transformasi matriks secara konsisten.', bakatKemampuan.logikaHubungan)}
              {renderAspectRow('3', 'Ketajaman Diferensiasi', 'Kemampuan membedakan detail halus, mendeteksi penyimpangan, dan mengklasifikasikan pola objek.', bakatKemampuan.ketajamanDiferensiasi)}
            </tbody>
          </table>
          <div style={{ fontSize: '7.5px', marginTop: '1px', fontStyle: 'italic', color: '#4b5563' }}>
            Keterangan Taraf: SR=Sangat Rendah, R=Rendah, C-=Rata-rata Bawah, C=Rata-rata, C+=Rata-rata Atas, T=Tinggi, ST=Sangat Tinggi
          </div>
        </div>

        {/* 3. Minat RMIB & Pekerjaan Impian (Side-by-side table layout for Word & PDF) */}
        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginBottom: '6px' }}>
          <tbody>
            <tr>
              {/* Kolom Kiri: RMIB (66%) */}
              <td style={{ width: '66%', verticalAlign: 'top', border: 'none', padding: '0 5px 0 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '8.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th colSpan={3} style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'left', fontWeight: 'bold' }}>
                        C. Aspek Minat (RMIB - Rothwell Miller)
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: '#f9fafb', fontSize: '7.5px', textAlign: 'center', fontWeight: 'bold' }}>
                      <th style={{ border: '1px solid black', padding: '1px', width: '6%' }}>No</th>
                      <th style={{ border: '1px solid black', padding: '1px', width: '30%' }}>Bidang Minat</th>
                      <th style={{ border: '1px solid black', padding: '1px' }}>Deskripsi Ringkas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rmibInterests.map((interest, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid black', padding: '1.5px', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid black', padding: '1.5px 3px', fontWeight: 'bold', color: '#111827' }}>{interest.name || '-'}</td>
                        <td style={{ border: '1px solid black', padding: '1.5px 3px', fontSize: '7.5px', color: '#374151', lineHeight: '1.15' }}>{interest.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>

              {/* Kolom Kanan: Pekerjaan Impian (34%) */}
              <td style={{ width: '34%', verticalAlign: 'top', border: 'none', padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '8.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th colSpan={2} style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'left', fontWeight: 'bold' }}>
                        Pekerjaan Impian
                      </th>
                    </tr>
                    <tr style={{ backgroundColor: '#f9fafb', fontSize: '7.5px', textAlign: 'center', fontWeight: 'bold' }}>
                      <th style={{ border: '1px solid black', padding: '1px', width: '16%' }}>No</th>
                      <th style={{ border: '1px solid black', padding: '1px' }}>Cita-cita / Impian Klien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2].map(idx => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid black', padding: '2px 3px', fontWeight: 'bold', color: '#111827', fontSize: '8px' }}>
                          {dreamJobs[idx] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 4. Rekomendasi Tindak Lanjut */}
        <div style={{ marginBottom: '5px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '8.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  D. REKOMENDASI TINDAK LANJUT
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top', textAlign: 'justify', lineHeight: '1.25' }}>
                  {renderFormattedRecommendation(safeState.rekomendasi)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Tanda Tangan Psikolog (Table layout for 100% Word alignment) */}
        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginTop: '2px' }}>
          <tbody>
            <tr>
              <td style={{ width: '58%', border: 'none' }}></td>
              <td style={{ width: '42%', border: 'none', textAlign: 'center', fontSize: '8.5px', lineHeight: '1.15' }}>
                <div>{psikolog?.kota || 'Probolinggo'}, {testDateFormatted || currentDateFormatted}</div>
                <div style={{ fontWeight: 500, marginBottom: '32px' }}>Psikolog Pemeriksa,</div>
                <div>
                  <span style={{ fontWeight: 'bold', borderBottom: '1px solid black', display: 'inline-block', padding: '0 4px' }}>
                    {psikolog?.nama || 'Muhammad Ikhsan, M.Psi., Psikolog'}
                  </span>
                </div>
                <div style={{ fontSize: '7.5px', color: '#374151', marginTop: '1px' }}>
                  SIPP. {psikolog?.sipp || '20250059-2025-01-0567'}
                </div>
                {psikolog?.siap && !psikolog?.nama?.toLowerCase().includes('chozina') && (
                  <div style={{ fontSize: '7px', color: '#4b5563' }}>
                    No. SIAP: {psikolog.siap}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
