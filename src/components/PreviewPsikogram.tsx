import React from 'react';
import { AppState } from '../types';
import { getIqClassification, calculateAspectsFromIST, calculateAge, formatDateId, getAgeInYears, getAgeGroup, calculateIq, getScaleLabel } from '../utils/scoring';

interface PreviewPsikogramProps {
  state: AppState;
}

export const PreviewPsikogram: React.FC<PreviewPsikogramProps> = ({ state }) => {
  const { clientData, istScores, personalityScores, recommendation } = state;
  
  const age = getAgeInYears(clientData.dob || clientData.ageDob || '', clientData.testDate);
  const ageGroup = getAgeGroup(age);
  const aspects = calculateAspectsFromIST(istScores, ageGroup);
  
  const calculatedIq = calculateIq(istScores, ageGroup);
  const displayIq = calculatedIq !== '' ? calculatedIq : (istScores.iq !== '' ? istScores.iq : '');
  const iqClass = getIqClassification(displayIq);

  const iqCategories = [
    { label: 'Sangat Rendah', range: '< 70' },
    { label: 'Rendah', range: '70 - 79' },
    { label: 'Rata-rata Bawah', range: '80 - 89' },
    { label: 'Rata-rata', range: '90 - 109' },
    { label: 'Rata-rata Atas', range: '110 - 119' },
    { label: 'Tinggi', range: '120 - 129' },
    { label: 'Sangat Tinggi', range: '> 130' },
  ];

  const renderCheckmarks = (level: number) => {
    return [1, 2, 3, 4, 5, 6, 7].map((i) => (
      <td key={i} className="border border-black text-center w-8" style={{ border: '1px solid black', textAlign: 'center', width: '32px' }}>
        {level === i && <span className="font-bold text-lg text-black" style={{ fontWeight: 'bold', fontSize: '18px' }}>✬</span>}
      </td>
    ));
  };

  const renderAspectRow = (no: string, title: string, desc: string, level: number) => (
    <tr key={title}>
      <td className="border border-black px-2 py-1 text-center align-top" style={{ border: '1px solid black', textAlign: 'center', verticalAlign: 'top', padding: '4px' }}>{no}</td>
      <td className="border border-black px-2 py-1" style={{ border: '1px solid black', padding: '4px' }}>
        <div className="font-semibold" style={{ fontWeight: 'bold' }}>{title}</div>
        <div className="text-xs text-gray-700 leading-tight mt-0.5" style={{ fontSize: '12px', color: '#374151' }}>{desc}</div>
      </td>
      {renderCheckmarks(level)}
    </tr>
  );

  return (
    <div id="psikogram-preview" className="bg-white print:bg-transparent shadow-lg print:shadow-none min-h-screen p-8 print:p-0 text-black mx-auto w-full max-w-[210mm] print:max-w-none font-serif text-[13px] leading-snug" style={{ fontFamily: 'serif', fontSize: '13px', lineHeight: '1.4', color: 'black', backgroundColor: 'white', padding: '32px' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4" style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid black', paddingBottom: '16px' }}>
        <h1 className="text-2xl font-bold tracking-wider mb-1" style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', margin: '0 0 4px 0' }}>PSIKOGRAM</h1>
        <h2 className="text-lg font-semibold uppercase" style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Tes Minat Bakat Penjurusan</h2>
        <div className="text-sm mt-2" style={{ fontSize: '14px' }}>AN-NUR PSYCHO CENTER</div>
      </div>

      {/* Identity */}
      <div className="mb-6" style={{ marginBottom: '24px' }}>
        <table className="w-full text-sm" style={{ width: '100%', fontSize: '14px', border: 'none' }}>
          <tbody>
            <tr>
              <td className="w-40 py-1" style={{ width: '160px', padding: '4px 0' }}>Nama Lengkap</td>
              <td className="w-4 py-1" style={{ width: '16px', padding: '4px 0' }}>:</td>
              <td className="font-semibold py-1" style={{ fontWeight: 'bold', padding: '4px 0' }}>{clientData.fullName || '-'}</td>
              <td className="w-32 py-1" style={{ width: '128px', padding: '4px 0' }}>Tanggal Tes</td>
              <td className="w-4 py-1" style={{ width: '16px', padding: '4px 0' }}>:</td>
              <td className="py-1" style={{ padding: '4px 0' }}>{formatDateId(clientData.testDate) || '-'}</td>
            </tr>
            <tr>
              <td className="py-1" style={{ padding: '4px 0' }}>Asal Sekolah</td>
              <td className="py-1" style={{ padding: '4px 0' }}>:</td>
              <td className="py-1" style={{ padding: '4px 0' }}>{clientData.school || '-'}</td>
              <td className="py-1" style={{ padding: '4px 0' }}>No. Laporan</td>
              <td className="py-1" style={{ padding: '4px 0' }}>:</td>
              <td className="py-1" style={{ padding: '4px 0' }}>{clientData.reportNumber || '-'}</td>
            </tr>
            <tr>
              <td className="py-1" style={{ padding: '4px 0' }}>Tanggal Lahir</td>
              <td className="py-1" style={{ padding: '4px 0' }}>:</td>
              <td className="py-1" style={{ padding: '4px 0' }}>{formatDateId(clientData.dob || clientData.ageDob || '') || '-'}</td>
              <td className="py-1" style={{ padding: '4px 0' }}>Usia Aktual</td>
              <td className="py-1" style={{ padding: '4px 0' }}>:</td>
              <td className="py-1" style={{ padding: '4px 0' }}>{calculateAge(clientData.dob || clientData.ageDob || '', clientData.testDate) || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* IQ Section */}
      <div className="mb-6" style={{ marginBottom: '24px' }}>
        <div className="font-bold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>I. TARAF KECERDASAN (IQ) : {displayIq || '___'}</div>
        <table className="w-full border-collapse border border-black text-sm" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr className="bg-gray-100 print:bg-gray-200" style={{ backgroundColor: '#f3f4f6' }}>
              {iqCategories.map(cat => (
                <th key={cat.label} className="border border-black py-1 px-2 font-semibold text-center w-1/7" style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                  {cat.label}<br/>
                  <span className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: 'normal' }}>({cat.range})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {iqCategories.map(cat => (
                <td key={cat.label} className="border border-black py-2 text-center h-8" style={{ border: '1px solid black', padding: '8px', textAlign: 'center', height: '32px' }}>
                  {iqClass === cat.label && <span className="font-bold text-xl" style={{ fontWeight: 'bold', fontSize: '20px' }}>✬</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Aspects Section */}
      <div className="mb-6" style={{ marginBottom: '24px' }}>
        <div className="font-bold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>II. PROFIL KAPASITAS ASPEK</div>
        <table className="w-full border-collapse border border-black" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-100 print:bg-gray-200" style={{ backgroundColor: '#f3f4f6' }}>
              <th className="border border-black w-8 py-2" style={{ border: '1px solid black', padding: '8px', width: '32px' }}>No</th>
              <th className="border border-black py-2" style={{ border: '1px solid black', padding: '8px' }}>ASPEK PSIKOLOGIS &amp; DESKRIPSI</th>
              <th className="border border-black w-8 text-xs font-bold" title="Sangat Rendah" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>SR</th>
              <th className="border border-black w-8 text-xs font-bold" title="Rendah" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>R</th>
              <th className="border border-black w-8 text-xs font-bold" title="Cukup Kurang" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>C-</th>
              <th className="border border-black w-8 text-xs font-bold" title="Cukup" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>C</th>
              <th className="border border-black w-8 text-xs font-bold" title="Cukup Lebih" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>C+</th>
              <th className="border border-black w-8 text-xs font-bold" title="Tinggi" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>T</th>
              <th className="border border-black w-8 text-xs font-bold" title="Sangat Tinggi" style={{ border: '1px solid black', width: '32px', fontSize: '12px', fontWeight: 'bold' }}>ST</th>
            </tr>
          </thead>
          <tbody>
            {/* Bagian A */}
            <tr>
              <td colSpan={9} className="border border-black font-bold bg-gray-50 print:bg-gray-100 px-2 py-1" style={{ border: '1px solid black', fontWeight: 'bold', backgroundColor: '#f9fafb', padding: '4px 8px' }}>A. KECERDASAN UMUM</td>
            </tr>
            {renderAspectRow('1', 'Pemahaman', 'Kapasitas untuk memahami makna dan mengenali tujuan dari sebuah informasi.', aspects.pemahaman)}
            {renderAspectRow('2', 'Penalaran', 'Kapasitas untuk menganalisis masalah dengan cara menghubungkan dua atau lebih informasi secara logis.', aspects.penalaran)}
            {renderAspectRow('3', 'Daya Analisis', 'Kapasitas untuk menjabarkan suatu permasalahan menjadi bagian-bagian informasi yang lebih kecil.', aspects.dayaAnalisis)}
            {renderAspectRow('4', 'Daya Sintesis', 'Kapasitas individu untuk menganalisis dan menyimpulkan beragam informasi guna menawarkan solusi yang membangun.', aspects.dayaSintesis)}
            {renderAspectRow('5', 'Daya Ingat', 'Kapasitas untuk mempertahankan informasi dalam ingatan dan memanggilnya kembali setelah jeda waktu tertentu.', aspects.dayaIngat)}

            {/* Bagian B */}
            <tr>
              <td colSpan={9} className="border border-black font-bold bg-gray-50 print:bg-gray-100 px-2 py-1" style={{ border: '1px solid black', fontWeight: 'bold', backgroundColor: '#f9fafb', padding: '4px 8px' }}>B. BAKAT KEMAMPUAN</td>
            </tr>
            {renderAspectRow('1', 'Kemampuan Verbal', 'Kapasitas untuk mengerti dan menerapkan konsep-konsep kebahasaan.', aspects.verbal)}
            {renderAspectRow('2', 'Kemampuan Numerik', 'Kapasitas untuk menerapkan konsep dasar numerikal serta pemahaman atas perhitungan.', aspects.numerik)}
            {renderAspectRow('3', 'Kemampuan Spasial', 'Kapasitas untuk memproses informasi mengenai dimensi bentuk, persepsi visual, dan orientasi spasial.', aspects.spasial)}

            {/* Bagian C */}
            <tr>
              <td colSpan={9} className="border border-black font-bold bg-gray-50 print:bg-gray-100 px-2 py-1" style={{ border: '1px solid black', fontWeight: 'bold', backgroundColor: '#f9fafb', padding: '4px 8px' }}>C. KEPRIBADIAN</td>
            </tr>
            {renderAspectRow('1', 'Stabilitas Emosi', 'Kapasitas untuk meregulasi keadaan emosinya secara proporsional.', personalityScores.stabilitasEmosi)}
            {renderAspectRow('2', 'Motivasi', 'Kapasitas menetapkan tujuan dan mengupayakan pencapaiannya.', personalityScores.motivasi)}
            {renderAspectRow('3', 'Kepercayaan Diri', 'Persepsi positif atas kompetensi serta karakteristik pribadi.', personalityScores.kepercayaanDiri)}
            {renderAspectRow('4', 'Penyesuaian Diri', 'Kemampuan untuk menempatkan diri secara luwes dalam situasi baru.', personalityScores.penyesuaianDiri)}
            {renderAspectRow('5', 'Kerja Sama', 'Kemampuan berkolaborasi dengan orang lain secara aktif dan mendukung.', personalityScores.kerjaSama)}
          </tbody>
        </table>
        <div className="mt-2 text-xs italic" style={{ marginTop: '8px', fontSize: '12px', fontStyle: 'italic' }}>
          Keterangan: SR (Sangat Rendah), R (Rendah), C- (Cukup Kurang), C (Cukup), C+ (Cukup Lebih), T (Tinggi), ST (Sangat Tinggi).
        </div>
      </div>

      {/* Aspek Minat */}
      <div className="mb-6" style={{ marginBottom: '24px' }}>
        <table className="w-full border-collapse border border-black text-sm text-left" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr>
              <th colSpan={3} className="border border-black bg-gray-200 print:bg-gray-300 font-bold px-2 py-1 text-center" style={{ border: '1px solid black', backgroundColor: '#e5e7eb', fontWeight: 'bold', padding: '4px 8px', textAlign: 'left' }}>D. Aspek Minat</th>
            </tr>
            <tr>
              <th className="border border-black bg-white font-bold px-2 py-1 text-center w-10" style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px 8px', textAlign: 'center', width: '40px' }}>No</th>
              <th className="border border-black bg-white font-bold px-2 py-1 text-center w-1/3" style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px 8px', textAlign: 'center', width: '33%' }}>Minat</th>
              <th className="border border-black bg-white font-bold px-2 py-1 text-center" style={{ border: '1px solid black', fontWeight: 'bold', padding: '4px 8px', textAlign: 'center' }}>Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            {state.interests.map((interest, idx) => (
              <tr key={idx}>
                <td className="border border-black px-2 py-1 text-center" style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center' }}>{idx + 1}</td>
                <td className="border border-black px-2 py-1" style={{ border: '1px solid black', padding: '4px 8px' }}>{interest.name}</td>
                <td className="border border-black px-2 py-1" style={{ border: '1px solid black', padding: '4px 8px' }}>{interest.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gaya Belajar */}
      <div className="mb-6" style={{ marginBottom: '24px' }}>
        <table className="w-full border-collapse border border-black text-sm text-center" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'center' }}>
          <thead>
            <tr>
              <th colSpan={3} className="border border-black bg-gray-300 print:bg-gray-300 font-bold px-2 py-2 text-center text-base uppercase" style={{ border: '1px solid black', backgroundColor: '#d1d5db', fontWeight: 'bold', padding: '8px', textAlign: 'center', textTransform: 'uppercase', fontSize: '16px' }}>GAYA BELAJAR</th>
            </tr>
            <tr>
              <th className="border border-black bg-white font-bold px-2 py-2 w-1/3" style={{ border: '1px solid black', fontWeight: 'bold', padding: '8px', width: '33.33%' }}>Visual</th>
              <th className="border border-black bg-white font-bold px-2 py-2 w-1/3" style={{ border: '1px solid black', fontWeight: 'bold', padding: '8px', width: '33.33%' }}>Auditori</th>
              <th className="border border-black bg-white font-bold px-2 py-2 w-1/3" style={{ border: '1px solid black', fontWeight: 'bold', padding: '8px', width: '33.33%' }}>Kinestetik</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-3 py-4 align-top text-xs" style={{ border: '1px solid black', padding: '12px', verticalAlign: 'top', fontSize: '12px' }}>
                Belajar optimal dengan melihat materi visual (gambar, diagram, bacaan).
              </td>
              <td className="border border-black px-3 py-4 align-top text-xs" style={{ border: '1px solid black', padding: '12px', verticalAlign: 'top', fontSize: '12px' }}>
                Belajar efektif dengan mendengarkan informasi (penjelasan lisan, diskusi, rekaman).
              </td>
              <td className="border border-black px-3 py-4 align-top text-xs" style={{ border: '1px solid black', padding: '12px', verticalAlign: 'top', fontSize: '12px' }}>
                Belajar efektif melalui pengalaman langsung dan aktivitas fisik (praktik, simulasi, gerakan).
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-3 text-center h-12" style={{ border: '1px solid black', padding: '12px', textAlign: 'center', height: '48px' }}>
                {state.learningStyle === 'Visual' && <span className="font-bold text-xl" style={{ fontWeight: 'bold', fontSize: '20px' }}>✬</span>}
              </td>
              <td className="border border-black px-3 py-3 text-center h-12" style={{ border: '1px solid black', padding: '12px', textAlign: 'center', height: '48px' }}>
                {state.learningStyle === 'Auditori' && <span className="font-bold text-xl" style={{ fontWeight: 'bold', fontSize: '20px' }}>✬</span>}
              </td>
              <td className="border border-black px-3 py-3 text-center h-12" style={{ border: '1px solid black', padding: '12px', textAlign: 'center', height: '48px' }}>
                {state.learningStyle === 'Kinestetik' && <span className="font-bold text-xl" style={{ fontWeight: 'bold', fontSize: '20px' }}>✬</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rekomendasi */}
      <div>
        <div className="font-bold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>III. CATATAN &amp; REKOMENDASI</div>
        <div className="border border-black p-3 min-h-[150px] text-sm whitespace-pre-wrap" style={{ border: '1px solid black', padding: '12px', minHeight: '150px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
          {recommendation || '...'}
        </div>
      </div>
      
      {/* Signature Section */}
      <div className="mt-12 flex justify-end print:break-inside-avoid" style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
         <div className="text-center w-64" style={{ textAlign: 'center', width: '256px' }}>
           <div className="mb-20" style={{ marginBottom: '80px' }}>Psikolog Pemeriksa,</div>
           <div className="border-b border-black font-semibold" style={{ borderBottom: '1px solid black', fontWeight: 'bold' }}></div>
           <div className="text-sm mt-1" style={{ fontSize: '14px', marginTop: '4px' }}>SIPP: ____________</div>
         </div>
      </div>

    </div>
  );
};
