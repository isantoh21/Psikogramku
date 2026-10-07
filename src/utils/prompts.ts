/**
 * Centralized AI Prompts & JSON Parsing Utilities.
 * Shared between Server (app.ts) and Client (clientAIExtractor.ts).
 */

export function cleanJsonOutput(rawText: string, fallback: any = {}) {
  let cleaned = (rawText || '{}').trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON output:', rawText, err);
    return fallback;
  }
}

export const safeJsonParse = cleanJsonOutput;

export const IST_PROMPT = `Ekstrak data hasil tes IST (Intelligenz Struktur Test) dan biodata dari dokumen laporan psikotes seleksi staf ini.
Kembalikan HANYA format JSON valid persis seperti template di bawah ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "nama lengkap peserta",
    "tempatTglLahir": "tempat dan tanggal lahir (misal: 'Jakarta, 1 Januari 1995')",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "nomor": "nomor peserta/tes",
    "tanggalTes": "YYYY-MM-DD",
    "pendidikan": "pendidikan terakhir",
    "tujuanPemeriksaan": "posisi/jabatan/tujuan pemeriksaan",
    "namaPT": "nama PT / perusahaan jika tertera"
  },
  "iqScore": 0,
  "iqLabel": "kategori IQ seperti Rata-rata, Superior, Rata-rata Atas, dll",
  "skorLangsung": {
    "pemahamanVerbal": null,
    "analisaSintesa": null,
    "kemampuanNumerik": null
  },
  "tarafLangsung": {
    "pemahamanVerbal": "ambil teks kategori/taraf verbal langsung dari PDF (misal: 'SR', 'R', 'S', 'T', 'ST', 'KS', 'K', 'RB', 'R', 'RA', 'B', 'BS', atau 'Sedang', 'Tinggi', dll)",
    "analisaSintesa": "ambil teks kategori/taraf analisa sintesa langsung dari PDF (misal: 'SR', 'R', 'S', 'T', 'ST', dll)",
    "kemampuanNumerik": "ambil teks kategori/taraf numerik/berhitung langsung dari PDF (misal: 'SR', 'R', 'S', 'T', 'ST', dll)"
  },
  "istSubscores": {
    "SE": 0, "WA": 0, "AN": 0, "GE": 0, "ME": 0, "RA": 0, "ZR": 0, "FA": 0, "WU": 0
  },
  "tarafBerpikirSistematis": "taraf berpikir sistematis jika tertulis langsung di PDF",
  "tarafPemahamanKonsep": "taraf pemahaman konsep jika tertulis langsung di PDF",
  "tarafAnalisaSintesa": "taraf analisa sintesa jika tertulis langsung di PDF"
}

CATATAN PENTING:
1. Untuk pemahamanVerbal, analisaSintesa, dan kemampuanNumerik: 
   - AMBIL LANGSUNG teks kategori yang tertulis di PDF (misalnya kolom Taraf/Kategori yang berisi SR, R, S, T, ST atau Kurang Sekali, Kurang, Sedang, Tinggi, Sangat Tinggi) ke dalam tarafLangsung.
   - AMBIL JUGA angka skor (skala nilai 0-20 atau Standard Wert/SW yang tertera untuk aspek tersebut) ke dalam skorLangsung.
2. Untuk subtes IST (SE, WA, AN, GE, ME, RA, ZR, FA, WU): ambil nilai Standard Wert (SW) atau nilai skor tertera untuk masing-masing subtes jika ada.
3. Jika data tertentu tidak ditemukan, beri nilai null atau string kosong "".`;

