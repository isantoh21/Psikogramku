export type ScaleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ScaleLabel = 'SR' | 'R' | 'C-' | 'C' | 'C+' | 'T' | 'ST';

export interface ClientData {
  fullName: string;
  school: string;
  dob: string;
  ageDob?: string; // For backward compatibility
  testDate: string;
  reportNumber: string;
}

export interface IstScores {
  iq: number | '';
  SE: number | '';
  WA: number | '';
  AN: number | '';
  GE: number | '';
  ME: number | '';
  RA: number | '';
  ZR: number | '';
  FA: number | '';
  WU: number | '';
}

export interface PersonalityScores {
  stabilitasEmosi: ScaleLevel;
  motivasi: ScaleLevel;
  kepercayaanDiri: ScaleLevel;
  penyesuaianDiri: ScaleLevel;
  kerjaSama: ScaleLevel;
}

export interface Interest {
  name: string;
  description: string;
}

export interface AppState {
  clientData: ClientData;
  istScores: IstScores;
  personalityScores: PersonalityScores;
  interests: Interest[];
  learningStyle: 'Visual' | 'Auditori' | 'Kinestetik' | '';
  recommendation: string;
}

export interface SdClientData {
  nama: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan' | '';
  tanggalTes: string;
}

export interface SdKecerdasanUmum {
  pemahaman: ScaleLevel;
  penalaran: ScaleLevel;
  dayaAnalisis: ScaleLevel;
  dayaSintesis: ScaleLevel;
  dayaIngat: ScaleLevel;
}

export interface SdBakatKemampuan {
  sistematikaBerpikir: ScaleLevel;
  logikaHubungan: ScaleLevel;
  ketajamanDiferensiasi: ScaleLevel;
}

export interface SdCfitScores {
  sub1: number | '';
  sub2: number | '';
  sub3: number | '';
  sub4: number | '';
}

export interface SdAppState {
  clientData: SdClientData;
  iqScore: number | '';
  cfitScores: SdCfitScores;
  kecerdasanUmum: SdKecerdasanUmum;
  bakatKemampuan: SdBakatKemampuan;
  kepribadian: PersonalityScores;
  interests: Interest[];
  learningStyle: 'Visual' | 'Auditori' | 'Kinestetik' | '';
  rekomendasi: string;
}

export const INITIAL_STATE: AppState = {
  clientData: {
    fullName: '',
    school: '',
    dob: '',
    testDate: '',
    reportNumber: '',
  },
  istScores: {
    iq: '',
    SE: '',
    WA: '',
    AN: '',
    GE: '',
    ME: '',
    RA: '',
    ZR: '',
    FA: '',
    WU: '',
  },
  personalityScores: {
    stabilitasEmosi: 4,
    motivasi: 4,
    kepercayaanDiri: 4,
    penyesuaianDiri: 4,
    kerjaSama: 4,
  },
  interests: [
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
  ],
  learningStyle: '',
  recommendation: '',
};

export interface StaffClientData {
  nama: string;
  tempatTglLahir: string;
  pendidikan: string;
  alamat: string;
  nomor: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan' | '';
  tujuanPemeriksaan: string;
  tanggalTes: string;
  namaPT: string;
}

export interface StaffIntelektual {
  potensiKecerdasan: ScaleLevel;
  berpikirSistematis: ScaleLevel;
  pemahamanVerbal: ScaleLevel;
  analisaSintesa: ScaleLevel;
  pemahamanKonsep: ScaleLevel;
  kemampuanNumerik: ScaleLevel;
}

export interface StaffSikapKerja {
  kecepatan: ScaleLevel;
  ketelitian: ScaleLevel;
  ketekunan: ScaleLevel;
  dayaTahanStres: ScaleLevel;
}

export interface StaffKepribadian {
  kematanganEmosi: ScaleLevel;
  kemasakanSosial: ScaleLevel;
  rasaPercayaDiri: ScaleLevel;
  motivasiBerprestasi: ScaleLevel;
  sikapMandiri: ScaleLevel;
  inisiatif: ScaleLevel;
  kemampuanBekerjasama: ScaleLevel;
  keterampilanBerkomunikasi: ScaleLevel;
  loyalitas: ScaleLevel;
}

export interface StaffAppState {
  clientData: StaffClientData;
  iqScore: number | '';
  iqLabel: string;
  istSubscores?: {
    SE: number | '';
    WA: number | '';
    AN: number | '';
    GE: number | '';
    ME: number | '';
    RA: number | '';
    ZR: number | '';
    FA: number | '';
    WU: number | '';
  };
  aspekScores?: {
    pemahamanVerbal: number | '';
    analisaSintesa: number | '';
    kemampuanNumerik: number | '';
  };
  aspekKategori?: {
    pemahamanVerbal: string;
    analisaSintesa: string;
    kemampuanNumerik: string;
  };
  intelektual: StaffIntelektual;
  sikapKerja: StaffSikapKerja;
  kepribadian: StaffKepribadian;
  dinamikaPsikologis: string;
}

