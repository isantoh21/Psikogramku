import React, { useState } from 'react';
import { AppState, ScaleLevel } from '../types';
import { getSwFromRw, convertGeRw, calculateAge, getAgeInYears, getAgeGroup, calculateIq, calculateAspectsFromIST, getIqClassification, getScaleLabel, PREDEFINED_INTERESTS } from '../utils/scoring';
import { Bot, Copy, Check } from 'lucide-react';

interface FormInputProps {
  state: AppState;
  updateState: (section: keyof AppState, field: string, value: any) => void;
  resetForm: () => void;
  exportToDocx: () => void;
}

export const FormInput: React.FC<FormInputProps> = ({ state, updateState, resetForm, exportToDocx }) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetClick = () => {
    if (confirmReset) {
      resetForm();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };
  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateState('clientData', e.target.name, e.target.value);
  };

  const handleIstScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? '' : Number(e.target.value);
    updateState('istScores', e.target.name, value);
  };

  const handlePersonalityChange = (field: string, value: ScaleLevel) => {
    updateState('personalityScores', field, value);
  };

  const age = getAgeInYears(state.clientData.dob || state.clientData.ageDob || '', state.clientData.testDate);
  const ageGroup = getAgeGroup(age);

  const istKeys = ['SE', 'WA', 'AN', 'GE', 'ME', 'RA', 'ZR', 'FA', 'WU'] as const;
  let totalRw = 0;
  istKeys.forEach(key => {
    const val = state.istScores[key];
    if (val !== '') {
      totalRw += key === 'GE' ? (convertGeRw(val) || 0) : Number(val);
    }
  });
  
  const gesamtSw = totalRw > 0 ? getSwFromRw('GESAMT', totalRw, ageGroup) : '';

  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    const ageStr = calculateAge(state.clientData.dob || state.clientData.ageDob || '', state.clientData.testDate);
    const aspects = calculateAspectsFromIST(state.istScores, ageGroup);
    const calculatedIq = calculateIq(state.istScores, ageGroup);
    const displayIq = calculatedIq !== '' ? calculatedIq : (state.istScores.iq !== '' ? state.istScores.iq : '');
    const iqClass = getIqClassification(displayIq);

    return `Bertindaklah sebagai asisten psikolog yang ahli. Saya membutuhkan bantuan Anda untuk menyusun draf laporan analisis dinamika psikologis sepanjang 5 paragraf untuk klien saya, berdasarkan data hasil Tes Minat Bakat Penjurusan berikut:

--- DATA KLIEN ---
Nama: ${state.clientData.fullName || '[Belum diisi]'}
Usia: ${ageStr || '[Belum diisi]'}
Asal Sekolah: ${state.clientData.school || '[Belum diisi]'}

--- HASIL TES KECERDASAN (IST) ---
Skor IQ: ${displayIq || '[Belum diisi]'} (${iqClass})
Pemahaman: ${getScaleLabel(aspects.pemahaman)}
Penalaran: ${getScaleLabel(aspects.penalaran)}
Daya Analisis: ${getScaleLabel(aspects.dayaAnalisis)}
Daya Sintesis: ${getScaleLabel(aspects.dayaSintesis)}
Daya Ingat: ${getScaleLabel(aspects.dayaIngat)}
Kemampuan Verbal: ${getScaleLabel(aspects.verbal)}
Kemampuan Numerik: ${getScaleLabel(aspects.numerik)}
Kemampuan Spasial: ${getScaleLabel(aspects.spasial)}

--- HASIL TES SIKAP KERJA / KEPRIBADIAN ---
Stabilitas Emosi: ${getScaleLabel(state.personalityScores.stabilitasEmosi)}
Motivasi: ${getScaleLabel(state.personalityScores.motivasi)}
Kepercayaan Diri: ${getScaleLabel(state.personalityScores.kepercayaanDiri)}
Penyesuaian Diri: ${getScaleLabel(state.personalityScores.penyesuaianDiri)}
Kerja Sama: ${getScaleLabel(state.personalityScores.kerjaSama)}

--- ASPEK MINAT ---
1. ${state.interests[0]?.name || '[Kosong]'} - ${state.interests[0]?.description || ''}
2. ${state.interests[1]?.name || '[Kosong]'} - ${state.interests[1]?.description || ''}
3. ${state.interests[2]?.name || '[Kosong]'} - ${state.interests[2]?.description || ''}

--- GAYA BELAJAR ---
Utama: ${state.learningStyle || '[Belum dipilih]'}

--- CATATAN TAMBAHAN / REKOMENDASI JURUSAN ---
${state.recommendation || '[Tidak ada catatan tambahan]'}

--- INSTRUKSI PEMBUATAN LAPORAN ---
Buatlah narasi analisis psikologis yang komprehensif, profesional, empatik, dan mengalir sepanjang tepat 5 paragraf:
Paragraf 1: Membahas profil umum klien dan kapasitas kecerdasan intelektual (IQ) secara keseluruhan.
Paragraf 2: Membahas dinamika kemampuan kognitif secara spesifik (Verbal, Numerik, Spasial, Analisis, Sintesis, dll).
Paragraf 3: Membahas profil kepribadian, stabilitas emosi, keterampilan sosial klien, dan gaya belajar utamanya (${state.learningStyle || 'Visual/Auditori/Kinestetik'}).
Paragraf 4: Membahas sikap kerja (kecepatan, ketelitian, ketahanan, keteraturan) dan bagaimana hal tersebut menunjang kinerja belajarnya.
Paragraf 5: Berisi kesimpulan akhir yang mengintegrasikan semua aspek di atas dengan minat klien, beserta elaborasi rekomendasi penjurusan/pengembangan diri klien secara spesifik.

ATURAN DAN FORMAT PENULISAN:
1. Gunakan bahasa Indonesia yang baku namun luwes, sesuai dengan standar penulisan laporan psikologi.
2. JANGAN tambahkan poin-poin (bullet points), list, atau sub-judul. Hanya teks narasi paragraf biasa (tepat 5 paragraf).
3. HINDARI PENGGUNAAN KATA "secara umum", "di atas rata-rata", dan "di bawah rata-rata". Jika mendeskripsikan taraf rata-rata, gunakan HANYA istilah "rata-rata atas" atau "rata-rata bawah" (TIDAK BOLEH pakai kata 'di atas' / 'di bawah').
4. HINDARI penyebutan label taraf secara eksplisit berulang-ulang (misal: "kemampuan verbalnya berada pada taraf Baik"). Fokuslah HANYA pada IMPLIKASI dan gambaran nyata dari kemampuan tersebut di dunia nyata. Label taraf sudah ada di psikogram, jadi narasikan maknanya secara aplikatif. Hindari menyebutkan angka skor mentah.`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Panel Input Data</h2>
        <div className="space-x-3">
          <button
            type="button"
            onClick={handleResetClick}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              confirmReset ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 bg-red-50 hover:bg-red-100'
            }`}
          >
            {confirmReset ? 'Yakin Reset?' : 'Reset Form'}
          </button>
          <button
            onClick={exportToDocx}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Simpan DOCX
          </button>
        </div>
      </div>

      {/* Card 1: Data Identitas Subjek */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">1. Identitas Subjek</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              name="fullName"
              value={state.clientData.fullName}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Masukkan nama lengkap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah</label>
            <input
              type="text"
              name="school"
              value={state.clientData.school}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
            <input
              type="date"
              name="dob"
              value={state.clientData.dob || state.clientData.ageDob || ''}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pemeriksaan</label>
            <input
              type="date"
              name="testDate"
              value={state.clientData.testDate}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Usia Aktual</label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-medium">
              {calculateAge(state.clientData.dob || state.clientData.ageDob || '', state.clientData.testDate) || 'Pilih Tanggal Lahir dan Tanggal Pemeriksaan terlebih dahulu...'}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Laporan</label>
            <input
              type="text"
              name="reportNumber"
              value={state.clientData.reportNumber}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Input Tes IST */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">2. Input Tes IST (RW)</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-1">Taraf Kecerdasan (Skor IQ)</label>
          <div className="w-full md:w-1/2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 font-medium flex justify-between items-center">
            <span>{calculateIq(state.istScores, ageGroup) !== '' ? calculateIq(state.istScores, ageGroup) : 'Otomatis dihitung dari skor GESAMT SW...'}</span>
            {calculateIq(state.istScores, ageGroup) !== '' && <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded font-bold tracking-wide">OTOMATIS</span>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-2 px-4 font-semibold text-gray-700 w-1/2">Subtes IST</th>
                <th className="py-2 px-4 font-semibold text-gray-700 text-center">Skor RW (Input)</th>
                <th className="py-2 px-4 font-semibold text-gray-700 text-center">Skor SW (Otomatis)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'SE', name: 'SE (Melengkapi Kalimat)' },
                { id: 'WA', name: 'WA (Mencari Kata Berbeda)' },
                { id: 'AN', name: 'AN (Hubungan Kata)' },
                { id: 'GE', name: 'GE (Kesamaan Kata)' },
                { id: 'ME', name: 'ME (Mengingat Kata)' },
                { id: 'RA', name: 'RA (Hitungan)' },
                { id: 'ZR', name: 'ZR (Deret Angka)' },
                { id: 'FA', name: 'FA (Memilih Bentuk)' },
                { id: 'WU', name: 'WU (Tugas Kubus)' },
              ].map((subtest) => {
                const rwValue = state.istScores[subtest.id as keyof typeof state.istScores];
                const swValue = getSwFromRw(subtest.id, rwValue as number | '', ageGroup);
                
                return (
                  <tr key={subtest.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 text-gray-700">{subtest.name}</td>
                    <td className="py-2 px-4 text-center">
                      <input
                        type="number"
                        name={subtest.id}
                        value={rwValue}
                        onChange={handleIstScoreChange}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none inline-block"
                        placeholder="RW"
                      />
                      {subtest.id === 'GE' && rwValue !== '' && (
                        <div className="text-xs text-indigo-600 font-semibold mt-1">
                          RW Baru: {convertGeRw(rwValue as number)}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="inline-block w-20 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-medium">
                        {swValue !== '' ? swValue : '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td className="py-2 px-4 text-gray-800">GESAMT (Total)</td>
                <td className="py-2 px-4 text-center">
                  <div className="inline-block w-20 px-2 py-1 bg-white border border-gray-300 rounded text-gray-800 shadow-sm">
                    {totalRw > 0 ? totalRw : '-'}
                  </div>
                </td>
                <td className="py-2 px-4 text-center">
                  <div className="inline-block w-20 px-2 py-1 bg-indigo-100 border border-indigo-300 rounded text-indigo-800 shadow-sm">
                    {gesamtSw !== '' ? gesamtSw : '-'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-3 italic">* Catatan: Konversi RW ke SW dihitung secara otomatis menggunakan Mean & Standar Deviasi berdasarkan parameter Usia Aktual Klien.</p>
        </div>
      </div>

      {/* Card 3: Kepribadian */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">3. Aspek Kepribadian (Manual)</h3>
        <div className="space-y-4">
          {[
            { label: 'Stabilitas Emosi', name: 'stabilitasEmosi' },
            { label: 'Motivasi', name: 'motivasi' },
            { label: 'Kepercayaan Diri', name: 'kepercayaanDiri' },
            { label: 'Penyesuaian Diri', name: 'penyesuaianDiri' },
            { label: 'Kerja Sama', name: 'kerjaSama' },
          ].map(item => (
            <div key={item.name} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-2">
              <label className="text-sm text-gray-700 font-medium mb-2 sm:mb-0 w-1/3">{item.label}</label>
              <div className="flex space-x-1 w-2/3 justify-between">
                {([1, 2, 3, 4, 5, 6, 7] as ScaleLevel[]).map(level => (
                  <label key={level} className="flex flex-col items-center cursor-pointer">
                    <input
                      type="radio"
                      name={item.name}
                      value={level}
                      checked={state.personalityScores[item.name as keyof typeof state.personalityScores] === level}
                      onChange={() => handlePersonalityChange(item.name, level)}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs text-gray-500 mt-1">
                      {['SR', 'R', 'C-', 'C', 'C+', 'T', 'ST'][level - 1]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 4: Aspek Minat */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">4. Aspek Minat</h3>
        <div className="space-y-4">
          {state.interests.map((interest, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-gray-50 pb-4">
              <div className="w-full sm:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Minat {index + 1}</label>
                <select
                  value={interest.name}
                  onChange={(e) => {
                    const newInterests = [...state.interests];
                    const selectedName = e.target.value;
                    newInterests[index] = { 
                      name: selectedName, 
                      description: selectedName ? PREDEFINED_INTERESTS[selectedName] : '' 
                    };
                    updateState('interests', '', newInterests);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Pilih Minat --</option>
                  {Object.keys(PREDEFINED_INTERESTS).map(key => {
                    const isSelectedElsewhere = state.interests.some((inter, i) => i !== index && inter.name === key);
                    if (isSelectedElsewhere) return null;
                    return (
                      <option key={key} value={key}>{key}</option>
                    );
                  })}
                </select>
              </div>
              <div className="w-full sm:w-2/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  readOnly
                  value={interest.description}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 text-gray-600 border border-gray-300 rounded-lg outline-none resize-y"
                  placeholder="Deskripsi minat akan terisi otomatis..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 5: Gaya Belajar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">5. Gaya Belajar</h3>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Gaya Belajar Dominan</label>
          <div className="flex gap-4">
            {['Visual', 'Auditori', 'Kinestetik'].map(style => (
              <label key={style} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="learningStyle"
                  value={style}
                  checked={state.learningStyle === style}
                  onChange={(e) => updateState('learningStyle', '', e.target.value)}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-gray-700 text-sm font-medium">{style}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Card 6: Catatan/Rekomendasi */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b">6. Catatan & Rekomendasi</h3>
        <textarea
          name="recommendation"
          value={state.recommendation}
          onChange={(e) => updateState('recommendation', '', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-4"
          placeholder="Tuliskan dinamika psikologis atau rekomendasi penjurusan di sini..."
        ></textarea>
        
        <div className="pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-sm"
          >
            <Bot size={18} />
            Buat Prompt Analisis AI
          </button>
          
          {showPrompt && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Prompt untuk Gemini Pro / ChatGPT:</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded-md text-gray-700 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Tersalin!' : 'Salin Prompt'}
                </button>
              </div>
              <textarea
                readOnly
                value={generatePrompt()}
                className="w-full text-sm font-mono text-gray-600 bg-white border border-gray-200 rounded-md p-3 outline-none resize-y"
                rows={12}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