export const CFIT_STAFF_PROMPT = `Ekstrak data hasil tes CFIT (Culture Fair Intelligence Test) dan biodata dari dokumen laporan/skoring psikotes ini.
Kembalikan HANYA format JSON valid persis seperti template di bawah ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "nama lengkap peserta",
    "tempatTglLahir": "tempat dan tanggal lahir (misal: 'Jakarta, 1 Januari 1995')",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "nomor": "nomor peserta/tes",
    "tanggalTes": "YYYY-MM-DD",
    "pendidikan": "pendidikan terakhir",
    "tujuanPemeriksaan": "posisi/jabatan/tujuan pemeriksaan",
    "namaPT": "nama PT / perusahaan jika tertera"
  },
  "iqScore": null,
  "iqLabel": "kategori IQ CFIT seperti Very Superior, Superior, Rata-rata Atas, Rata-rata, Rata-rata Bawah, Borderline, Intellectual Deficient",
  "cfitSubscores": {
    "sub1": null,
    "sub2": null,
    "sub3": null,
    "sub4": null,
    "totalScore": null
  },
  "cfitCategories": {
    "sub1": "taraf/kategori subtes 1 jika ada (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')",
    "sub2": "taraf/kategori subtes 2 jika ada",
    "sub3": "taraf/kategori subtes 3 jika ada (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')",
    "sub4": "taraf/kategori subtes 4 jika ada (misal: 'Rata-rata', 'R', 'Sedang', 'Baik', 'Cukup')"
  }
}

CATATAN PENTING & PEDOMAN NORMA CFIT:
1. Skor IQ CFIT:
   - >= 130 : Very Superior
   - 120 - 129 : Superior
   - 110 - 119 : Rata-rata Atas
   - 90 - 109 : Rata-rata (misal IQ 106 adalah RATA-RATA!)
   - 80 - 89 : Rata-rata Bawah
   - 70 - 79 : Borderline
   - <= 69 : Intellectual Deficient
2. Subtes CFIT (Subtes 1 = Seri gambar, Subtes 2 = Klasifikasi, Subtes 3 = Matriks, Subtes 4 = Topologi/Titik).
3. Jika tertera skor subtes 1-4, masukkan ke cfitSubscores.
4. Jika salah satu nilai tidak ditemukan, beri null atau string kosong "".`;

export const CFIT_PROMPT = CFIT_STAFF_PROMPT;

export const TKD_PROMPT = `Ekstrak data hasil tes TKD (Tes Kemampuan Dasar) dan biodata dari dokumen laporan/skoring psikotes ini.
Kembalikan HANYA format JSON valid persis seperti template di bawah ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "nama lengkap peserta",
    "tempatTglLahir": "tempat dan tanggal lahir (misal: 'Jakarta, 1 Januari 1995')",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "nomor": "nomor peserta/tes",
    "tanggalTes": "YYYY-MM-DD",
    "pendidikan": "pendidikan terakhir",
    "tujuanPemeriksaan": "posisi/jabatan/tujuan pemeriksaan",
    "namaPT": "nama PT / perusahaan jika tertera"
  },
  "tkdSubscores": {
    "sub1": null,
    "sub2": null,
    "sub3": null,
    "sub4": null,
    "sub5": null,
    "sub6": null,
    "sub7": null,
    "sub8": null,
    "sub9": null,
    "sub10": null,
    "totalScore": null
  },
  "tkdCategories": {
    "sub1": "kategori subtes 1 jika ada (misal: 'Baik', 'Sedang', 'Rata-rata', dll)",
    "sub2": "kategori subtes 2 jika ada",
    "sub3": "kategori subtes 3 jika ada",
    "sub4": "kategori subtes 4 jika ada",
    "sub5": "kategori subtes 5 jika ada",
    "sub6": "kategori subtes 6 jika ada",
    "sub7": "kategori subtes 7 jika ada",
    "sub8": "kategori subtes 8 jika ada",
    "sub9": "kategori subtes 9 jika ada",
    "sub10": "kategori subtes 10 jika ada"
  }
}

CATATAN PENTING:
1. Subtes TKD biasanya terdiri dari TKD 1 sampai TKD 10 (atau bagian-bagian tes kemampuan dasar).
2. Ekstrak nilai angka untuk masing-masing subtes ke tkdSubscores.
3. Jika tertera kategori taraf atau predikat untuk subtes tertentu, masukkan ke tkdCategories.
4. Jika salah satu nilai tidak ditemukan, beri null atau string kosong "".`;

