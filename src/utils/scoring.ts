import { ScaleLevel, ScaleLabel, IstScores } from '../types';

export const SCALE_LABELS: ScaleLabel[] = ['SR', 'R', 'C-', 'C', 'C+', 'T', 'ST'];

export const PREDEFINED_INTERESTS: Record<string, string> = {
  'Outdoor (Out)': 'Minat terhadap pekerjaan yang dilakukan di luar ruangan atau alam terbuka, tidak terikat di dalam gedung atau kantor, serta berkaitan dengan alam atau aktivitas fisik lapangan.',
  'Mechanical (Mech)': 'Minat terhadap pekerjaan yang berhubungan dengan mesin, alat mekanis, perkakas, listrik, atau peralatan teknik.',
  'Computational (Comp)': 'Minat terhadap pekerjaan yang banyak menggunakan angka-angka, perhitungan, pembukuan, atau manipulasi data matematis.',
  'Scientific (Sci)': 'Minat yang berkaitan dengan penyelidikan, penemuan, riset, analisis ilmiah, atau eksperimen di laboratorium.',
  'Personal Contact (Pers)': 'Minat terhadap pekerjaan yang berinteraksi langsung dengan orang lain secara persuasif, membujuk, menjual gagasan, atau memimpin orang banyak.',
  'Aesthetic (Aesth)': 'Minat yang berkaitan dengan hal-hal artistik, keindahan, seni rupa, desain, lukisan, dan dekorasi.',
  'Literary (Lit)': 'Minat terhadap hal-hal yang berhubungan dengan bahasa, kata-kata, membaca, menulis karangan atau buku, serta telaah literatur.',
  'Musical (Mus)': 'Minat yang berfokus pada musik, baik memainkan instrumen, bernyanyi, mengaransemen, mendengarkan, maupun menghargai karya musik.',
  'Social Service (S.S)': 'Minat terhadap pekerjaan yang berorientasi pada menolong sesama, pelayanan sosial, pembinaan, pendidikan, dan kesejahteraan masyarakat.',
  'Clerical (Cler)': 'Minat terhadap tugas administratif rutin, pencatatan dokumen, pengarsipan, kerapian data, dan pekerjaan kantor yang terstruktur.',
  'Practical (Prac)': 'Minat terhadap pekerjaan praktis yang menuntut keterampilan tangan, pertukangan, atau pembuatan barang-barang fungsional tanpa memerlukan penanganan mesin yang rumit.',
  'Medical (Med)': 'Minat terhadap bidang kesehatan, penyembuhan penyakit, serta perawatan kondisi fisik dan fisiologis manusia maupun hewan.'
};

