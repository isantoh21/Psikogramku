import React from 'react';
import { StaffAppState, INITIAL_STAFF_STATE } from '../types';
import { formatDateId } from '../utils/scoring';
import { Printer, FileText } from 'lucide-react';

interface PreviewPsikogramStaffProps {
  state?: StaffAppState;
}

export function PreviewPsikogramStaff({ state }: PreviewPsikogramStaffProps) {
  const safeState = state || INITIAL_STAFF_STATE;
  const clientData = safeState.clientData || INITIAL_STAFF_STATE.clientData;
  const intelektual = safeState.intelektual || INITIAL_STAFF_STATE.intelektual;
  const sikapKerja = safeState.sikapKerja || INITIAL_STAFF_STATE.sikapKerja;
  const kepribadian = safeState.kepribadian || INITIAL_STAFF_STATE.kepribadian;

  const exportToDocx = () => {
    const element = document.getElementById('psikogram-preview-staff');
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
    link.download = `Psikogram_Staff_${(clientData.nama || 'Klien').replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  const getStar = (val: number, expected: number) => {
    return val === expected ? '✪' : '';
  };

  const renderRow = (no: string, title: string, desc: string, val: number) => (
    <tr className="text-xs">
      <td className="border border-black px-1 py-1 align-top text-center border-t-2 w-[5%]">{no}.</td>
      <td className="border border-black px-2 py-1 align-top border-t-2">
        <span className="font-semibold block">{title}</span>
        <span className="text-[9px] leading-tight text-gray-700">{desc}</span>
      </td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 1)}</td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 2)}</td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 3)}</td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 4)}</td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 5)}</td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 6)}</td>
      <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2 w-[6%]">{getStar(val, 7)}</td>
    </tr>
  );

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm sticky top-0 z-10 print:hidden">
        <h2 className="text-lg font-bold text-gray-800">Preview Seleksi Staff</h2>
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
          id="psikogram-preview-staff"
          className="bg-white p-10 shadow-lg w-full max-w-[210mm] min-h-[297mm] text-[11px] font-serif print:shadow-none print:m-0 print:p-0"
          style={{ width: '210mm', color: 'black' }}
        >
          
          {/* HEADER */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
            <div className="flex items-center">
              {/* Logo placeholder - text based for now */}
              <div className="text-2xl font-bold tracking-tighter flex items-center">
                <span className="text-blue-500 mr-1 text-3xl">❂</span>
                <span className="text-blue-900">Brilian</span>Psikologi
              </div>
            </div>
            <div className="border-4 border-purple-800 rounded-full w-14 h-14 flex items-center justify-center text-purple-800 font-bold text-3xl">
              Ψ
            </div>
          </div>

          <div className="text-center font-bold mb-4 bg-gray-100 border-y-2 border-black py-1">
            <div className="text-sm">LAPORAN PEMERIKSAAN PSIKOLOGIS</div>
            <div className="text-sm">PT. PAMITRA JAYA KONSTRUKSI</div>
          </div>
          <div className="absolute top-28 right-10 bg-black text-white px-8 py-1 font-bold text-xs">
            RAHASIA
          </div>

          <div className="mb-4 text-[11px]">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-0.5 w-[15%]">Nama</td>
                  <td className="py-0.5 w-[2%]">:</td>
                  <td className="py-0.5 w-[40%] font-semibold">{clientData.nama}</td>
                  <td className="py-0.5 w-[15%]">Nomor</td>
                  <td className="py-0.5 w-[2%]">:</td>
                  <td className="py-0.5 w-[26%]">{clientData.nomor}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Tempat/Tgl.Lahir</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{clientData.tempatTglLahir}</td>
                  <td className="py-0.5">Jenis Kelamin</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{clientData.jenisKelamin}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Pendidikan</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{clientData.pendidikan}</td>
                  <td className="py-0.5 align-top" rowSpan={2}>Tujuan pemeriksaan</td>
                  <td className="py-0.5 align-top" rowSpan={2}>:</td>
                  <td className="py-0.5 align-top font-semibold" rowSpan={2}>{clientData.tujuanPemeriksaan}</td>
                </tr>
                <tr>
                  <td className="py-0.5 align-top">Alamat</td>
                  <td className="py-0.5 align-top">:</td>
                  <td className="py-0.5">{clientData.alamat}</td>
                </tr>
                <tr>
                  <td colSpan={3}></td>
                  <td className="py-0.5">Tgl. Pemeriksaan</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{clientData.tanggalTes ? formatDateId(clientData.tanggalTes) : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center font-bold bg-gray-200 border-2 border-black py-1 mb-0">
            PSIKOGRAM
          </div>

          {/* TABLE PSIKOGRAM */}
          <div className="mb-6">
            <table className="w-full border-collapse border-2 border-black border-t-0">
              <thead>
                <tr className="bg-gray-300">
                  <th className="border border-black p-1 text-[11px] w-[58%]" colSpan={3} rowSpan={2}>ASPEK-ASPEK</th>
                  <th className="border border-black p-1 text-[11px]" colSpan={7}>KATEGORI</th>
                </tr>
                <tr className="bg-gray-200 text-[10px]">
                  <th className="border border-black p-0.5 w-[6%]">KS</th>
                  <th className="border border-black p-0.5 w-[6%]">K</th>
                  <th className="border border-black p-0.5 w-[6%]">RB</th>
                  <th className="border border-black p-0.5 w-[6%]">R</th>
                  <th className="border border-black p-0.5 w-[6%]">RA</th>
                  <th className="border border-black p-0.5 w-[6%]">B</th>
                  <th className="border border-black p-0.5 w-[6%]">BS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-x border-black bg-gray-200 uppercase font-bold text-[10px] text-center w-[5%]" rowSpan={7} style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                    INTELEKTUAL
                  </td>
                  <td className="border border-black p-0" rowSpan={2} colSpan={2}>
                    <table className="w-full h-full border-none">
                      <tbody>
                        <tr className="text-xs">
                          <td className="px-1 py-1 align-top text-center w-[5%] border-r border-black">1.</td>
                          <td className="px-2 py-1 align-top">
                            <span className="font-semibold block">Potensi Kecerdasan</span>
                            <span className="text-[9px] leading-tight text-gray-700">Kemampuan berpikir abstrak, konseptual, analisis logis, dan sistematis dalam memecahkan masalah.</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-xs h-6 bg-gray-50" colSpan={7}>
                    IQ = {state.iqScore} {state.iqLabel ? `(${state.iqLabel})` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 1)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 2)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 3)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 4)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 5)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 6)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 w-[6%]">{getStar(state.intelektual.potensiKecerdasan, 7)}</td>
                </tr>
                {renderRow('2', 'Berpikir Sistematis', 'Kemampuan berpikir runtut untuk memahami rangkaian suatu permasalahan yang berkesinambungan.', state.intelektual.berpikirSistematis)}
                {renderRow('3', 'Pemahaman Verbal', 'Kemampuan memahami suatu arahan dan instruksi untuk mengerti penjelasan.', state.intelektual.pemahamanVerbal)}
                {renderRow('4', 'Analisa-Sintesa', 'Kemampuan untuk menghubungkan dua atau lebih permasalahan yang serupa.', state.intelektual.analisaSintesa)}
                {renderRow('5', 'Pemahaman konsep', 'Kemampuan memahami suatu prinsip untuk diterapkan ke dalam situasi yang berbeda.', state.intelektual.pemahamanKonsep)}
                {renderRow('6', 'Kemampuan Numerik', 'Kemampuan dalam menerapkan konsep aritmatik dan berpikir logis dengan menggunakan angka-angka.', state.intelektual.kemampuanNumerik)}

                <tr>
                  <td className="border-x border-t-2 border-black bg-gray-200 uppercase font-bold text-[10px] text-center" rowSpan={4} style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                    SIKAP KERJA
                  </td>
                  <td className="border-t-2 border-black p-0" colSpan={9}></td>
                </tr>
                <tr className="text-xs">
                  <td className="border border-black px-1 py-1 align-top text-center border-t-2 w-[5%]">1.</td>
                  <td className="border border-black px-2 py-1 align-top border-t-2">
                    <span className="font-semibold block">Kecepatan</span>
                    <span className="text-[9px] leading-tight text-gray-700">Kecepatan dalam bekerja dan menyesuaikan diri dengan situasi kerja.</span>
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 1)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 2)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 3)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 4)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 5)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 6)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.sikapKerja.kecepatan, 7)}</td>
                </tr>
                {renderRow('2', 'Ketelitian', 'Cermat dan hati-hati dalam bekerja.', state.sikapKerja.ketelitian)}
                {renderRow('3', 'Ketekunan atau Keuletan', 'Sabar dan tahan dengan tugas rutin serta tidak mudah bosan.', state.sikapKerja.ketekunan)}
                {renderRow('4', 'Daya Tahan terhadap Stres', 'Kemampuan menghasilkan performance kerja yang stabil dalam situasi yang penuh dengan tekanan.', state.sikapKerja.dayaTahanStres)}

                <tr>
                  <td className="border-x border-t-2 border-black bg-gray-200 uppercase font-bold text-[10px] text-center" rowSpan={9} style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                    KEPRIBADIAN
                  </td>
                  <td className="border-t-2 border-black p-0" colSpan={9}></td>
                </tr>
                <tr className="text-xs">
                  <td className="border border-black px-1 py-1 align-top text-center border-t-2 w-[5%]">1.</td>
                  <td className="border border-black px-2 py-1 align-top border-t-2">
                    <span className="font-semibold block">Kematangan Emosi</span>
                    <span className="text-[9px] leading-tight text-gray-700">Kemampuan mengendalikan emosi dengan baik dan tidak mudah reaktif terhadap situasi lingkungan.</span>
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 1)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 2)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 3)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 4)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 5)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 6)}</td>
                  <td className="border border-black p-1 text-center font-bold text-sm h-6 border-t-2">{getStar(state.kepribadian.kematanganEmosi, 7)}</td>
                </tr>
                {renderRow('2', 'Kemasakan Sosial', 'Peka atau tanggap terhadap perasaan dan kebutuhan orang lain di lingkungan sosial.', state.kepribadian.kemasakanSosial)}
                {renderRow('3', 'Rasa Percaya Diri', 'Adanya keyakinan yang kuat terhadap kemampuan yang dimiliki.', state.kepribadian.rasaPercayaDiri)}
                {renderRow('4', 'Motivasi Berprestasi', 'Dorongan melakukan pekerjaan secara maksimal serta berusaha untuk mencapai hasil sebaik mungkin.', state.kepribadian.motivasiBerprestasi)}
                {renderRow('5', 'Sikap Mandiri', 'Kemampuan melakukan aktivitas sendiri dan inisiatif sendiri tanpa tergantung oleh dukungan dari orang lain.', state.kepribadian.sikapMandiri)}
                {renderRow('6', 'Inisiatif', 'Penggunaan sebuah pendekatan baru atau pun unik untuk melaksanakan pekerjaan dan mengupayakan proses perubahan.', state.kepribadian.inisiatif)}
                {renderRow('7', 'Kemampuan Bekerjasama', 'Kemampuan menyelesaikan tugas bersama dengan orang lain / kelompok, secara kooperatif dan ada kesediaan untuk proaktif.', state.kepribadian.kemampuanBekerjasama)}
                {renderRow('8', 'Keterampilan Berkomunikasi', 'Kemampuan mengekspresikan ide / pikirannya secara runtut dan terarah, serta persuasif.', state.kepribadian.keterampilanBerkomunikasi)}
                {renderRow('9', 'Loyalitas', 'Kesediaan untuk mencurahkan waktu dan tenaga untuk bekerja serta bertindak konsisten sesuai dengan kebijakan organisasi.', state.kepribadian.loyalitas)}
              </tbody>
            </table>
            
            <div className="border-2 border-t-0 border-black p-1 text-[9px] text-center font-semibold">
              Keterangan : <span className="font-bold">KS</span> = Kurang Sekali &nbsp;&nbsp; <span className="font-bold">K</span> = Kurang &nbsp;&nbsp; <span className="font-bold">RB</span> = Rata-rata Bawah &nbsp;&nbsp; <span className="font-bold">R</span> = Rata-rata &nbsp;&nbsp; <span className="font-bold">RA</span> = Rata-rata Atas &nbsp;&nbsp; <span className="font-bold">B</span> = Baik &nbsp;&nbsp; <span className="font-bold">BS</span> = Baik Sekali
            </div>
          </div>

          <div className="flex justify-end mt-12 text-[10px] font-bold text-purple-800">
            <div>
              <p className="mb-0.5 flex items-center"><span className="mr-2">📧</span> brilianpsikologi@gmail.com</p>
              <p className="mb-0.5 flex items-center"><span className="mr-2">🌐</span> www.brilianpsikologi.com</p>
              <p className="flex items-center"><span className="mr-2">📷</span> Brilian Psikologi</p>
            </div>
          </div>

          {/* PAGE BREAK 2 */}
          <div className="page-break" style={{ pageBreakBefore: 'always', marginTop: '20mm' }}></div>
          
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold tracking-tighter flex items-center">
                <span className="text-blue-500 mr-1 text-3xl">❂</span>
                <span className="text-blue-900">Brilian</span>Psikologi
              </div>
            </div>
            <div className="border-4 border-purple-800 rounded-full w-14 h-14 flex items-center justify-center text-purple-800 font-bold text-3xl">
              Ψ
            </div>
          </div>

          <h3 className="font-bold text-sm mb-4">DINAMIKA PSIKOLOGIS</h3>
          
          <div className="text-[12px] leading-relaxed text-justify mb-20">
            {state.dinamikaPsikologis.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-3 indent-8">{paragraph}</p>
            ))}
          </div>

          <div className="flex justify-end mt-auto pt-12 text-[10px] font-bold text-purple-800">
            <div>
              <p className="mb-0.5 flex items-center"><span className="mr-2">📧</span> brilianpsikologi@gmail.com</p>
              <p className="mb-0.5 flex items-center"><span className="mr-2">🌐</span> www.brilianpsikologi.com</p>
              <p className="flex items-center"><span className="mr-2">📷</span> Brilian Psikologi</p>
            </div>
          </div>

          {/* PAGE BREAK 3 */}
          <div className="page-break" style={{ pageBreakBefore: 'always', marginTop: '20mm' }}></div>
          
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold tracking-tighter flex items-center">
                <span className="text-blue-500 mr-1 text-3xl">❂</span>
                <span className="text-blue-900">Brilian</span>Psikologi
              </div>
            </div>
            <div className="border-4 border-purple-800 rounded-full w-14 h-14 flex items-center justify-center text-purple-800 font-bold text-3xl">
              Ψ
            </div>
          </div>

          <div className="flex justify-end text-center mt-12 mr-10">
            <div>
              <p className="mb-0 text-[12px]">Surabaya, {clientData.tanggalTes ? formatDateId(clientData.tanggalTes) : ''}</p>
              <p className="mb-20 text-[12px]">Pemeriksa,</p>
              <p className="font-bold border-b border-black text-[12px] inline-block px-2 relative">
                <span className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-20 pointer-events-none text-blue-500 text-6xl">❂</span>
                Muhammad Ikhsan, M.Psi., Psikolog
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-auto pt-12 text-[10px] font-bold text-purple-800">
            <div>
              <p className="mb-0.5 flex items-center"><span className="mr-2">📧</span> brilianpsikologi@gmail.com</p>
              <p className="mb-0.5 flex items-center"><span className="mr-2">🌐</span> www.brilianpsikologi.com</p>
              <p className="flex items-center"><span className="mr-2">📷</span> Brilian Psikologi</p>
            </div>
          </div>

          {/* PAGE BREAK 4 */}
          <div className="page-break" style={{ pageBreakBefore: 'always', marginTop: '20mm' }}></div>

          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold tracking-tighter flex items-center">
                <span className="text-blue-500 mr-1 text-3xl">❂</span>
                <span className="text-blue-900">Brilian</span>Psikologi
              </div>
              <div className="ml-4 font-bold text-[10px]">SIPP: 20250059-2025-01-0567</div>
            </div>
            <div className="border-4 border-purple-800 rounded-full w-14 h-14 flex items-center justify-center text-purple-800 font-bold text-3xl">
              Ψ
            </div>
          </div>



          <div className="flex justify-center mt-20 opacity-30 pointer-events-none">
             {/* Large background logo watermark */}
             <div className="relative text-9xl">
                <span className="text-blue-500 absolute -top-12 -left-12 opacity-50 transform scale-[3]">❂</span>
             </div>
          </div>

          <div className="flex justify-end mt-auto pt-12 text-[10px] font-bold text-purple-800 fixed bottom-10 right-10 print:absolute print:bottom-10 print:right-10">
            <div>
              <p className="mb-0.5 flex items-center"><span className="mr-2">📧</span> brilianpsikologi@gmail.com</p>
              <p className="mb-0.5 flex items-center"><span className="mr-2">🌐</span> www.brilianpsikologi.com</p>
              <p className="flex items-center"><span className="mr-2">📷</span> Brilian Psikologi</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