export const KRAEPELIN_PROMPT = `Anda adalah seorang psikolog dan ahli psikometri profesional yang sangat teliti dalam membaca hasil tes psikotes Kraepelin / Pauli / Sikap Kerja.
Tugas Anda adalah mengekstrak data biodata peserta (termasuk NAMA PT / PERUSAHAAN jika tertera di dokumen, kop surat, header laporan, atau tabel identitas) dan nilai 4 dimensi Sikap Kerja dari dokumen yang diberikan (berupa gambar tabel, grafik kurva kerja Kraepelin, lembar skoring, laporan psikotes, atau teks).

=== PERINGATAN KRUSIAL: BACA HEADER KOLOM TABEL SECARA VERTIKAL DENGAN TELITI ===
JANGAN PERNAH MENGASUMSIKAN URUTAN KOLOM DARI KIRI KE KANAN!
Banyak tabel Kraepelin di Indonesia menyusun kolom dalam urutan TERBALIK:
Urutan 1 (Tinggi di Kiri): [Aspek] | Baik Sekali | Baik | Sedang | Kurang | Kurang Sekali
Urutan 2 (Rendah di Kiri): [Aspek] | Kurang Sekali | Kurang | Sedang | Baik | Baik Sekali
Urutan 3 (7 Kolom): [Aspek] | KS | K | RB | R | RA | B | BS (atau sebaliknya BS sampai KS)

ATURAN WAJIB UNTUK MENENTUKAN NILAI SETIAP ASPEK:
1. Temukan baris untuk setiap aspek:
   - Panker = Kecepatan (kecepatan)
   - Tianker = Ketelitian (ketelitian)
   - Janker = Ketekunan / Keuletan (ketekunan)
   - Hanker = Daya Tahan terhadap Stres (dayaTahanStres)
2. Pada baris aspek tersebut, cari di mana tanda centang (V / ✓ / X / dot ●) berada.
3. Tarik garis lurus vertikal dari tanda centang tersebut lurus ke atas sampai ke baris JUDUL HEADER KOLOM di atasnya.
4. BACA TEKS JUDUL HEADER KOLOM TERSEBUT SECARA LANGSUNG, lalu petakan ke nilai 1-7 berikut:
   - Header "Kurang Sekali" / "KS" / "Sangat Rendah" -> Nilai = 1 (KS)
   - Header "Kurang" / "K" / "Rendah" -> Nilai = 2 (K)
   - Header "Rata-rata Bawah" / "RB" / "Cukup Bawah" -> Nilai = 3 (RB)
   - Header "Sedang" / "Cukup" / "Rata-rata" / "R" / "S" / "C" -> Nilai = 4 (R)
   - Header "Rata-rata Atas" / "RA" / "Cukup Atas" -> Nilai = 5 (RA)
   - Header "Baik" / "B" / "Tinggi" -> Nilai = 6 (B)
   - Header "Baik Sekali" / "BS" / "Sangat Tinggi" -> Nilai = 7 (BS)

CONTOH NYATA PADA TABEL KRAEPELIN:
Jika tabel memiliki header: | Baik Sekali | Baik | Sedang | Kurang | Kurang Sekali |
- Baris Panker bertanda V di kolom 'Kurang' -> kecepatan = 2 (K) (JANGAN set 6!)
- Baris Tianker bertanda V di kolom 'Kurang Sekali' -> ketelitian = 1 (KS) (JANGAN set 7!)
- Baris Janker bertanda V di kolom 'Sedang' -> ketekunan = 4 (R)
- Baris Hanker bertanda V di kolom 'Baik Sekali' -> dayaTahanStres = 7 (BS) (JANGAN set 1!)

=== FORMAT OUTPUT JSON WAJIB ===
Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama lengkap peserta jika tertera",
    "tempatTglLahir": "Tempat dan tanggal lahir lengkap jika tertera",
    "pendidikan": "Pendidikan jika tertera",
    "alamat": "Alamat tempat tinggal jika tertera",
    "tujuanPemeriksaan": "Posisi / jabatan jika tertera",
    "namaPT": "Nama PT / perusahaan / instansi / organisasi tempat tes atau melamar jika tertera (misal: 'PT. PAMITRA JAYA KONSTRUKSI', 'PT XYZ'). Jika tidak ada, isi string kosong \"\""
  },
  "sikapKerja": {
    "kecepatan": 2,
    "ketelitian": 1,
    "ketekunan": 4,
    "dayaTahanStres": 7
  },
  "rawDetails": {
    "kecepatan": "Panker: tanda V di kolom Kurang (skor 2 / K)",
    "ketelitian": "Tianker: tanda V di kolom Kurang Sekali (skor 1 / KS)",
    "ketekunan": "Janker: tanda V di kolom Sedang (skor 4 / R)",
    "dayaTahanStres": "Hanker: tanda V di kolom Baik Sekali (skor 7 / BS)"
  }
}

Jika data biodata tidak ditemukan, gunakan string kosong "".
Nilai kecepatan, ketelitian, ketekunan, dayaTahanStres WAJIB berupa angka integer 1 sampai 7.`;

