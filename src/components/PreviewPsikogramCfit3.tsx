import React from 'react';
import { Cfit3AppState, INITIAL_CFIT3_STATE } from '../types';
import { getIqClassification, formatDateId, calculateAge } from '../utils/scoring';
import { LOGO_ANNUR_BASE64 } from '../assets/logoAnnur';
import { FileText, Printer } from 'lucide-react';

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

  const exportToDocx = () => {
    const element = document.getElementById('psikogram-preview-cfit3');
    if (!element) return;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Psikogram CFIT Skala 3</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 9.5pt;
            line-height: 1.25;
            color: black;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid black;
            padding: 3px 5px;
          }
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const html = header + element.innerHTML + footer;
    const blob = new Blob(['\ufeff', html], {
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

  const handlePrint = () => {
    window.print();
  };

  const getStar = (val: number, expected: number) => {
    return val === expected ? '✬' : '';
  };

  const renderAspectRow = (no: string, title: string, desc: string, val: number) => (
    <tr key={title} className="text-[10px] leading-tight">
      <td className="border border-black px-1.5 py-0.5 text-center align-top font-medium w-[4%]">{no}</td>
      <td className="border border-black px-2 py-0.5">
        <span className="font-bold text-gray-900">{title}</span>
        <span className="text-gray-700 block text-[9.5px] leading-snug">{desc}</span>
      </td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 1)}</td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 2)}</td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 3)}</td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 4)}</td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 5)}</td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 6)}</td>
      <td className="border border-black px-1 py-0.5 text-center font-bold text-xs w-[6.5%]">{getStar(val, 7)}</td>
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
            onClick={handlePrint}
            className="flex items-center text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Cetak / Simpan PDF
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
        id="psikogram-preview-cfit3"
        className="w-[210mm] min-h-[297mm] bg-white text-black font-serif text-[10.5px] leading-tight print:shadow-none print:m-0 print:p-0 print:w-full print:min-h-0 mx-auto"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '10mm 14mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header Kop Surat */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
            <div className="flex items-center">
              <img 
                src={LOGO_ANNUR_BASE64} 
                alt="Logo AN-NUR Psycho Center" 
                width="72"
                height="72"
                style={{ width: '72px', height: '72px', objectFit: 'contain' }}
                className="w-16 h-16 mr-3 object-contain flex-shrink-0"
              />
              <div>
                <h1 className="text-base font-bold uppercase tracking-wide leading-tight">AN-NUR PSYCHO CENTER</h1>
                <p className="text-[9.5px] leading-tight text-gray-800">Layanan Konsultasi, Edukasi, dan Tes Psikologi Kota Probolinggo</p>
                <p className="text-[8.5px] leading-tight text-gray-700">Jl. Hayam Wuruk II/2, Kec. Mayangan, Kota Probolinggo | SIPP: 20250059-2025-01-0567</p>
                <p className="text-[8px] leading-tight text-gray-600">Email: annurpsychocenter@gmail.com | IG: @annurpsychocenter</p>
              </div>
            </div>
            <div className="border border-black px-3 py-1 font-bold text-[10px] tracking-widest self-start">
              RAHASIA
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider underline">HASIL PEMERIKSAAN PSIKOLOGIS</h2>
          </div>

          {/* Data Klien */}
          <div className="mb-2.5">
            <table className="w-full border-none text-[10px]">
              <tbody>
                <tr>
                  <td className="border-none py-0.5 w-[14%] font-medium">Nama</td>
                  <td className="border-none py-0.5 w-[2%]">:</td>
                  <td className="border-none py-0.5 w-[42%] font-bold uppercase">{clientData.nama || '-'}</td>
                  <td className="border-none py-0.5 w-[16%] font-medium">Jenjang / Sekolah</td>
                  <td className="border-none py-0.5 w-[2%]">:</td>
                  <td className="border-none py-0.5 font-semibold">
                    {clientData.pendidikan ? `${clientData.pendidikan}` : ''} {clientData.asalSekolah ? `- ${clientData.asalSekolah}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="border-none py-0.5 font-medium">Usia</td>
                  <td className="border-none py-0.5">:</td>
                  <td className="border-none py-0.5">{calculateAge(clientData.tanggalLahir, clientData.tanggalTes) || '-'}</td>
                  <td className="border-none py-0.5 font-medium">Tanggal Tes</td>
                  <td className="border-none py-0.5">:</td>
                  <td className="border-none py-0.5">{testDateFormatted || '-'}</td>
                </tr>
                <tr>
                  <td className="border-none py-0.5 font-medium">Jenis Kelamin</td>
                  <td className="border-none py-0.5">:</td>
                  <td className="border-none py-0.5">{clientData.jenisKelamin || '-'}</td>
                  <td className="border-none py-0.5 font-medium">No. Laporan</td>
                  <td className="border-none py-0.5">:</td>
                  <td className="border-none py-0.5">{clientData.nomorLaporan || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1. Taraf Kecerdasan IQ CFIT Skala 3 */}
          <div className="mb-2.5">
            <table className="w-full border-collapse border border-black text-center text-[9px] leading-tight">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 font-bold text-center w-[20%]" rowSpan={2}>
                    PSIKOGRAM<br/>Taraf Kecerdasan (CFIT)
                  </th>
                  <th className="border border-black p-0.5 w-[11.4%]">Sangat Rendah<br/>&lt; 70</th>
                  <th className="border border-black p-0.5 w-[11.4%]">Rendah<br/>70 - 79</th>
                  <th className="border border-black p-0.5 w-[11.4%]">Rata-rata Bawah<br/>80 - 89</th>
                  <th className="border border-black p-0.5 w-[11.4%]">Rata-rata<br/>90 - 109</th>
                  <th className="border border-black p-0.5 w-[11.4%]">Rata-rata Atas<br/>110 - 119</th>
                  <th className="border border-black p-0.5 w-[11.4%]">Tinggi<br/>120 - 129</th>
                  <th className="border border-black p-0.5 w-[11.4%]">Sangat Tinggi<br/>&ge; 130</th>
                </tr>
                <tr className="h-6">
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum < 70 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum >= 70 && iqNum <= 79 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum >= 80 && iqNum <= 89 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum >= 90 && iqNum <= 109 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum >= 110 && iqNum <= 119 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum >= 120 && iqNum <= 129 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-base">{iqNum !== null && iqNum >= 130 ? '✓' : ''}</td>
                </tr>
              </thead>
            </table>
            <div className="flex justify-between items-center text-[9px] mt-0.5 italic text-gray-700 px-1">
              <span>* Skor IQ CFIT Skala 3: <strong>{safeState.iqScore !== '' ? safeState.iqScore : '-'}</strong> ({safeState.iqLabel || getIqClassification(safeState.iqScore)})</span>
              <span>Raw Score: {safeState.rawScoreTotal !== '' ? safeState.rawScoreTotal : '-'} / 50</span>
            </div>
          </div>

          {/* 2. Tabel Aspek Psikologis CFIT Skala 3 */}
          <div className="mb-2.5">
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 text-[10px]">
                  <th className="border border-black p-1 w-[4%]" rowSpan={2}>No</th>
                  <th className="border border-black p-1 text-left" rowSpan={2}>Aspek Psikologis</th>
                  <th className="border border-black p-0.5 text-center" colSpan={7}>Kapasitas Aspek</th>
                </tr>
                <tr className="bg-gray-200 text-[9px] text-center font-bold">
                  <th className="border border-black p-0.5 w-[6.5%]">SR</th>
                  <th className="border border-black p-0.5 w-[6.5%]">R</th>
                  <th className="border border-black p-0.5 w-[6.5%]">C-</th>
                  <th className="border border-black p-0.5 w-[6.5%]">C</th>
                  <th className="border border-black p-0.5 w-[6.5%]">C+</th>
                  <th className="border border-black p-0.5 w-[6.5%]">T</th>
                  <th className="border border-black p-0.5 w-[6.5%]">ST</th>
                </tr>
              </thead>
              <tbody>
                {/* Bagian A */}
                <tr>
                  <td className="border border-black px-2 py-0.5 bg-gray-100 font-bold text-[10px]" colSpan={9}>
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
                  <td className="border border-black px-2 py-0.5 bg-gray-100 font-bold text-[10px]" colSpan={9}>
                    B. Aspek Bakat Kemampuan
                  </td>
                </tr>
                {renderAspectRow('1', 'Sistematika Berpikir', 'Kemampuan alur berpikir terstruktur, runtut, dan berkesinambungan saat menghadapi deret tugas.', bakatKemampuan.sistematikaBerpikir)}
                {renderAspectRow('2', 'Logika Hubungan', 'Kemampuan menangkap korelasi kausal, analogi abstrak, dan transformasi matriks secara konsisten.', bakatKemampuan.logikaHubungan)}
                {renderAspectRow('3', 'Ketajaman Diferensiasi', 'Kemampuan membedakan detail halus, mendeteksi penyimpangan, dan mengklasifikasikan pola objek.', bakatKemampuan.ketajamanDiferensiasi)}
              </tbody>
            </table>
            <div className="text-[8.5px] mt-0.5 italic text-gray-600 px-1">
              Keterangan Taraf: SR=Sangat Rendah, R=Rendah, C-=Rata-rata Bawah, C=Rata-rata, C+=Rata-rata Atas, T=Tinggi, ST=Sangat Tinggi
            </div>
          </div>

          {/* 3. Minat RMIB & Pekerjaan Impian (Side-by-side) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2.5">
            {/* Top 3 Minat RMIB */}
            <div className="sm:col-span-8">
              <table className="w-full border-collapse border border-black text-[9.5px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-2 py-0.5 text-left font-bold" colSpan={3}>
                      C. Aspek Minat (RMIB - Rothwell Miller)
                    </th>
                  </tr>
                  <tr className="bg-gray-50 text-[8.5px] text-center font-bold">
                    <th className="border border-black p-0.5 w-[6%]">No</th>
                    <th className="border border-black p-0.5 w-[30%]">Bidang Minat</th>
                    <th className="border border-black p-0.5">Deskripsi Ringkas</th>
                  </tr>
                </thead>
                <tbody>
                  {rmibInterests.map((interest, idx) => (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 font-semibold text-gray-900">{interest.name || '-'}</td>
                      <td className="border border-black p-1 text-[8.5px] text-gray-700 leading-tight">
                        {interest.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top 3 Pekerjaan Impian */}
            <div className="sm:col-span-4">
              <table className="w-full border-collapse border border-black text-[9.5px] h-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-2 py-0.5 text-left font-bold" colSpan={2}>
                      Pekerjaan Impian
                    </th>
                  </tr>
                  <tr className="bg-gray-50 text-[8.5px] text-center font-bold">
                    <th className="border border-black p-0.5 w-[15%]">No</th>
                    <th className="border border-black p-0.5">Cita-cita / Impian Klien</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].map(idx => (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 font-semibold text-gray-900 text-[9px]">
                        {dreamJobs[idx] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Rekomendasi Tindak Lanjut */}
          <div className="mb-2">
            <table className="w-full border-collapse border border-black text-[9.5px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-0.5 text-center font-bold uppercase tracking-wider">
                    D. REKOMENDASI TINDAK LANJUT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 align-top text-[9px] leading-relaxed whitespace-pre-wrap text-justify">
                    {safeState.rekomendasi || 'Rekomendasi tindak lanjut belum diisi. Gunakan tombol "Generate Rekomendasi AI" di form input atau tulis rekomendasi di formulir.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Tanda Tangan Psikolog */}
          <div className="flex justify-end mt-1 mr-4 text-center text-[9.5px]">
            <div>
              <p className="mb-0.5">Probolinggo, {testDateFormatted || currentDateFormatted}</p>
              <p className="mb-10 font-medium">Psikolog Pemeriksa,</p>
              
              <div className="flex justify-center items-center relative mb-0.5">
                <p className="font-bold border-b border-black inline-block z-10 relative bg-white px-1">
                  Muhammad Ikhsan, M.Psi., Psikolog
                </p>
              </div>
              <p className="text-[8.5px] text-gray-700">SIPP. 20250059-2025-01-0567</p>
            </div>
          </div>
        </div>
      </div>
  );
}