export const INITIAL_STAFF_STATE: StaffAppState = {
  clientData: {
    nama: '',
    tempatTglLahir: '',
    pendidikan: '',
    alamat: '',
    nomor: '',
    jenisKelamin: '',
    tujuanPemeriksaan: '',
    tanggalTes: '',
    namaPT: '',
  },
  iqScore: '',
  iqLabel: '',
  istSubscores: {
    SE: '',
    WA: '',
    AN: '',
    GE: '',
    ME: '',
    RA: '',
    ZR: '',
    FA: '',
    WU: '',
  },
  aspekScores: {
    pemahamanVerbal: '',
    analisaSintesa: '',
    kemampuanNumerik: '',
  },
  aspekKategori: {
    pemahamanVerbal: '',
    analisaSintesa: '',
    kemampuanNumerik: '',
  },
  intelektual: {
    potensiKecerdasan: 4,
    berpikirSistematis: 4,
    pemahamanVerbal: 4,
    analisaSintesa: 4,
    pemahamanKonsep: 4,
    kemampuanNumerik: 4,
  },
  sikapKerja: {
    kecepatan: 4,
    ketelitian: 4,
    ketekunan: 4,
    dayaTahanStres: 4,
  },
  kepribadian: {
    kematanganEmosi: 4,
    kemasakanSosial: 4,
    rasaPercayaDiri: 4,
    motivasiBerprestasi: 4,
    sikapMandiri: 4,
    inisiatif: 4,
    kemampuanBekerjasama: 4,
    keterampilanBerkomunikasi: 4,
    loyalitas: 4,
  },
  dinamikaPsikologis: '',
};

export interface ManagerKepemimpinan {
  kepemimpinan: ScaleLevel;
  tanggungjawab: ScaleLevel;
  pengambilanKeputusan: ScaleLevel;
  pengembanganKaryawan: ScaleLevel;
}

export interface ManagerSikapKerja {
  kecepatan: ScaleLevel;
  ketelitian: ScaleLevel;
  ketekunan: ScaleLevel;
  dayaTahanStres: ScaleLevel;
  orientasiCustomer?: ScaleLevel;
}

export interface ManagerAppState {
  clientData: StaffClientData;
  iqScore: number | '';
  iqLabel: string;
  istSubscores?: {
    SE: number | '';
    WA: number | '';
    AN: number | '';
    GE: number | '';
    ME: number | '';
    RA: number | '';
    ZR: number | '';
    FA: number | '';
    WU: number | '';
  };
  aspekScores?: {
    pemahamanVerbal: number | '';
    analisaSintesa: number | '';
    kemampuanNumerik: number | '';
  };
  aspekKategori?: {
    pemahamanVerbal: string;
    analisaSintesa: string;
    kemampuanNumerik: string;
  };
  intelektual: StaffIntelektual;
  sikapKerja: ManagerSikapKerja;
  kepribadian: StaffKepribadian;
  kepemimpinan: ManagerKepemimpinan;
  dinamikaPsikologis: string;
  msdtDetails?: Record<string, string>;
}

export const INITIAL_MANAGER_STATE: ManagerAppState = {
  clientData: {
    nama: '',
    tempatTglLahir: '',
    pendidikan: '',
    alamat: '',
    nomor: '',
    jenisKelamin: '',
    tujuanPemeriksaan: '',
    tanggalTes: '',
    namaPT: '',
  },
  iqScore: '',
  iqLabel: '',
  istSubscores: {
    SE: '',
    WA: '',
    AN: '',
    GE: '',
    ME: '',
    RA: '',
    ZR: '',
    FA: '',
    WU: '',
  },
  aspekScores: {
    pemahamanVerbal: '',
    analisaSintesa: '',
    kemampuanNumerik: '',
  },
  aspekKategori: {
    pemahamanVerbal: '',
    analisaSintesa: '',
    kemampuanNumerik: '',
  },
  intelektual: {
    potensiKecerdasan: 4,
    berpikirSistematis: 4,
    pemahamanVerbal: 4,
    analisaSintesa: 4,
    pemahamanKonsep: 4,
    kemampuanNumerik: 4,
  },
  sikapKerja: {
    kecepatan: 4,
    ketelitian: 4,
    ketekunan: 4,
    dayaTahanStres: 4,
    orientasiCustomer: 4,
  },
  kepribadian: {
    kematanganEmosi: 4,
    kemasakanSosial: 4,
    rasaPercayaDiri: 4,
    motivasiBerprestasi: 4,
    sikapMandiri: 4,
    inisiatif: 4,
    kemampuanBekerjasama: 4,
    keterampilanBerkomunikasi: 4,
    loyalitas: 4,
  },
  kepemimpinan: {
    kepemimpinan: 4,
    tanggungjawab: 4,
    pengambilanKeputusan: 4,
    pengembanganKaryawan: 4,
  },
  dinamikaPsikologis: '',
  msdtDetails: {},
};