export const PAPI_PROMPT = `Ekstrak data biodata dan hasil tes PAPI Kostick dari dokumen ini. Kamu harus memahami Guide Interpreter PAPI Kostick. Berdasarkan skor dari masing-masing faktor PAPI Kostick (N, G, A, L, P, I, T, V, X, S, B, O, R, D, C, Z, E, K, F, W) yang ada di dokumen, hitung dan petakan ke dalam 9 aspek kepribadian berikut dengan taraf (level) dari 1 sampai 7 (1=Kurang Sekali, 2=Kurang, 3=Rata-rata Bawah, 4=Rata-rata, 5=Rata-rata Atas, 6=Baik, 7=Baik Sekali) sesuai dengan panduan / standar interpretasi psikologi yang berlaku.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada)",
    "tempatTglLahir": "Ekstrak SECARA LENGKAP nama kota tempat lahir DAN tanggal lahirnya (Contoh format: 'Jakarta, 1 Januari 1990'). Jangan hanya tanggalnya saja.",
    "pendidikan": "Pendidikan peserta (jika ada)",
    "tujuanPemeriksaan": "Jabatan/posisi (jika ada)",
    "namaPT": "Nama PT / perusahaan jika tertera (jika ada)"
  },
  "kepribadian": {
    "kematanganEmosi": 0,
    "kemasakanSosial": 0,
    "rasaPercayaDiri": 0,
    "motivasiBerprestasi": 0,
    "sikapMandiri": 0,
    "inisiatif": 0,
    "kemampuanBekerjasama": 0,
    "keterampilanBerkomunikasi": 0,
    "loyalitas": 0
  }
}
Jika data tidak ditemukan, set string menjadi "" dan angka menjadi 0.`;

export function getMBTIPrompt(currentKepribadian?: any) {
  return `Ekstrak data biodata dan hasil tes MBTI dari dokumen ini. Kamu harus memahami Guide Interpreter MBTI dan profil/deskripsi tipe kepribadian (seperti ESTJ, INFP, dll.).
Berikut adalah skor/taraf dari 9 aspek kepribadian berdasarkan tes (PAPI Kostick) sebelumnya:
${JSON.stringify(currentKepribadian || {}, null, 2)}

Tugas Anda adalah:
1. Analisis hasil tes MBTI peserta.
2. Gunakan hasil MBTI sebagai "second opinion" atau pertimbangan tambahan.
3. Sesuaikan taraf ke-9 aspek kepribadian tersebut (skala 1 sampai 7). Jika berdasarkan profil MBTI peserta cenderung kuat di suatu aspek, Anda bisa menaikkan skornya, jika kurang maka diturunkan, atau dipertahankan jika sudah sesuai.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada)",
    "tempatTglLahir": "Ekstrak SECARA LENGKAP nama kota tempat lahir DAN tanggal lahirnya (Contoh format: 'Jakarta, 1 Januari 1990'). Jangan hanya tanggalnya saja.",
    "pendidikan": "Pendidikan peserta (jika ada)",
    "tujuanPemeriksaan": "Jabatan/posisi (jika ada)",
    "namaPT": "Nama PT / perusahaan jika tertera (jika ada)"
  },
  "kepribadian": {
    "kematanganEmosi": 0,
    "kemasakanSosial": 0,
    "rasaPercayaDiri": 0,
    "motivasiBerprestasi": 0,
    "sikapMandiri": 0,
    "inisiatif": 0,
    "kemampuanBekerjasama": 0,
    "keterampilanBerkomunikasi": 0,
    "loyalitas": 0
  }
}
Jika data MBTI tidak ditemukan, kembalikan data kepribadian sebelumnya saja tanpa perubahan.`;
}