export const calculateAge = (dob: string, testDate: string): string => {
  if (!dob || !testDate) return '';
  const start = new Date(dob);
  const end = new Date(testDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  if (end < start) return 'Cek kembali tanggal';

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years} tahun, ${months} bulan, ${days} hari`;
};

export const getAgeInYears = (dob: string, testDate: string): number | null => {
  if (!dob || !testDate) return null;
  const start = new Date(dob);
  const end = new Date(testDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  let age = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) {
    age--;
  }
  return age;
};

export const getAgeGroup = (age: number | null): string => {
  if (age === null) return '19-20'; // Default
  if (age <= 12) return '12';
  if (age === 13) return '13';
  if (age === 14) return '14';
  if (age === 15) return '15';
  if (age === 16) return '16';
  if (age === 17) return '17';
  if (age === 18) return '18';
  if (age >= 19 && age <= 20) return '19-20';
  if (age >= 21 && age <= 25) return '21-25';
  if (age >= 26 && age <= 30) return '26-30';
  if (age >= 31 && age <= 35) return '31-35';
  if (age >= 36 && age <= 40) return '36-40';
  if (age >= 41 && age <= 45) return '41-45';
  if (age >= 46 && age <= 50) return '46-50';
  return '51-60';
};

export const formatDateId = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const getIqClassification = (iq: number | ''): string => {
  if (iq === '') return '-';
  if (iq < 70) return 'Sangat Rendah';
  if (iq <= 79) return 'Rendah';
  if (iq <= 89) return 'Rata-rata Bawah';
  if (iq <= 109) return 'Rata-rata';
  if (iq <= 119) return 'Rata-rata Atas';
  if (iq <= 129) return 'Tinggi';
  return 'Sangat Tinggi';
};

export const convertGeRw = (rw: number | ''): number | '' => {
  if (rw === '') return '';
  if (rw >= 31) return 20;
  if (rw === 30) return 19;
  if (rw === 29) return 18;
  if (rw === 28) return 17;
  if (rw === 27) return 16;
  if (rw >= 25 && rw <= 26) return 15;
  if (rw >= 23 && rw <= 24) return 14;
  if (rw >= 21 && rw <= 22) return 13;
  if (rw >= 19 && rw <= 20) return 12;
  if (rw >= 17 && rw <= 18) return 11;
  if (rw >= 15 && rw <= 16) return 10;
  if (rw >= 13 && rw <= 14) return 9;
  if (rw >= 11 && rw <= 12) return 8;
  if (rw >= 9 && rw <= 10) return 7;
  if (rw >= 7 && rw <= 8) return 6;
  if (rw >= 5 && rw <= 6) return 5;
  if (rw === 4) return 4;
  if (rw === 3) return 3;
  if (rw === 2) return 2;
  return 1;
};

// IST Norms Extracted from User Provided Tables (Mean and Standard Deviation by Age)
export const IST_NORMS: Record<string, Record<string, {M: number, s: number}>> = {
  '12': { SE: {M: 6.5, s: 2.5}, WA: {M: 7.1, s: 2.4}, AN: {M: 5.8, s: 2.6}, GE: {M: 6.3, s: 2.7}, ME: {M: 6.7, s: 3.4}, RA: {M: 6.1, s: 2.7}, ZR: {M: 6.0, s: 3.0}, FA: {M: 7.5, s: 2.8}, WU: {M: 7.5, s: 3.2}, GESAMT: {M: 59, s: 17} },
  '13': { SE: {M: 7.1, s: 2.6}, WA: {M: 7.7, s: 2.5}, AN: {M: 6.3, s: 2.7}, GE: {M: 7.0, s: 2.8}, ME: {M: 7.4, s: 3.5}, RA: {M: 7.0, s: 2.9}, ZR: {M: 6.5, s: 3.4}, FA: {M: 7.9, s: 3.2}, WU: {M: 8.0, s: 3.2}, GESAMT: {M: 65, s: 18} },
  '14': { SE: {M: 7.7, s: 2.7}, WA: {M: 8.2, s: 2.8}, AN: {M: 6.8, s: 3.0}, GE: {M: 7.6, s: 2.9}, ME: {M: 8.0, s: 3.4}, RA: {M: 7.5, s: 2.8}, ZR: {M: 7.1, s: 3.5}, FA: {M: 8.4, s: 3.1}, WU: {M: 8.4, s: 2.9}, GESAMT: {M: 70, s: 19} },
  '15': { SE: {M: 8.6, s: 2.9}, WA: {M: 9.0, s: 2.9}, AN: {M: 7.5, s: 3.5}, GE: {M: 8.4, s: 2.9}, ME: {M: 9.0, s: 3.8}, RA: {M: 8.4, s: 3.2}, ZR: {M: 8.2, s: 3.7}, FA: {M: 8.8, s: 3.5}, WU: {M: 8.7, s: 2.9}, GESAMT: {M: 70, s: 19} },
  '16': { SE: {M: 9.5, s: 3.0}, WA: {M: 9.5, s: 3.0}, AN: {M: 8.7, s: 3.5}, GE: {M: 9.0, s: 3.2}, ME: {M: 10.1, s: 3.7}, RA: {M: 8.8, s: 3.3}, ZR: {M: 8.7, s: 3.9}, FA: {M: 9.2, s: 3.6}, WU: {M: 9.1, s: 3.2}, GESAMT: {M: 70, s: 19} },
  '17': { SE: {M: 10.2, s: 3.3}, WA: {M: 10.0, s: 2.7}, AN: {M: 9.3, s: 3.9}, GE: {M: 9.8, s: 3.8}, ME: {M: 10.8, s: 4.0}, RA: {M: 9.0, s: 3.4}, ZR: {M: 9.5, s: 4.0}, FA: {M: 9.6, s: 3.6}, WU: {M: 9.3, s: 3.3}, GESAMT: {M: 88, s: 23} },
  '18': { SE: {M: 10.5, s: 3.5}, WA: {M: 10.4, s: 2.9}, AN: {M: 9.7, s: 3.9}, GE: {M: 10.2, s: 4.0}, ME: {M: 11.3, s: 4.2}, RA: {M: 9.2, s: 3.5}, ZR: {M: 9.9, s: 4.2}, FA: {M: 9.8, s: 3.4}, WU: {M: 9.6, s: 3.6}, GESAMT: {M: 91, s: 24} },
  '19-20': { SE: {M: 10.8, s: 3.6}, WA: {M: 10.6, s: 3.0}, AN: {M: 10.0, s: 3.9}, GE: {M: 10.6, s: 3.9}, ME: {M: 11.5, s: 4.5}, RA: {M: 9.3, s: 3.6}, ZR: {M: 10.3, s: 4.3}, FA: {M: 10.3, s: 3.7}, WU: {M: 9.8, s: 3.5}, GESAMT: {M: 93, s: 27} },
  '21-25': { SE: {M: 11.0, s: 3.4}, WA: {M: 10.4, s: 2.8}, AN: {M: 9.7, s: 4.0}, GE: {M: 11.0, s: 3.6}, ME: {M: 10.7, s: 4.3}, RA: {M: 9.2, s: 3.5}, ZR: {M: 9.6, s: 4.2}, FA: {M: 10.5, s: 3.5}, WU: {M: 9.9, s: 3.5}, GESAMT: {M: 92, s: 26} },
  '26-30': { SE: {M: 11.2, s: 3.3}, WA: {M: 10.2, s: 3.0}, AN: {M: 9.3, s: 4.2}, GE: {M: 11.3, s: 3.6}, ME: {M: 10.0, s: 4.4}, RA: {M: 9.2, s: 3.5}, ZR: {M: 9.2, s: 4.3}, FA: {M: 10.3, s: 3.5}, WU: {M: 9.5, s: 3.4}, GESAMT: {M: 90, s: 26} },
  '31-35': { SE: {M: 10.9, s: 3.4}, WA: {M: 9.8, s: 3.0}, AN: {M: 8.7, s: 4.4}, GE: {M: 10.9, s: 3.5}, ME: {M: 9.5, s: 4.4}, RA: {M: 9.2, s: 3.7}, ZR: {M: 8.7, s: 4.2}, FA: {M: 9.7, s: 3.6}, WU: {M: 9.2, s: 3.6}, GESAMT: {M: 87, s: 27} },
  '36-40': { SE: {M: 10.5, s: 3.4}, WA: {M: 9.4, s: 3.2}, AN: {M: 8.2, s: 4.4}, GE: {M: 10.5, s: 3.4}, ME: {M: 9.0, s: 4.1}, RA: {M: 9.1, s: 3.6}, ZR: {M: 8.4, s: 4.5}, FA: {M: 9.0, s: 3.9}, WU: {M: 8.6, s: 3.6}, GESAMT: {M: 83, s: 29} },
  '41-45': { SE: {M: 10.0, s: 3.5}, WA: {M: 8.9, s: 3.5}, AN: {M: 7.7, s: 4.5}, GE: {M: 10.0, s: 3.5}, ME: {M: 8.3, s: 4.4}, RA: {M: 8.4, s: 3.5}, ZR: {M: 8.0, s: 4.2}, FA: {M: 8.5, s: 3.9}, WU: {M: 8.3, s: 3.7}, GESAMT: {M: 78, s: 29} },
  '46-50': { SE: {M: 9.3, s: 3.4}, WA: {M: 8.3, s: 3.1}, AN: {M: 7.0, s: 4.6}, GE: {M: 9.4, s: 3.4}, ME: {M: 7.5, s: 4.5}, RA: {M: 8.1, s: 3.5}, ZR: {M: 7.3, s: 4.4}, FA: {M: 8.0, s: 3.6}, WU: {M: 7.6, s: 3.7}, GESAMT: {M: 73, s: 28} },
  '51-60': { SE: {M: 8.3, s: 3.4}, WA: {M: 8.3, s: 3.1}, AN: {M: 7.0, s: 4.6}, GE: {M: 9.4, s: 3.4}, ME: {M: 7.5, s: 4.5}, RA: {M: 8.1, s: 3.5}, ZR: {M: 7.3, s: 4.4}, FA: {M: 8.0, s: 3.6}, WU: {M: 7.6, s: 3.7}, GESAMT: {M: 73, s: 28} },
};

export const SW_TO_IQ: Record<number, number> = {
  140: 160, 138: 157, 136: 154, 134: 151, 132: 145, 129: 143, 128: 142, 127: 140, 126: 139, 125: 137,
  124: 136, 123: 134, 122: 133, 121: 131, 120: 130, 119: 128, 118: 127, 117: 125, 116: 124, 115: 122,
  114: 121, 113: 120, 112: 118, 111: 116, 110: 115, 109: 113, 108: 112, 107: 110, 106: 109, 105: 107,
  104: 106, 103: 104, 102: 103, 101: 101, 100: 100, 99: 98, 98: 97, 97: 96, 96: 94, 95: 92, 94: 91,
  93: 90, 92: 88, 91: 87, 90: 85, 89: 84, 88: 82, 87: 81, 86: 79, 85: 78, 84: 76, 83: 75, 82: 73,
  81: 71, 80: 70, 79: 68, 78: 67, 77: 66, 76: 64, 75: 62, 74: 61, 73: 59, 72: 58, 70: 55, 68: 52,
  66: 49, 64: 46, 62: 43, 60: 40, 58: 37
};

export const getIqFromGesamtSw = (sw: number | ''): number | '' => {
  if (sw === '') return '';
  if (SW_TO_IQ[sw]) return SW_TO_IQ[sw];
  
  const keys = Object.keys(SW_TO_IQ).map(Number).sort((a, b) => a - b);
  if (sw <= keys[0]) return SW_TO_IQ[keys[0]];
  if (sw >= keys[keys.length - 1]) return SW_TO_IQ[keys[keys.length - 1]];
  
  let lower = keys[0];
  let upper = keys[keys.length - 1];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] < sw) lower = keys[i];
    if (keys[i] > sw) {
      upper = keys[i];
      break;
    }
  }
  
  const iqLower = SW_TO_IQ[lower];
  const iqUpper = SW_TO_IQ[upper];
  const ratio = (sw - lower) / (upper - lower);
  return Math.round(iqLower + ratio * (iqUpper - iqLower));
};

export const calculateGesamtRw = (istScores: IstScores): number => {
  const istKeys = ['SE', 'WA', 'AN', 'GE', 'ME', 'RA', 'ZR', 'FA', 'WU'] as const;
  let totalRw = 0;
  istKeys.forEach(key => {
    const val = istScores[key as keyof IstScores];
    if (val !== '') {
      totalRw += key === 'GE' ? (convertGeRw(val as number) || 0) : Number(val);
    }
  });
  return totalRw;
};

export const calculateGesamtSw = (istScores: IstScores, ageGroup: string): number | '' => {
  const totalRw = calculateGesamtRw(istScores);
  if (totalRw === 0) return '';
  return getSwFromRw('GESAMT', totalRw, ageGroup, true);
};

export const calculateIq = (istScores: IstScores, ageGroup: string): number | '' => {
  const gesamtSw = calculateGesamtSw(istScores, ageGroup);
  return getIqFromGesamtSw(gesamtSw);
};

// Kalkulasi SW berdasarkan RW dan Norma Usia
export const getSwFromRw = (subtest: string, rw: number | '', ageGroup: string, exact: boolean = false): number | '' => {
  if (rw === '') return '';
  let finalRw = rw as number;
  
  if (subtest === 'GE') {
    finalRw = convertGeRw(finalRw) as number;
  }
  
  const norms = IST_NORMS[ageGroup];
  if (!norms || !norms[subtest]) return '';
  
  const { M, s } = norms[subtest];
  
  // Formula SW = 100 + 10 * ((RW - M) / s)
  const sw = 100 + 10 * ((finalRw - M) / s);
  return exact ? Number(sw.toFixed(2)) : Math.round(sw); 
};

// Konversi nilai Standardized Score (SW) ke Skala 1-7 (Kapasitas Aspek)
export const swToScaleLevel = (sw: number | ''): ScaleLevel => {
  if (sw === '') return 4; // Default C (Cukup) jika kosong
  if (sw < 80) return 1;
  if (sw <= 87) return 2;
  if (sw <= 94) return 3;
  if (sw <= 105) return 4;
  if (sw <= 112) return 5;
  if (sw <= 119) return 6;
  return 7;
};

// Mapping Nilai SW dari subtes IST ke Aspek Bagian A & B
export const calculateAspectsFromIST = (istScores: IstScores, ageGroup: string) => {
  // Hitung SW masing-masing (Jika kosong anggap rata-rata/100)
  const sw = {
    SE: getSwFromRw('SE', istScores.SE, ageGroup) || 100,
    WA: getSwFromRw('WA', istScores.WA, ageGroup) || 100,
    AN: getSwFromRw('AN', istScores.AN, ageGroup) || 100,
    GE: getSwFromRw('GE', istScores.GE, ageGroup) || 100,
    ME: getSwFromRw('ME', istScores.ME, ageGroup) || 100,
    RA: getSwFromRw('RA', istScores.RA, ageGroup) || 100,
    ZR: getSwFromRw('ZR', istScores.ZR, ageGroup) || 100,
    FA: getSwFromRw('FA', istScores.FA, ageGroup) || 100,
    WU: getSwFromRw('WU', istScores.WU, ageGroup) || 100,
  };

  return {
    // Bagian A Formula updates based on uploaded table
    pemahaman: swToScaleLevel((Number(sw.SE) + Number(sw.WA)) / 2),
    penalaran: swToScaleLevel((Number(sw.AN) + Number(sw.ZR)) / 2),
    dayaAnalisis: swToScaleLevel((Number(sw.AN) + Number(sw.RA)) / 2),
    dayaSintesis: swToScaleLevel((Number(sw.GE) + Number(sw.FA)) / 2),
    dayaIngat: swToScaleLevel(Number(sw.ME)),
    
    // Bagian B Formula updates based on uploaded table
    verbal: swToScaleLevel((Number(sw.SE) + Number(sw.WA) + Number(sw.AN) + Number(sw.GE)) / 4),
    numerik: swToScaleLevel((Number(sw.RA) + Number(sw.ZR)) / 2),
    spasial: swToScaleLevel((Number(sw.FA) + Number(sw.WU)) / 2),
  };
};

export const getScaleLabel = (level: ScaleLevel): ScaleLabel => {
  return SCALE_LABELS[level - 1];
};

/**
 * Norma CFIT Skala 2 untuk Anak Usia di Bawah 15 Tahun (Siswa SD & SMP).
 * Rata-rata (M) dan Standar Deviasi (s) per kelompok usia (8 - 14 tahun).
 * Form A terdiri dari 4 subtes:
 * Subtes 1 (Seri / Deret) Max: 13
 * Subtes 2 (Klasifikasi) Max: 14
 * Subtes 3 (Matriks) Max: 13
 * Subtes 4 (Kondisi / Persyaratan) Max: 10
 * Total Max: 50
 */
export const CFIT_CHILD_NORMS: Record<string, {
  total: { M: number; s: number };
  sub1: { M: number; s: number };
  sub2: { M: number; s: number };
  sub3: { M: number; s: number };
  sub4: { M: number; s: number };
}> = {
  '8': {
    total: { M: 17.0, s: 5.0 },
    sub1: { M: 4.4, s: 1.8 },
    sub2: { M: 4.9, s: 2.0 },
    sub3: { M: 4.4, s: 1.8 },
    sub4: { M: 3.3, s: 1.5 },
  },
  '9': {
    total: { M: 19.0, s: 5.2 },
    sub1: { M: 4.9, s: 1.9 },
    sub2: { M: 5.5, s: 2.1 },
    sub3: { M: 4.9, s: 1.9 },
    sub4: { M: 3.7, s: 1.6 },
  },
  '10': {
    total: { M: 21.0, s: 5.4 },
    sub1: { M: 5.5, s: 2.0 },
    sub2: { M: 6.1, s: 2.2 },
    sub3: { M: 5.5, s: 2.0 },
    sub4: { M: 3.9, s: 1.6 },
  },
  '11': {
    total: { M: 23.0, s: 5.6 },
    sub1: { M: 6.0, s: 2.1 },
    sub2: { M: 6.7, s: 2.3 },
    sub3: { M: 6.0, s: 2.1 },
    sub4: { M: 4.3, s: 1.7 },
  },
  '12': {
    total: { M: 25.0, s: 5.8 },
    sub1: { M: 6.5, s: 2.2 },
    sub2: { M: 7.3, s: 2.4 },
    sub3: { M: 6.5, s: 2.2 },
    sub4: { M: 4.7, s: 1.8 },
  },
  '13': {
    total: { M: 27.0, s: 6.0 },
    sub1: { M: 7.0, s: 2.3 },
    sub2: { M: 7.8, s: 2.5 },
    sub3: { M: 7.0, s: 2.3 },
    sub4: { M: 5.2, s: 1.9 },
  },
  '14': {
    total: { M: 29.0, s: 6.2 },
    sub1: { M: 7.5, s: 2.4 },
    sub2: { M: 8.4, s: 2.6 },
    sub3: { M: 7.5, s: 2.4 },
    sub4: { M: 5.6, s: 2.0 },
  },
};

/**
 * Konversi Z-Score ke 7 Skala Psikogram Terstandar (SR, R, C-, C, C+, T, ST)
 */
export const zToScaleLevel = (z: number): ScaleLevel => {
  if (z >= 1.75) return 7; // ST (Sangat Tinggi / Cerdas)
  if (z >= 1.00) return 6; // T (Tinggi / Baik)
  if (z >= 0.35) return 5; // C+ (Rata-rata Atas / Cukup Atas)
  if (z >= -0.35) return 4; // C (Rata-rata / Cukup)
  if (z >= -1.00) return 3; // C- (Rata-rata Bawah / Cukup Bawah)
  if (z >= -1.75) return 2; // R (Rendah / Kurang)
  return 1;                // SR (Sangat Rendah / Sangat Kurang)
};

/**
 * Skala persentase capaian khusus anak di bawah 15 tahun (CFIT Skala 2)
 */
export const getCfitScaleLevel = (pct: number): ScaleLevel => {
  if (pct >= 64) return 7; // 'ST' (Sangat Tinggi)
  if (pct >= 54) return 6; // 'T'  (Tinggi)
  if (pct >= 46) return 5; // 'C+' (Rata-rata Atas)
  if (pct >= 36) return 4; // 'C'  (Rata-rata)
  if (pct >= 28) return 3; // 'C-' (Rata-rata Bawah)
  if (pct >= 20) return 2; // 'R'  (Rendah)
  return 1;                // 'SR' (Sangat Rendah)
};

export interface CalculatedCfitResult {
  rawTotal: number;
  estimatedIq: number;
  ageUsed: number;
  isAgeSpecific: boolean;
  bagianA: {
    pemahaman: ScaleLevel;
    penalaran: ScaleLevel;
    dayaAnalisis: ScaleLevel;
    dayaSintesis: ScaleLevel;
    dayaIngat: ScaleLevel;
  };
  bagianB: {
    sistematikaBerpikir: ScaleLevel;
    logikaHubungan: ScaleLevel;
    ketajamanDiferensiasi: ScaleLevel;
  };
}

/**
 * Menghitung Psikogram CFIT Skala 2 berdasarkan Norma Terstandarisasi Anak Usia < 15 Tahun.
 * Jika usia anak disertakan (dari tanggal lahir dan tanggal tes), perhitungan menggunakan norma usia spesifik.
 * Jika usia tidak diisi, digunakan norma acuan rata-rata siswa SD (10 tahun).
 */
export const calculatePsikogramCFIT = (
  rawScores: { sub1: number; sub2: number; sub3: number; sub4: number },
  age?: number | null
): CalculatedCfitResult => {
  const s1 = Math.min(13, Math.max(0, rawScores.sub1 || 0)); // Max 13
  const s2 = Math.min(14, Math.max(0, rawScores.sub2 || 0)); // Max 14
  const s3 = Math.min(13, Math.max(0, rawScores.sub3 || 0)); // Max 13
  const s4 = Math.min(10, Math.max(0, rawScores.sub4 || 0)); // Max 10

  const totalScore = s1 + s2 + s3 + s4; // Max 50

  // Tentukan kelompok usia norma (rentang anak < 15 tahun)
  let ageKey = '10'; // Default standar usia anak SD
  let isAgeSpecific = false;
  let ageUsed = 10;

  if (typeof age === 'number' && !isNaN(age) && age > 0) {
    isAgeSpecific = true;
    if (age <= 8) {
      ageKey = '8';
      ageUsed = 8;
    } else if (age >= 14) {
      ageKey = '14';
      ageUsed = 14;
    } else {
      const rounded = Math.round(age);
      ageKey = String(rounded);
      ageUsed = rounded;
    }
  }

  const norm = CFIT_CHILD_NORMS[ageKey] || CFIT_CHILD_NORMS['10'];

  // Hitung Z-Score masing-masing subtes terhadap norma anak seusianya
  const z1 = (s1 - norm.sub1.M) / norm.sub1.s;
  const z2 = (s2 - norm.sub2.M) / norm.sub2.s;
  const z3 = (s3 - norm.sub3.M) / norm.sub3.s;
  const z4 = (s4 - norm.sub4.M) / norm.sub4.s;
  const zTotal = (totalScore - norm.total.M) / norm.total.s;

  // Estimasi Skor IQ CFIT Skala 2 untuk anak (Mean 100, SD 15 standar psikotes)
  const estimatedIq = Math.max(55, Math.min(145, Math.round(100 + 15 * zTotal)));

  // --- BAGIAN A: ASPEK KECERDASAN UMUM ---
  // Pemahaman: Diukur dari pemahaman pola dan persyaratan (Subtes 4: Kondisi & Subtes 1: Seri)
  const zPemahaman = (z1 * 0.45) + (z4 * 0.55);
  // Penalaran: Diukur dari penalaran fluid menyeluruh (Total Skor CFIT)
  const zPenalaran = zTotal;
  // Daya Analisis: Diukur dari ketajaman mengurai detail dan klasifikasi (Subtes 2: Klasifikasi & Subtes 3: Matriks)
  const zAnalisis = (z2 * 0.55) + (z3 * 0.45);
  // Daya Sintesis: Diukur dari mengintegrasikan bagian pola menjadi utuh (Subtes 3: Matriks & Subtes 1: Seri)
  const zSintesis = (z3 * 0.55) + (z1 * 0.45);
  // Daya Ingat (Working Memory): Mempertahankan aturan urutan dan kondisi dalam memori kerja (Subtes 1 & Subtes 4)
  const zDayaIngat = (z1 * 0.50) + (z4 * 0.50);

  // --- BAGIAN B: ASPEK BAKAT KEMAMPUAN ---
  // Sistematika Berpikir: Diukur dari Subtes 1 (Seri / Rangkaian berkesinambungan)
  const zSistematika = z1;
  // Logika Hubungan: Diukur dari Subtes 3 (Matriks / Hubungan analogi abstrak)
  const zLogikaHubungan = z3;
  // Ketajaman Diferensiasi: Diukur dari Subtes 2 (Klasifikasi / Diskriminasi visual)
  const zDiferensiasi = z2;

  return {
    rawTotal: totalScore,
    estimatedIq,
    ageUsed,
    isAgeSpecific,
    bagianA: {
      pemahaman: zToScaleLevel(zPemahaman),
      penalaran: zToScaleLevel(zPenalaran),
      dayaAnalisis: zToScaleLevel(zAnalisis),
      dayaSintesis: zToScaleLevel(zSintesis),
      dayaIngat: zToScaleLevel(zDayaIngat),
    },
    bagianB: {
      sistematikaBerpikir: zToScaleLevel(zSistematika),
      logikaHubungan: zToScaleLevel(zLogikaHubungan),
      ketajamanDiferensiasi: zToScaleLevel(zDiferensiasi),
    }
  };
};

/**
 * Konversi kategori hasil tes langsung dari PDF (misal SR, R, S, T, ST)
 * ke dalam 7 skala Psikogram Staf:
 * KS (1), K (2), RB (3), R (4), RA (5), B (6), BS (7)
 */
export const convertCategoryToStaffScale = (val: string | number | undefined | null): ScaleLevel => {
  if (val === undefined || val === null || val === '') return 4;
  if (typeof val === 'number') {
    if (val >= 1 && val <= 7) return Math.round(val) as ScaleLevel;
    return 4;
  }
  const clean = String(val).trim().toUpperCase();

  // 1. Kurang Sekali / Sangat Rendah
  if (clean === 'SR' || clean === 'KS' || clean.includes('SANGAT RENDAH') || clean.includes('KURANG SEKALI')) {
    return 1; // KS
  }
  // 2. Baik Sekali / Sangat Tinggi
  if (clean === 'ST' || clean === 'BS' || clean.includes('SANGAT TINGGI') || clean.includes('BAIK SEKALI')) {
    return 7; // BS
  }
  // 3. Rata-rata Bawah
  if (clean === 'RB' || clean === 'C-' || clean.includes('RATA-RATA BAWAH') || clean.includes('RATA2 BAWAH') || clean.includes('RATARATA BAWAH')) {
    return 3; // RB
  }
  // 4. Rata-rata Atas
  if (clean === 'RA' || clean === 'C+' || clean.includes('RATA-RATA ATAS') || clean.includes('RATA2 ATAS') || clean.includes('RATARATA ATAS')) {
    return 5; // RA
  }
  // 5. Rata-rata / Sedang
  if (clean === 'S' || clean === 'C' || clean === 'SEDANG' || clean.includes('RATA-RATA') || clean.includes('RATA2') || clean.includes('RATARATA')) {
    return 4; // R
  }
  // 6. Kurang / Rendah
  if (clean === 'R' || clean === 'K' || clean.includes('RENDAH') || clean.includes('KURANG')) {
    return 2; // K
  }
  // 7. Baik / Tinggi
  if (clean === 'T' || clean === 'B' || clean.includes('TINGGI') || clean.includes('BAIK')) {
    return 6; // B
  }

  return 4;
};

/**
 * Konversi kategori dan skor (maksimal 20) untuk Aspek Intelektual Staf:
 * (Pemahaman Verbal, Analisa-Sintesa, Kemampuan Numerik).
 * 
 * Mempertimbangkan kategori 5 taraf (SR, R, S, T, ST) bersama skor (skala 0-20):
 * - Jika kategori R (Rendah):
 *   - Jika skor masih lumayan (skor >= 6, misal 6-7): menjadi RB (3), bukan K
 *   - Jika di ranah rendah (skor 4-5): menjadi K (2)
 *   - Jika di ranah sangat rendah (skor <= 3): menjadi KS (1)
 * - Jika kategori S (Sedang / Rata-rata):
 *   - Jika skor berada di ranah atas (skor >= 12, misal 12-13): menjadi RA (5)
 *   - Jika skor rata-rata normal (skor 8-11): menjadi R (4)
 *   - Jika skor di ranah bawah (skor <= 7): menjadi RB (3)
 * - Jika kategori T (Tinggi / Baik):
 *   - Jika skor 12-13: menjadi RA (5)
 *   - Jika skor >= 14: menjadi B (6)
 * - Jika kategori ST (Sangat Tinggi) atau skor >= 16: menjadi BS (7)
 * - Jika kategori SR (Sangat Rendah) atau skor <= 3: menjadi KS (1)
 */
export const convertStaffAspectWithScore = (
  category: string | undefined | null,
  score: number | string | undefined | null
): ScaleLevel => {
  const numScore = score === '' || score === undefined || score === null ? NaN : Number(score);
  const cleanCat = (category || '').trim().toUpperCase();

  // 1. Kategori eksplisit 7 skala (KS, RB, RA, BS)
  if (cleanCat === 'KS' || cleanCat.includes('KURANG SEKALI')) return 1;
  if (cleanCat === 'BS' || cleanCat.includes('BAIK SEKALI')) return 7;
  if (cleanCat === 'RB' || cleanCat.includes('RATA-RATA BAWAH') || cleanCat.includes('RATA2 BAWAH')) return 3;
  if (cleanCat === 'RA' || cleanCat.includes('RATA-RATA ATAS') || cleanCat.includes('RATA2 ATAS')) return 5;

  // 2. Evaluasi kombinasi skor numerik (maksimal 20) dan kategori
  if (!isNaN(numScore)) {
    const s = Math.round(numScore);

    // Kategori R (Rendah)
    if (cleanCat === 'R' || cleanCat.includes('RENDAH') || cleanCat === 'K' || cleanCat.includes('KURANG')) {
      if (s >= 6) return 3; // RB (skor masih lumayan, 6-7 menjadi RB bukan K)
      if (s >= 4) return 2; // K (ranah rendah 4-5 menjadi K)
      return 1;             // KS (ranah sangat rendah <= 3)
    }

    // Kategori S (Sedang / Rata-rata)
    if (cleanCat === 'S' || cleanCat.includes('SEDANG') || cleanCat.includes('RATA-RATA')) {
      if (s >= 12) return 5; // RA (sedang di ranah atas)
      if (s <= 7) return 3;  // RB (sedang di ranah bawah)
      return 4;              // R (8-11)
    }

    // Kategori T (Tinggi / Baik)
    if (cleanCat === 'T' || cleanCat.includes('TINGGI') || cleanCat === 'B' || cleanCat.includes('BAIK')) {
      if (s >= 16) return 7; // BS (skor sangat tinggi >= 16)
      if (s >= 14) return 6; // B (14-15)
      return 5;              // RA (12-13)
    }

    // Kategori ST (Sangat Tinggi)
    if (cleanCat === 'ST' || cleanCat.includes('SANGAT TINGGI')) {
      return 7; // BS
    }

    // Kategori SR (Sangat Rendah)
    if (cleanCat === 'SR' || cleanCat.includes('SANGAT RENDAH')) {
      return 1; // KS
    }

    // Jika tanpa kategori teks, gunakan norma IST standar 0-20:
    if (s >= 16) return 7; // BS
    if (s >= 14) return 6; // B
    if (s >= 12) return 5; // RA
    if (s >= 8) return 4;  // R
    if (s >= 6) return 3;  // RB
    if (s >= 4) return 2;  // K
    return 1;              // KS
  }

  // 3. Fallback jika skor kosong/tidak ada, gunakan konversi murni kategori
  return convertCategoryToStaffScale(category);
};

/**
 * Pemetaan Skor Standar IST (Standard Wert / SW) ke skala 1-7 (KS, K, RB, R, RA, B, BS)
 * Rata-rata normatif IST = 10, SD = 3:
 * SW >= 16 : Baik Sekali (BS = 7)
 * SW 14-15: Baik (B = 6)
 * SW 12-13: Rata-rata Atas (RA = 5)
 * SW 8-11 : Rata-rata (R = 4)
 * SW 6-7  : Rata-rata Bawah (RB = 3)
 * SW 4-5  : Kurang (K = 2)
 * SW <= 3 : Kurang Sekali (KS = 1)
 */
export const mapISTSubscoreToLevel = (score: number | string | undefined | null): ScaleLevel => {
  if (score === undefined || score === null || score === '') return 4;
  const s = Math.round(Number(score));
  if (isNaN(s)) return 4;
  if (s >= 16) return 7; // BS (Baik Sekali)
  if (s >= 14) return 6; // B (Baik)
  if (s >= 12) return 5; // RA (Rata-rata Atas)
  if (s >= 8) return 4;  // R (Rata-rata)
  if (s >= 6) return 3;  // RB (Rata-rata Bawah)
  if (s >= 4) return 2;  // K (Kurang)
  return 1;              // KS (Kurang Sekali)
};

/**
 * Perhitungan Berpikir Sistematis IST (Subtes ZR / Zahlenreihen - Deret Angka)
 */
export const calculateISTBerpikirSistematis = (zr: number | string | undefined | null): ScaleLevel => {
  return mapISTSubscoreToLevel(zr);
};

/**
 * Perhitungan Pemahaman Konsep IST sesuai Guide Interpreter Brilian Psikologi
 * Rumus Daya Paham: (AN + ZR) / 2
 */
export const calculateISTPemahamanKonsep = (
  an: number | string | undefined | null,
  zr: number | string | undefined | null
): ScaleLevel => {
  const anVal = an === '' || an === undefined || an === null ? NaN : Number(an);
  const zrVal = zr === '' || zr === undefined || zr === null ? NaN : Number(zr);

  if (isNaN(anVal) && isNaN(zrVal)) return 4;
  if (!isNaN(anVal) && isNaN(zrVal)) return mapISTSubscoreToLevel(anVal);
  if (isNaN(anVal) && !isNaN(zrVal)) return mapISTSubscoreToLevel(zrVal);

  const avg = (anVal + zrVal) / 2;
  return mapISTSubscoreToLevel(avg);
};

/**
 * Perhitungan Berpikir Sistematis sesuai Guide Interpreter Brilian Psikologi (CFIT Subtes 1)
 * Range:
 * Nilai benar 2-1 (dan 0) : kurang sekali (KS = 1)
 * Nilai benar 4-3         : Kurang (K = 2)
 * Nilai benar 6-5         : rata-rata bawah (RB = 3)
 * Nilai benar 7-8         : rata-rata (R = 4)
 * Nilai benar 9-10        : rata2 atas (RA = 5)
 * Nilai benar 11-12       : baik (B = 6)
 * Nilai benar 13          : baik sekali (BS = 7)
 */
export const calculateGuideBerpikirSistematis = (score: number | string | undefined | null): ScaleLevel => {
  if (score === undefined || score === null || score === '') return 4;
  const s = Math.round(Number(score));
  if (isNaN(s)) return 4;

  if (s >= 13) return 7; // BS (Baik Sekali)
  if (s >= 11) return 6; // B (Baik)
  if (s >= 9) return 5;  // RA (Rata-rata Atas)
  if (s >= 7) return 4;  // R (Rata-rata)
  if (s >= 5) return 3;  // RB (Rata-rata Bawah)
  if (s >= 3) return 2;  // K (Kurang)
  return 1;              // KS (Kurang Sekali)
};

/**
 * Perhitungan Pemahaman Konsep sesuai Guide Interpreter Brilian Psikologi (CFIT Subtes 4)
 * Range:
 * Nilai benar 0-1 : kurang sekali (KS = 1)
 * Nilai benar 2-3 : kurang (K = 2)
 * Nilai benar 4   : rata-rata bawah (RB = 3)
 * Nilai benar 5   : rata-rata (R = 4)
 * Nilai benar 6   : rata-rata atas (RA = 5)
 * Nilai benar 7-8 : baik (B = 6)
 * Nilai benar 9-10: baik sekali (BS = 7)
 */
export const calculateGuidePemahamanKonsep = (score: number | string | undefined | null): ScaleLevel => {
  if (score === undefined || score === null || score === '') return 4;
  const s = Math.round(Number(score));
  if (isNaN(s)) return 4;

  if (s >= 9) return 7; // BS (Baik Sekali)
  if (s >= 7) return 6; // B (Baik)
  if (s === 6) return 5; // RA (Rata-rata Atas)
  if (s === 5) return 4; // R (Rata-rata)
  if (s === 4) return 3; // RB (Rata-rata Bawah)
  if (s >= 2) return 2;  // K (Kurang)
  return 1;              // KS (Kurang Sekali)
};

export const getStaffScaleCode = (level: number): string => {
  const codes = ['KS', 'K', 'RB', 'R', 'RA', 'B', 'BS'];
  return codes[level - 1] || 'R';
};

export const getStaffScaleFullLabel = (level: number): string => {
  const fulls = [
    'Kurang Sekali (KS)',
    'Kurang (K)',
    'Rata-rata Bawah (RB)',
    'Rata-rata (R)',
    'Rata-rata Atas (RA)',
    'Baik (B)',
    'Baik Sekali (BS)'
  ];
  return fulls[level - 1] || 'Rata-rata (R)';
};

