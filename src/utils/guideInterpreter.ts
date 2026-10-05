import { ScaleLevel, StaffIntelektual, StaffSikapKerja, StaffKepribadian, ManagerKepemimpinan, ManagerSikapKerja } from '../types';

/**
 * Guide Interpreter Brilian Psikologi
 * Menghasilkan teks Dinamika Psikologis resmi sesuai dokumen pedoman interpreter PDF
 */

export interface GuideInterpreterInput {
  nama: string;
  iqScore: number | '';
  iqLabel: string;
  intelektual: StaffIntelektual;
  sikapKerja: StaffSikapKerja | ManagerSikapKerja;
  kepribadian: StaffKepribadian;
  kepemimpinan?: ManagerKepemimpinan;
}

export function generateGuideDinamikaPsikologis({
  nama,
  iqScore,
  iqLabel,
  intelektual,
  sikapKerja,
  kepribadian,
  kepemimpinan
}: GuideInterpreterInput): string {
  const clientName = nama ? nama.trim() : 'Subjek';
  const firstName = clientName.split(/\s+/)[0] || clientName;
  const initial = clientName
    .split(/\s+/)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');

  // ----------------------------------------------------
  // PARAGRAF 1: ASPEK INTELEKTUAL (Halaman 1 - 3 PDF)
  // ----------------------------------------------------
  const iqNum = typeof iqScore === 'number' ? iqScore : 100;
  const iqCategory = iqLabel || (iqNum >= 130 ? 'Very Superior' : iqNum >= 120 ? 'Superior' : iqNum >= 110 ? 'Rata-rata Atas' : iqNum >= 90 ? 'Rata-rata' : iqNum >= 80 ? 'Rata-rata Bawah' : iqNum >= 70 ? 'Borderline' : 'Intellectual Deficient');

  let p1Narrative = '';

  if (iqNum >= 120) {
    p1Narrative = `Saudara/Saudari ${firstName} (${initial}) memiliki kapasitas intelektual yang berada pada kategori ${iqCategory}. Aspek intelektualnya sangat berkembang dengan optimal. Kemampuan analisa dan logikanya tergolong sangat tajam, terarah, dan teratur. Ia mampu menggali akar masalah secara mendalam, memahami rangkaian persoalan secara sistematis, serta menghasilkan solusi yang efektif dan strategis untuk menyelesaikan permasalahan yang kompleks. Di samping itu, kemampuan verbal dan daya abstraksinya berkembang dengan sangat baik, sehingga ia dapat menyimak instruksi baru dengan cepat serta mengomunikasikannya kembali secara jelas, persuasif, dan terstruktur. Begitu pula ketika menghadapi tugas yang berhubungan dengan hitungan atau data angka, ia dapat menyelesaikannya dengan baik, akurat, dan cermat.`;
  } else if (iqNum >= 90) {
    // Exact text from PDF Page 2 - 3 (Aspek kecerdasan rata-rata)
    p1Narrative = `Saudara/Saudari ${firstName} (${initial}) memiliki kapasitas intelektual yang berada pada kategori ${iqCategory}. Ia mampu memahami, menggali akar masalah, serta menghasilkan solusi untuk menyelesaikan permasalahan tingkat menengah. Disamping itu, aspek intelektualnya sangat berkembang dengan baik. Ia dapat menyimak, memahami instruksi yang diberikan, serta selanjutnya merespon ataupun mengungkapkannya kembali dengan jelas. Ia juga mampu membangun atau menciptakan komunikasi yang persuasif dan efektif dalam berinteraksi dengan orang lain. Kemampuan analisanya tergolong tajam dan membantunya dalam menguraikan secara detil dan terperinci serta menarik kesimpulan tentang permasalahan yang dihadapinya. Logika berpikirnya cukup terarah dan teratur. Ia mampu mempelajari dan memecahkan hal-hal yang tergolong baru serta kompleks untuk kemudian digunakan sebagai bahan mengambil keputusan dalam memecahkan masalah sosial sehari-hari sesuai kondisi yang ada. Pengetahuan dan kemampuan yang berkaitan dengan teknik mekanik yang dimiliki juga tergolong memadai. Begitu juga ketika menghadapi tugas yang berhubungan dengan hitungan atau data angka, ia dapat menyelesaikannya dengan baik.`;
  } else if (iqNum >= 80) {
    // Exact text from PDF Page 3 (Rata-rata bawah)
    p1Narrative = `Saudara/Saudari ${firstName} (${initial}) memiliki kapasitas intelektual yang berada dibatas bawah rata-rata orang pada umumnya (${iqCategory}). Hanya saja, aspek kecerdasan yang dimiliki masih kurang berkembang optimal. Kemampuan analisa dan logikanya kurang begitu memadai. Ia lamban dalam berpikir, cenderung menganalisa masalah dari sudut pandang yang terbatas sehingga kurang mampu menguraikan dan menarik kesimpulan tentang permasalahan yang dihadapinya. Ia cenderung kesulitan dalam memecahkan masalah sehari-hari atau sosial praktis, hanya mampu mengatasi masalah yang sifatnya sederhana serta membutuhkan waktu dalam upaya mengambil keputusan dengan cepat dan tepat sesuai kondisi yang ada. Ketika menghadapi tugas yang berhubungan dengan hitungan atau data angka, ia seringkali menemui kesulitan dan membutuhkan alat bantu hitung agar hasilnya lebih akurat. Meski demikian, ia masih dapat menyimak, memahami instruksi yang diberikan, serta selanjutnya merespon ataupun mengungkapkannya kembali dengan jelas. Ia juga mampu membangun atau menciptakan komunikasi yang persuasif dan efektif dalam berinteraksi dengan orang lain.`;
  } else {
    p1Narrative = `Saudara/Saudari ${firstName} (${initial}) memiliki kapasitas intelektual yang berada pada kategori ${iqCategory}. Aspek kecerdasan yang dimiliki masih terbatas dan membutuhkan pendampingan yang intensif dalam menyelesaikan tugas-tugas konseptual. Ia memerlukan instruksi kerja yang sangat sederhana, konkret, dan terperinci untuk dapat memahami arahan dengan baik. Dalam menghadapi persoalan sehari-hari, ia membutuhkan waktu yang lebih panjang untuk mencerna informasi dan mengambil keputusan secara bertahap.`;
  }

  // ----------------------------------------------------
  // PARAGRAF 2: ASPEK SIKAP KERJA (Halaman 3 - 6 PDF)
  // ----------------------------------------------------
  const panker = sikapKerja.kecepatan;
  const tianker = sikapKerja.ketelitian;
  const janker = sikapKerja.ketekunan;
  const hanker = sikapKerja.dayaTahanStres;

  const isKurangPanker = panker <= 3;
  const isKurangTianker = tianker <= 3;
  const isKurangJanker = janker <= 3;
  const isKurangHanker = hanker <= 3;

  let p2Narrative = '';

  if (isKurangPanker && isKurangTianker && isKurangJanker && isKurangHanker) {
    // Kurang semua aspek (Hal 6)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} masih kurang memadai di semua aspek. Ia terlihat kurang memiliki energi dalam bekerja sehingga membuat produktifitasnya menjadi kurang optimal. Ia lambat dalam bekerja serta nampak kurang cekatan. Cara kerjanya juga tidak teliti, sehingga banyak menyisakan pengerjaan yang tidak tepat. Ketekunannya juga kurang, mudah menyerah saat menghadapi kesulitan, dan kurang betah dengan situasi yang monoton. Saat mendapat situasi yang menekan, ia juga kurang tahan sehingga performa kerjanya cenderung menurun. Berdasarkan sikap kerja seperti ini, ada kemungkinan bahwa ia cenderung kurang adaptif.`;
  } else if (!isKurangPanker && !isKurangTianker && !isKurangJanker && !isKurangHanker) {
    // Cukup semua aspek (Hal 6)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} cukup memadai di semua aspek. Ia tergolong teliti, cukup cepat dan cekatan dalam melakukan sesuatu. Ia juga cukup tekun serta memiliki daya tahan terhadap stress yang cukup baik sehingga performa kerjanya cenderung stabil meski berada pada situasi yang monoton ataupun menekan. Hal ini tentu akan membuat produktifitasnya cenderung optimal.`;
  } else if (isKurangPanker && isKurangTianker && isKurangJanker) {
    // Kurang cepat, tekun dan teliti (Hal 5)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} memiliki daya tahan terhadap stres yang cukup memadai sehingga performa kerjanya cenderung stabil meski berada disituasi yang menekan. Hanya saja, hal ini kurang didukung oleh sikap kerjanya yang lain. Ia terlihat kurang memiliki energi dalam bekerja sehingga membuat produktifitasnya menjadi kurang optimal. Ia lambat dalam bekerja serta nampak kurang cekatan. Cara kerjanya juga tidak teliti, sehingga banyak menyisakan pengerjaan yang tidak tepat. Ketekunannya juga kurang, mudah menyerah saat menghadapi kesulitan, dan kurang betah dengan situasi yang monoton dan membuat produktifitas kerjanya menjadi kurang maksimal.`;
  } else if (isKurangPanker && isKurangTianker && isKurangHanker) {
    // Kurang cepat, teliti, dan stress (Hal 5)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} masih kurang memadai hampir di semua aspek membuat produktifitasnya cenderung kurang optimal. Ia lamban dan kurang cekatan dalam melakukan sesuatu, hasil kerjanya juga cenderung kurang teliti. Hal ini dapat pula disebabkan oleh daya tahan terhadap stres yang rendah. Meski demikian, ia tergolong cukup tekun dan tidak mudah bosan meski harus menyelesaikan tugas di situasi yang monoton.`;
  } else if (isKurangPanker && isKurangJanker && isKurangHanker) {
    // Kurang cepat, tekun dan stress (Hal 5)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} tergolong cukup teliti dalam melakukan sesuatu. Ia cenderung hati-hati dan mengharapakan hasil kerja yang akurat. Namun hal ini berdampak pada cara kerjanya, ia menjadi lamban dan kurang cekatan dalam melakukan sesuatu. Disamping itu, ia juga kurang tekun, mudah bosan pada situasi kerja atau tugas yang monoton serta kurang memiliki daya tahan terhadap stres yang memadai sehingga performa kerjanya cenderung labil dan membuat produktifitas kerjanya menjadi kurang maksimal.`;
  } else if (isKurangTianker && isKurangJanker && isKurangHanker) {
    // Kurang teliti, tekun dan stress (Hal 4 - 5)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} yang kurang memadai hampir di semua aspek membuat produktifitasnya cenderung kurang optimal. Ia cenderung kurang teliti, kurang tekun dan mudah bosan pada hal-hal yang monoton serta memiliki daya tahan terhadap stres yang rendah. Meski demikian ia cukup cepat dan cekatan dalam melakukan pekerjaannya.`;
  } else if (isKurangPanker && isKurangTianker) {
    // Kurang cepat dan Teliti (Hal 4)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} merupakan orang yang tekun dan memiliki daya tahan terhadap stress yang memadai sehingga performa kerja atau prestasinya cenderung stabil meski berada pada situasi yang monoton ataupun menekan. Hanya saja, ia cenderung ceroboh, lamban dan kurang cekatan dalam melakukan pekerjaan atau tugasnya sehingga hasil kerjanya kurang maksimal.`;
  } else if (isKurangPanker && isKurangJanker) {
    // Kurang cepat dan tekun (Hal 5)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} tergolong teliti dan memiliki daya tahan terhadap stress yang memadai sehingga performa kerja atau prestasinya cenderung stabil meski berada pada situasi yang menekan. Ia cenderung hati-hati dan mengharapkan hasil kerja yang akurat. Namun hal ini berdampak pada cara kerjanya, ia menjadi lamban dan kurang cekatan dalam melakukan sesuatu. Ia terlihat kurang memiliki energi dalam bekerja sehingga membuat produktifitasnya menjadi kurang optimal. Ketekunannya juga kurang, mudah menyerah saat menghadapi kesulitan, dan kurang betah dengan situasi yang monoton.`;
  } else if (isKurangPanker && isKurangHanker) {
    // Kurang cepat dan stress (Hal 5)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} tergolong teliti dan cukup tekun dalam melakukan sesuatu. Ia cenderung hati-hati dan mengharapkan hasil kerja yang akurat. Namun hal ini berdampak pada cara kerjanya, ia menjadi lamban dan kurang cekatan dalam melakukan sesuatu. Disamping itu, ia juga kurang memiliki daya tahan terhadap stres yang memadai sehingga performa kerjanya cenderung labil dan membuat produktifitas kerjanya menjadi kurang maksimal.`;
  } else if (isKurangTianker && isKurangJanker) {
    // Kurang teliti dan tekun (Hal 4)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} tergolong cukup cekatan dalam melakukan sesuatu serta memiliki daya tahan terhadap stress yang baik. Hanya saja, ia kurang tekun dan mudah bosan bekerja disituasi yang monoton. Ia memerlukan waktu istirahat disela-sela ia mengerjakan tugasnya. Disamping itu, cara kerjanya cenderung buru-buru, ceroboh dan kurang teliti sehingga hasil kerjanya kurang maksimal. Hal ini tentunya kan menghambat produktifitasnya.`;
  } else if (isKurangTianker && isKurangHanker) {
    // Kurang teliti dan stress (Hal 4)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} tergolong tekun dan cekatan dalam melakukan sesuatu. Namun cara kerjanya cenderung buru-buru sehingga hasil kerjanya menjadi kurang teliti. Hal ini dapat pula dipengaruhi oleh stabilitas emosi serta daya tahan terhadap stres yang rendah yang menyebabkan performa atau prestasi kerjanya cenderung labil.`;
  } else if (isKurangJanker && isKurangHanker) {
    // Tekun dan Stress (Hal 6)
    p2Narrative = `Sikap kerja yang dimiliki saudara/saudari ${firstName} cukup cepat dan cekatan dalam melakukan pekerjaannya. Meski demikian, ia cenderung teliti, berhati-hati dan menghindari kesalahan yang mungkin dapat dilakukan dalam menjalankan tugasnya. Hanya saja, ia kurang tekun, mudah menyerah saat menghadapi kesulitan, dan kurang betah dengan situasi yang monoton. Disamping itu, ketika mendapat situasi yang menekan, ia juga kurang tahan sehingga performa kerjanya cenderung menurun.`;
  } else if (isKurangPanker) {
    // Kurang Cepat (Hal 4)
    p2Narrative = `Didukung oleh sikap kerja yang cukup memadai hampir disemua aspek, membuat performanya cenderung stabil. Ia cukup teliti dan tekun dalam mengerjakan tugasnya. Ia tidak mudah bosan bekerja disituasi yang monoton serta memiliki daya tahan terhadap stress yang cukup baik. Hanya saja, ia cenderung mengharapkan kesempurnaan atas hasil kerjanya, sehingga cara kerjanya menjadi lamban dan kurang cekatan. Hal ini tentunya kan menghambat produktifitasnya.`;
  } else if (isKurangTianker) {
    // Kurang Teliti (Hal 4)
    p2Narrative = `Didukung oleh sikap kerja yang cukup memadai hampir disemua aspek, membuat performanya cenderung stabil. Ia tergolong cepat, cekatan dalam mengerjakan tugasnya. Ia juga cukup tekun, tidak mudah merasa bosan serta memiliki daya tahan terhadap stress yang cukup baik meski harus bekerja dibawah tekanan maupun situasi yang monoton sehingga performa kerjanya cenderung stabil. Hanya saja, ia cenderung terburu-buru, ceroboh dan kurang teliti sehingga hasil kerjanya kurang maksimal.`;
  } else if (isKurangJanker) {
    // Kurang tekun (Hal 4)
    p2Narrative = `Didukung oleh sikap kerja yang cukup memadai hampir disemua aspek, membuat performanya cenderung stabil. Ia tergolong cukup teliti, cepat dan cekatan dalam mengerjakan tugasnya. Ia juga memiliki daya tahan terhadap stress yang cukup baik. Hanya saja, ia kurang tekun dan mudah bosan bekerja disituasi yang monoton sehingga memerlukan waktu istirahat disela-sela ia mengerjakan tugasnya. Hal ini tentunya kan menghambat produktifitasnya.`;
  } else {
    // Kurang Stress / Hanker (Hal 4)
    p2Narrative = `Didukung oleh sikap kerja yang cukup memadai hampir di semua aspek, membuat hasil kerjanya cukup optimal. Ia tergolong teliti, cukup cepat, cekatan serta cukup tekun dalam melakukan sesuatu. Ia tidak mudah menyerah saat menghadapi kesulitan ataupun merasa bosan meski harus berhadapan dengan tugas atau berada pada situasi kerja yang monoton. Akan tetapi saat mendapat situasi yang menekan, ia kurang dapat bertahan sehingga performa kerjanya cenderung menurun. Berdasarkan sikap kerja seperti ini, ada kemungkinan bahwa ia cenderung kurang adaptif.`;
  }

  // ----------------------------------------------------
  // PARAGRAF 3: KEPRIBADIAN - SOSIAL & EMOSI (Hal 6, 8, 9 PDF)
  // ----------------------------------------------------
  const kematanganEmosi = kepribadian.kematanganEmosi;
  const kemasakanSosial = kepribadian.kemasakanSosial;
  const percayaDiri = kepribadian.rasaPercayaDiri;
  const kerjasama = kepribadian.kemampuanBekerjasama;
  const komunikasi = kepribadian.keterampilanBerkomunikasi;

  let p3Narrative = '';
  if (kemasakanSosial >= 5 && kerjasama >= 5) {
    p3Narrative = `Sebagai pribadi, saudara/saudari ${firstName} adalah seorang yang suka tampil apa adanya, tulus, dan ramah dalam menjalin relasi. Ia suka bergaul dengan orang banyak serta memiliki kepercayaan diri yang memadai, didukung oleh kematangan emosi yang seimbang sehingga ia mampu mengendalikan reaksinya terhadap suatu permasalahan dengan tenang. Dalam lingkungan sosial maupun kerja kelompok, ia mampu bersosialisasi secara hangat, kooperatif, dan aktif menciptakan suasana kerja yang harmonis. Keterampilan komunikasinya cukup persuasif dalam mengekspresikan ide serta menghargai perbedaan pandangan orang lain untuk mencapai kesepahaman bersama.`;
  } else if (percayaDiri <= 3) {
    p3Narrative = `Sebagai pribadi, saudara/saudari ${firstName} adalah sosok yang rendah hati dan lebih suka tampil apa adanya. Ia nampak sebagai seorang yang pemalu serta kepercayaan dirinya dalam bergaul masih perlu ditingkatkan. Dalam situasi sosial, ia lebih menyukai lingkungan yang tenang, berusaha menghindari konflik dengan orang lain, dan mencari aman. Meski demikian, ia memiliki empati yang cukup baik terhadap rekan kerja dan tetap berupaya bekerjasama secara kooperatif dalam menyelesaikan tanggung jawab bersama di lingkungan kelompok.`;
  } else {
    p3Narrative = `Sebagai pribadi, saudara/saudari ${firstName} memiliki kematangan emosi dan pengendalian diri yang cukup stabil. Ia mampu mengendalikan reaksinya terhadap tekanan atau permasalahan kerja dengan pendekatan emosi yang seimbang. Dalam interaksi sosial, ia cukup selektif dalam memilih kelompok pergaulan dan tidak mudah terpengaruh oleh lingkungan negatif. Keterampilan komunikasinya cukup baik dalam menyampaikan informasi teknis pekerjaan serta bersedia mendengarkan masukan dari orang lain demi kelancaran kerjasama tim.`;
  }

  // ----------------------------------------------------
  // PARAGRAF 4: KEPRIBADIAN - MOTIVASI & GAYA KERJA (Hal 7, 8 PDF)
  // ----------------------------------------------------
  const motivasi = kepribadian.motivasiBerprestasi;
  const mandiri = kepribadian.sikapMandiri;
  const inisiatif = kepribadian.inisiatif;

  let p4Narrative = '';
  if (motivasi >= 5) {
    p4Narrative = `Sebagai pekerja, saudara/saudari ${firstName} memiliki ketekunan serta tanggung jawab yang tinggi. Ia bersedia bekerja keras untuk menyelesaikan tugasnya dengan orientasi hasil yang maksimal. Subjek memiliki tujuan kerja yang jelas dan keinginan berprestasi yang tinggi untuk meningkatkan capaian kinerjanya. Ia teratur, terencana, serta fokus pada detil pelaksanaan tugas. Dalam bekerja, ia senang merancang alur kerja yang terstruktur guna memastikan target yang diberikan dapat tercapai tepat waktu dan sesuai dengan standar yang ditetapkan organisasi.`;
  } else {
    p4Narrative = `Sebagai pekerja, saudara/saudari ${firstName} memiliki ketekunan serta tanggung jawab yang cukup baik dalam menyelesaikan tugas-tugas rutin yang dibebankan kepadanya. Ia bersedia mencurahkan waktu dan tenaganya untuk memastikan pekerjaan terlaksana secara tertib. Namun demikian, dorongan untuk mengejar target prestasi yang lebih tinggi masih perlu terus dipicu, mengingat ia cenderung cepat merasa nyaman dengan ritme kerja yang sudah berjalan dan membutuhkan arahan yang terstruktur untuk mengoptimalkan potensi produktivitasnya.`;
  }

  // ----------------------------------------------------
  // PARAGRAF 5: KEPRIBADIAN - KETAATAN & KEMANDIRIAN (Hal 9, 10, 13 PDF)
  // ----------------------------------------------------
  const loyalitas = kepribadian.loyalitas;

  let p5Narrative = '';
  if (mandiri >= 5 && inisiatif >= 5) {
    p5Narrative = `Sebagai penerima perintah, saudara/saudari ${firstName} merupakan orang yang setia dan loyal terhadap perusahaan. Ia memiliki kemandirian yang tinggi dalam bekerja serta senantiasa berorientasi pada pencapaian tujuan bersama. Ketika diberikan tanggung jawab, ia mampu mengambil inisiatif yang solutif tanpa harus selalu bergantung pada instruksi yang mendetail dari atasan. Sikap patuh dan rasa tanggung jawabnya yang kokoh menjadikannya figur karyawan yang dapat diandalkan dalam menjalankan kebijakan dan arahan manajemen organisasi secara konsisten.`;
  } else {
    p5Narrative = `Sebagai penerima perintah, saudara/saudari ${firstName} merupakan orang yang setia dan loyal terhadap perusahaan serta pimpinannya. Ia sangat menghormati otoritas dan kebijakan organisasi yang berlaku. Namun demikian, ia masih membutuhkan instruksi dan pengarahan yang jelas mengenai batasan tugasnya sebelum memulai pekerjaan, sehingga terkadang membuatnya ragu-ragu melangkah bila belum ada aturan atau panduan resmi dari atasan. Dengan bimbingan serta alur supervisi yang jelas, ia akan mampu menjalankan fungsinya secara optimal dan konsisten.`;
  }

  // ----------------------------------------------------
  // PARAGRAF 6: GAYA KEPEMIMPINAN & MANAJERIAL (Hal 10 - 12 PDF)
  // ----------------------------------------------------
  let p6Narrative = '';
  if (kepemimpinan) {
    const lead = kepemimpinan.kepemimpinan;
    if (lead >= 5) {
      p6Narrative = `Dalam peran manajerial dan kepemimpinan, saudara/saudari ${firstName} memiliki kapasitas yang tergolong memadai dan efektif. Ia mampu menyusun perencanaan kerja serta merumuskan target departemen secara sistematis dan terstruktur. Dalam memimpin tim, ia mampu menjalankan fungsi monitoring, pengawasan, serta evaluasi output kinerja bawahan secara berkesinambungan. Karakter kepemimpinannya tegas dalam memberikan arahan dan penilaian yang objektif berdasarkan target kerja yang disepakati. Selain itu, ia bersikap proaktif dalam membina dan mendukung bawahan untuk mengembangkan potensi diri serta keterampilan kerjanya (people development) demi kemajuan organisasi bersama.`;
    } else {
      p6Narrative = `Dalam peran manajerial dan kepemimpinan, saudara/saudari ${firstName} memiliki rasa percaya diri untuk memimpin serta mampu mengarahkan tim dalam menjalankan rutinitas operasional kerja harian secara tertib. Namun demikian, kapasitas kepemimpinannya masih memerlukan pengembangan lebih lanjut, khususnya dalam hal pendelegasian wewenang yang strategis, ketegasan dalam mengevaluasi bawahan secara objektif, serta fungsi pembinaan (coaching & mentoring) bawahan agar lebih mandiri dan proaktif. Dengan pembekalan teknik kepemimpinan manajerial yang terarah, ia akan mampu mengoptimalkan performa kepemimpinannya dalam mengelola tim yang lebih besar.`;
    }
  }

  const paragraphs = [p1Narrative, p2Narrative, p3Narrative, p4Narrative, p5Narrative];
  if (p6Narrative) {
    paragraphs.push(p6Narrative);
  }

  return paragraphs.join('\n\n');
}