export const BEI_PROMPT = `Anda adalah seorang psikolog dan asesor wawancara kerja profesional.
Tugas Anda adalah mengekstrak data Behavior Event Interview (BEI) dari file / dokumen wawancara ini ke dalam format metode STAR (Situation, Task, Action, Result) untuk 9 aspek kompetensi:
1. kematanganEmosi (Kematangan Emosi)
2. kematanganSosial (Kematangan Sosial)
3. rasaPercayaDiri (Rasa Percaya Diri)
4. motivasiBerprestasi (Motivasi Berprestasi)
5. sikapMandiri (Sikap Mandiri)
6. inisiatif (Inisiatif)
7. kemampuanBekerjasama (Kemampuan Bekerjasama)
8. keterampilanBerkomunikasi (Keterampilan Berkomunikasi)
9. loyalitas (Loyalitas)

PANDUAN EKSTRAKSI:
- Ekstrak data peserta jika ada: nama, posisi/level yang dituju, dan ringkasan pengalaman kerja / perkenalan.
- Untuk setiap aspek kompetensi, ekstrak 4 komponen STAR:
  * situation: Situasi, konteks, latar belakang tantangan atau masalah yang dihadapi kandidat.
  * task: Tugas, tanggung jawab, atau target yang harus diselesaikan kandidat dalam situasi tersebut.
  * action: Aksi nyata, langkah konkret, atau inisiatif yang diambil kandidat untuk menyelesaikan tugas.
  * result: Hasil, pencapaian, dampak, atau pembelajaran akhir dari tindakan tersebut.
- Jika suatu aspek atau komponen STAR tidak ada dalam catatan/transkrip wawancara, biarkan string kosong "". Jangan mengarang data.

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama peserta (jika ada, atau '')",
    "posisi": "Posisi/level (jika ada, atau '')",
    "pengalaman": "Ringkasan pengalaman kerja / perkenalan (jika ada, atau '')"
  },
  "kematanganEmosi": { "situation": "", "task": "", "action": "", "result": "" },
  "kematanganSosial": { "situation": "", "task": "", "action": "", "result": "" },
  "rasaPercayaDiri": { "situation": "", "task": "", "action": "", "result": "" },
  "motivasiBerprestasi": { "situation": "", "task": "", "action": "", "result": "" },
  "sikapMandiri": { "situation": "", "task": "", "action": "", "result": "" },
  "inisiatif": { "situation": "", "task": "", "action": "", "result": "" },
  "kemampuanBekerjasama": { "situation": "", "task": "", "action": "", "result": "" },
  "keterampilanBerkomunikasi": { "situation": "", "task": "", "action": "", "result": "" },
  "loyalitas": { "situation": "", "task": "", "action": "", "result": "" }
}`;