export const INITIAL_SD_STATE: SdAppState = {
  clientData: {
    nama: '',
    tanggalLahir: '',
    jenisKelamin: '',
    tanggalTes: '',
  },
  iqScore: '',
  cfitScores: {
    sub1: '',
    sub2: '',
    sub3: '',
    sub4: '',
  },
  kecerdasanUmum: {
    pemahaman: 4,
    penalaran: 4,
    dayaAnalisis: 4,
    dayaSintesis: 4,
    dayaIngat: 4,
  },
  bakatKemampuan: {
    sistematikaBerpikir: 4,
    logikaHubungan: 4,
    ketajamanDiferensiasi: 4,
  },
  kepribadian: {
    stabilitasEmosi: 4,
    motivasi: 4,
    kepercayaanDiri: 4,
    penyesuaianDiri: 4,
    kerjaSama: 4,
  },
  interests: [
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
  ],
  learningStyle: '',
  rekomendasi: '',
};

export interface StaffAluCfitScores {
  sub1: number | ''; // Subtes 1: Berpikir sistematis (0-13)
  sub2: number | ''; // Subtes 2: Berpikir kritis (0-14)
  sub3: number | ''; // Subtes 3: Analisa-sintesa (0-13)
  sub4: number | ''; // Subtes 4: Pemahaman konsep (0-10)
  totalScore?: number | '';
}

export interface StaffAluTkdScores {
  sub3: number | ''; // Subtes 3: Pemahaman verbal, logika berpikir, daya abstraksi (SS 0-20)
  sub5: number | ''; // Subtes 5: Kemampuan berhitung, ketelitian (SS 0-20)
  sub7: number | ''; // Subtes 7: Kemampuan berpikir analogi, berpikir kritis (SS 0-20)
}

export interface StaffAluAppState {
  clientData: StaffClientData;
  iqScore: number | '';
  iqLabel: string;
  cfitScores: StaffAluCfitScores;
  tkdScores: StaffAluTkdScores;
  aspekScores?: {
    berpikirSistematis: number | '';
    pemahamanVerbal: number | '';
    analisaSintesa: number | '';
    pemahamanKonsep: number | '';
    kemampuanNumerik: number | '';
  };
  aspekKategori?: {
    berpikirSistematis: string;
    pemahamanVerbal: string;
    analisaSintesa: string;
    pemahamanKonsep: string;
    kemampuanNumerik: string;
  };
  intelektual: StaffIntelektual;
  sikapKerja: StaffSikapKerja;
  kepribadian: StaffKepribadian;
  dinamikaPsikologis: string;
}

export const INITIAL_STAFF_ALU_STATE: StaffAluAppState = {
  clientData: {
    nama: '',
    tempatTglLahir: '',
    pendidikan: '',
    alamat: '',
    nomor: '',
    jenisKelamin: '',
    tujuanPemeriksaan: '',
    tanggalTes: '',
    namaPT: 'PT. ALAM LESTARI UNGGUL',
  },
  iqScore: '',
  iqLabel: '',
  cfitScores: {
    sub1: '',
    sub2: '',
    sub3: '',
    sub4: '',
    totalScore: '',
  },
  tkdScores: {
    sub3: '',
    sub5: '',
    sub7: '',
  },
  aspekScores: {
    berpikirSistematis: '',
    pemahamanVerbal: '',
    analisaSintesa: '',
    pemahamanKonsep: '',
    kemampuanNumerik: '',
  },
  aspekKategori: {
    berpikirSistematis: '',
    pemahamanVerbal: '',
    analisaSintesa: '',
    pemahamanKonsep: '',
    kemampuanNumerik: '',
  },
  intelektual: {
    potensiKecerdasan: 4,
    berpikirSistematis: 4,
    pemahamanVerbal: 4,
    analisaSintesa: 4,
    pemahamanKonsep: 4,
    kemampuanNumerik: 4,
  },
  sikapKerja: {
    kecepatan: 4,
    ketelitian: 4,
    ketekunan: 4,
    dayaTahanStres: 4,
  },
  kepribadian: {
    kematanganEmosi: 4,
    kemasakanSosial: 4,
    rasaPercayaDiri: 4,
    motivasiBerprestasi: 4,
    sikapMandiri: 4,
    inisiatif: 4,
    kemampuanBekerjasama: 4,
    keterampilanBerkomunikasi: 4,
    loyalitas: 4,
  },
  dinamikaPsikologis: '',
};

