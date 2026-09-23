import React from 'react';
import { SdAppState } from '../types';
import { getIqClassification, getScaleLabel, formatDateId, calculateAge } from '../utils/scoring';
import { Printer, FileText } from 'lucide-react';

interface PreviewPsikogramSDProps {
  state: SdAppState;
}

export function PreviewPsikogramSD({ state }: PreviewPsikogramSDProps) {
  const exportToDocx = () => {
    const element = document.getElementById('psikogram-preview-sd');
    if (!element) return;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Psikogram DOCX</title>
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
    link.download = `Psikogram_SD_${state.clientData.nama.replace(/\s+/g, '_') || 'Klien'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStar = (val: number, expected: number) => {
    return val === expected ? '✬' : '';
  };

  const renderRow = (no: string, title: string, desc: string, val: number) => (
    <tr key={title}>
      <td className="border border-black px-2 py-1 text-center align-top">{no}</td>
      <td className="border border-black px-2 py-1">
        <div className="font-bold">{title}</div>
        <div className="text-sm">{desc}</div>
      </td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 1)}</td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 2)}</td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 3)}</td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 4)}</td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 5)}</td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 6)}</td>
      <td className="border border-black px-1 py-1 text-center font-bold">{getStar(val, 7)}</td>
    </tr>
  );

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-800">Preview Psikogram SD</h2>
        <button 
          onClick={exportToDocx}
          className="flex items-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Cetak Word (DOCX)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex justify-center">
        <div 
          id="psikogram-preview-sd"
          className="bg-white p-10 shadow-lg w-full max-w-[210mm] min-h-[297mm] text-sm font-serif print:shadow-none print:m-0 print:p-0"
          style={{ width: '210mm', color: 'black' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
            <div className="flex items-center">
              <div className="w-20 h-20 mr-4 border border-green-600 rounded-full flex items-center justify-center p-2">
                {/* Mock Logo */}
                <div className="text-green-600 font-bold text-center text-[10px] leading-tight">AN-NUR<br/>Psycho Center</div>
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase mb-1">AN-NUR PSYCHO CENTER</h1>
                <p className="text-sm mb-1">Layanan Konsultasi, Edukasi, dan Tes Psikologi Kota Probolinggo</p>
                <p className="text-xs mb-1">Jl. Hayam Wuruk II/2, Kec. Mayangan, Kota Probolinggo</p>
                <p className="text-xs">Email : annurpsychocenter@gmail.com | Instagram : @annurpsychocenter</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <div className="border-2 border-black px-6 py-1 font-bold">
              RAHASIA
            </div>
          </div>

          <h2 className="text-center text-lg font-bold uppercase mb-6">HASIL PEMERIKSAAN PSIKOLOGIS</h2>

          {/* Data Klien */}
          <div className="mb-6">
            <table className="w-3/4">
              <tbody>
                <tr>
                  <td className="py-1 w-40">Nama</td>
                  <td className="py-1 w-4">:</td>
                  <td className="py-1 font-semibold">{state.clientData.nama}</td>
                </tr>
                <tr>
                  <td className="py-1">Usia</td>
                  <td className="py-1">:</td>
                  <td className="py-1">{calculateAge(state.clientData.tanggalLahir, state.clientData.tanggalTes)}</td>
                </tr>
                <tr>
                  <td className="py-1">Jenis Kelamin</td>
                  <td className="py-1">:</td>
                  <td className="py-1">{state.clientData.jenisKelamin}</td>
                </tr>
                <tr>
                  <td className="py-1">Jenis Layanan</td>
                  <td className="py-1">:</td>
                  <td className="py-1">Tes Bakat Minat SD</td>
                </tr>
                <tr>
                  <td className="py-1">Tanggal Tes</td>
                  <td className="py-1">:</td>
                  <td className="py-1">{state.clientData.tanggalTes ? formatDateId(state.clientData.tanggalTes) : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Taraf Kecerdasan */}
          <div className="mb-6">
            <table className="w-full border-collapse border-2 border-black text-center text-xs">
              <thead>
                <tr>
                  <th className="border border-black p-2 font-bold bg-gray-100" rowSpan={2} style={{ width: '15%' }}>PSIKOGRAM<br/>Taraf Kecerdasan</th>
                  <th className="border border-black p-1">Sangat Rendah<br/>&lt; 70</th>
                  <th className="border border-black p-1">Rendah<br/>70 - 79</th>
                  <th className="border border-black p-1">Rata-rata Bawah<br/>80 - 89</th>
                  <th className="border border-black p-1">Rata-rata<br/>90 - 109</th>
                  <th className="border border-black p-1">Rata-rata Atas<br/>110 - 119</th>
                  <th className="border border-black p-1">Tinggi<br/>120 - 129</th>
                  <th className="border border-black p-1">Sangat Tinggi<br/>&gt; 130</th>
                </tr>
                <tr>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore < 70 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore >= 70 && state.iqScore <= 79 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore >= 80 && state.iqScore <= 89 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore >= 90 && state.iqScore <= 109 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore >= 110 && state.iqScore <= 119 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore >= 120 && state.iqScore <= 129 ? '✓' : ''}</td>
                  <td className="border border-black font-bold text-lg h-8">{state.iqScore !== '' && state.iqScore > 130 ? '✓' : ''}</td>
                </tr>
              </thead>
            </table>
          </div>

          {/* Aspek Table */}
          <div className="mb-6">
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 w-[5%]" rowSpan={2}>No</th>
                  <th className="border border-black p-2 w-[45%]" rowSpan={2}>Aspek</th>
                  <th className="border border-black p-1" colSpan={7}>Kapasitas Aspek</th>
                </tr>
                <tr className="bg-gray-200 text-xs">
                  <th className="border border-black p-1 w-[7%]">SR</th>
                  <th className="border border-black p-1 w-[7%]">R</th>
                  <th className="border border-black p-1 w-[7%]">C-</th>
                  <th className="border border-black p-1 w-[7%]">C</th>
                  <th className="border border-black p-1 w-[7%]">C+</th>
                  <th className="border border-black p-1 w-[7%]">T</th>
                  <th className="border border-black p-1 w-[7%]">ST</th>
                </tr>
              </thead>
              <tbody>
                {/* Bagian A */}
                <tr>
                  <td className="border border-black px-2 py-1 bg-gray-100 font-bold" colSpan={9}>A. Aspek Kecerdasan Umum</td>
                </tr>
                {renderRow('1', 'Pemahaman', 'Kapasitas untuk memahami makna dan mengenali tujuan dari sebuah informasi', state.kecerdasanUmum.pemahaman)}
                {renderRow('2', 'Penalaran', 'Kapasitas untuk menganalisis masalah dengan cara menghubungkan dua atau lebih informasi secara logis', state.kecerdasanUmum.penalaran)}
                {renderRow('3', 'Daya Analisis', 'Kapasitas untuk menjabarkan suatu permasalahan menjadi bagian-bagian informasi yang lebih kecil', state.kecerdasanUmum.dayaAnalisis)}
                {renderRow('4', 'Daya Sintesis', 'Kapasitas individu untuk menganalisis dan menyimpulkan beragam informasi guna menawarkan solusi yang membangun.', state.kecerdasanUmum.dayaSintesis)}
                {renderRow('5', 'Daya Ingat', 'Kapasitas untuk mempertahankan informasi dalam ingatan dan memanggilnya kembali setelah jeda waktu tertentu', state.kecerdasanUmum.dayaIngat)}

                {/* Bagian B */}
                <tr className="page-break">
                  <td className="border border-black px-2 py-1 bg-gray-100 font-bold" colSpan={9}>B. Aspek Bakat Kemampuan</td>
                </tr>
                {renderRow('1', 'Sistematika Berpikir', 'Kapasitas untuk berpikir secara logis, teratur, dan sistematis dalam menghadapi serta memecahkan situasi atau masalah baru.', state.bakatKemampuan.sistematikaBerpikir)}
                {renderRow('2', 'Logika Hubungan', 'Kemampuan untuk memahami, menganalisis, dan menarik kesimpulan dari kaitan atau korelasi antara objek-objek yang bersifat abstrak.', state.bakatKemampuan.logikaHubungan)}
                {renderRow('3', 'Ketajaman Diferensiasi', 'Kemampuan untuk mengamati perbedaan, detail kecil, serta pola secara akurat dan cepat pada stimulus visual.', state.bakatKemampuan.ketajamanDiferensiasi)}

                {/* Bagian C */}
                <tr>
                  <td className="border border-black px-2 py-1 bg-gray-100 font-bold" colSpan={9}>C. Aspek Kepribadian</td>
                </tr>
                {renderRow('1', 'Stabilitas Emosi', 'Kapasitas individu untuk meregulasi keadaan emosinya secara proporsional sebagai respons terhadap jenis tekanan lingkungan yang ada.', state.kepribadian.stabilitasEmosi)}
                {renderRow('2', 'Motivasi', 'Kapasitas individu dalam menetapkan tujuan pembelajaran (goal-setting) dan mengupayakan pencapaiannya, yang didasari oleh motivasi intrinsik dan inisiatif untuk mengoptimalkan capaian belajar.', state.kepribadian.motivasi)}
                {renderRow('3', 'Kepercayaan Diri', 'Persepsi positif dan keyakinan individu atas kompetensi serta karakteristik pribadi yang dimilikinya, mencakup domain fisik, penampilan, intelektual, dan sosio-emosional.', state.kepribadian.kepercayaanDiri)}
                {renderRow('4', 'Penyesuaian Diri', 'Kemampuan untuk menempatkan diri secara luwes dalam situasi atau lingkungan baru, serta mudah berbaur dengan orang-orang yang baru dikenal.', state.kepribadian.penyesuaianDiri)}
                {renderRow('5', 'Kerja Sama', 'Kemampuan berkolaborasi dengan orang lain secara aktif dan saling mendukung untuk mencapai tujuan bersama.', state.kepribadian.kerjaSama)}
              </tbody>
            </table>
          </div>

          <div className="page-break"></div>
          
          {/* Bagian D: Minat */}
          <div className="mb-6">
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-left" colSpan={3}>D. Aspek Minat</th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 w-[5%]">No</th>
                  <th className="border border-black p-1 w-[30%]">Minat</th>
                  <th className="border border-black p-1 w-[65%]">Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {state.interests.map((interest, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2 font-semibold">{interest.name}</td>
                    <td className="border border-black p-2">{interest.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[10px] mt-1 italic">
              Keterangan:<br/>
              SR=Sangat Rendah, R=Rendah, C-=Di Bawah Rata-rata, C=Rata-rata, C+= Di Atas Rata-rata, T=Tinggi, ST=Sangat Tinggi
            </div>
          </div>

          {/* Gaya Belajar */}
          <div className="mb-6">
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" colSpan={3}>GAYA BELAJAR</th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 w-1/3">Visual</th>
                  <th className="border border-black p-2 w-1/3">Auditori</th>
                  <th className="border border-black p-2 w-1/3">Kinestetik</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 text-sm text-center">Belajar optimal dengan melihat materi visual (gambar, diagram, bacaan).</td>
                  <td className="border border-black p-2 text-sm text-center">Belajar efektif dengan mendengarkan informasi (penjelasan lisan, diskusi, rekaman).</td>
                  <td className="border border-black p-2 text-sm text-center">Belajar efektif melalui pengalaman langsung dan aktivitas fisik (praktik, simulasi, gerakan).</td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-3 text-center h-10">
                    {state.learningStyle === 'Visual' && <span className="font-bold text-xl">✬</span>}
                  </td>
                  <td className="border border-black px-3 py-3 text-center h-10">
                    {state.learningStyle === 'Auditori' && <span className="font-bold text-xl">✬</span>}
                  </td>
                  <td className="border border-black px-3 py-3 text-center h-10">
                    {state.learningStyle === 'Kinestetik' && <span className="font-bold text-xl">✬</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rekomendasi Tindak Lanjut */}
          <div className="mb-8 mt-6">
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center">REKOMENDASI TINDAK LANJUT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-4 min-h-[100px] align-top whitespace-pre-wrap">
                    {state.rekomendasi}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="flex justify-end mt-8 mr-12 text-center">
            <div>
              <p className="mb-1">Probolinggo, {formatDateId(new Date().toISOString().split('T')[0])}</p>
              <p className="mb-16">Psikolog Pemeriksa,</p>
              
              <div className="flex justify-center items-center relative mb-2">
                <p className="font-bold border-b border-black inline-block z-10 relative bg-white px-2">Muhammad Ikhsan, M.Psi., Psikolog</p>
              </div>
              <p>SIPP. 20250059-2025-01-0567</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