export const MSDT_PROMPT = `Anda adalah seorang psikolog dan asesor profesional ahli psikometri yang sangat teliti dalam membaca hasil tes MSDT (Management Style Diagnostic Test / Gaya Kepemimpinan W.J. Reddin) atau lembar asesmen manajerial.
Tugas Anda adalah:
1. Ekstrak data biodata peserta (nama, tempat tanggal lahir, jenis kelamin, pendidikan, nomor peserta, tujuan pemeriksaan/posisi jabatan, nama PT/perusahaan).
2. Analisis hasil tes MSDT peserta dari dokumen yang diberikan (berupa gambar/PDF grafik profil MSDT, lembar skoring, laporan psikotes, atau transkrip). Dokumen mungkin berisi:
   - Skor dimensi TO (Task Orientation), RO (Relationships Orientation), dan E (Effectiveness).
   - Tipe gaya kepemimpinan (Executive, Developer, Benevolent Autocrat, Bureaucrat, Compromiser, Missionary, Autocrat, Deserter).
   - Tabel penilaian kompetensi kepemimpinan.
3. Petakan dan tentukan nilai taraf 1 sampai 7 (1=KS / Kurang Sekali, 2=K / Kurang, 3=RB / Rata-rata Bawah, 4=R / Rata-rata, 5=RA / Rata-rata Atas, 6=B / Baik, 7=BS / Baik Sekali) untuk 4 aspek Kepemimpinan berikut:
   1. Kepemimpinan: "Memproyeksikan dirinya sebagai pemimpin dan mencoba menggunakan orang lain untuk mencapai tujuannya."
      - Taraf tinggi (5-7): Orientasi tugas & wibawa kepemimpinan kuat, gaya Executive atau Benevolent Autocrat, mampu mengarahkan tim dengan mantap dan tegas.
      - Taraf sedang (4): Mampu memimpin tim standar sesuai tugas yang diberikan.
      - Taraf rendah (1-3): Kurang percaya diri memimpin orang lain, pasif, atau cenderung menghindar (Deserter / Missionary lemah).
   2. Tanggungjawab: "Kesediaan bertanggung jawab atas hasil kerjanya dan orang lain yang dipimpin."
      - Taraf tinggi (5-7): Komitmen tinggi terhadap hasil tim, akuntabilitas kuat, gaya Executive / Benevolent Autocrat / Bureaucrat berintegritas.
      - Taraf sedang (4): Bertanggung jawab atas tugas rutin sendiri dan tim.
      - Taraf rendah (1-3): Kurang akuntabel atau melempar kesalahan pada situasi/bawahan (Deserter).
   3. Pengambilan Keputusan: "Kemampuan memilih suatu tindakan dari beberapa alternatif tindakan secara sistematis sebagai cara pemecahan masalah."
      - Taraf tinggi (5-7): Cepat, tepat, dan sistematis dalam memutuskan tindakan di bawah ketidakpastian; gaya Executive / Benevolent Autocrat.
      - Taraf sedang (4): Mampu mengambil keputusan pada situasi kerja umum.
      - Taraf rendah (1-3): Ragu-ragu, kompromistis tanpa prinsip (Compromiser), lambat atau takut resiko.
   4. Pengembangan Karyawan: "Kemampuan dalam memberdayakan bawahan melalui pemberian wewenang serta memberikan kesempatan untuk meningkatkan kompetensinya."
      - Taraf tinggi (5-7): Orientasi hubungan (RO) tinggi & berdaya guna, gaya Developer atau Executive, aktif melatih, mendelegasikan, dan memotivasi bawahan.
      - Taraf sedang (4): Memberikan arahan standar dan mendelegasikan tugas rutin.
      - Taraf rendah (1-3): Cenderung one-man show (Autocrat kaku) atau acuh tak acuh terhadap peningkatan kompetensi bawahan (Deserter).

=== ATURAN PRIORITAS TABEL LANGSUNG ===
JIKA di dalam dokumen sudah tercantum secara eksplisit tabel atau teks kategori/skor langsung untuk "Kepemimpinan", "Tanggungjawab", "Pengambilan Keputusan", dan "Pengembangan Karyawan" (atau istilah serupa seperti Leadership, Responsibility, Decision Making, People Development):
- BACA DAN PRIORITASKAN NILAI TERSEBUT LANGSUNG (konversikan ke skala 1-7: KS=1, K=2, RB=3, R=4, RA=5, B=6, BS=7 atau Sangat Rendah=1 s/d Sangat Tinggi=7).

Kembalikan HANYA format JSON valid persis seperti ini (tanpa markdown \`\`\`json):
{
  "clientData": {
    "nama": "Nama lengkap peserta jika tertera",
    "tempatTglLahir": "Tempat dan tanggal lahir lengkap jika tertera",
    "jenisKelamin": "Laki-laki atau Perempuan atau kosong",
    "pendidikan": "Pendidikan jika tertera",
    "nomor": "Nomor tes/peserta jika tertera",
    "alamat": "Alamat jika tertera",
    "tujuanPemeriksaan": "Posisi / jabatan manajerial jika tertera",
    "namaPT": "Nama PT / perusahaan jika tertera"
  },
  "kepemimpinan": {
    "kepemimpinan": 4,
    "tanggungjawab": 4,
    "pengambilanKeputusan": 4,
    "pengembanganKaryawan": 4
  },
  "rawDetails": {
    "gayaKepemimpinan": "Gaya kepemimpinan utama terdeteksi (misal: Executive / Developer dll beserta skor TO/RO/E jika ada)",
    "kepemimpinan": "Penjelasan singkat analisis / dasar skor aspek kepemimpinan",
    "tanggungjawab": "Penjelasan singkat analisis / dasar skor aspek tanggung jawab",
    "pengambilanKeputusan": "Penjelasan singkat analisis / dasar skor aspek pengambilan keputusan",
    "pengembanganKaryawan": "Penjelasan singkat analisis / dasar skor aspek pengembangan karyawan"
  }
}

Jika data biodata tidak ditemukan, gunakan string kosong "".
Nilai kepemimpinan, tanggungjawab, pengambilanKeputusan, pengembanganKaryawan WAJIB berupa angka integer 1 sampai 7.`;
