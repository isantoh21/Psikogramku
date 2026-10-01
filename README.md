# Sistem Psikogram & Ekstraksi AI (Seleksi Staf & BEI)

Aplikasi psikogram lengkap dengan fitur ekstraksi otomatis hasil psikotes (IST, Kraepelin, PAPI Kostick, MBTI) dan wawancara BEI (*Behavior Event Interview*) dengan dukungan multi-provider AI (KoboiLLM, Google Gemini, OpenAI, Groq) serta integrasi backend **Supabase Storage**.

---

## 🛠️ Penyebab Masalah Upload Sebelumnya & Solusi Perbaikan

### Mengapa upload sering gagal sebelumnya?
1. **Payload Limit Serverless (4.5 MB)**: File PDF hasil scan berukuran 3–15 MB. Saat di-encode ke base64 untuk dikirim ke serverless Vercel, ukurannya melebihi batas 4.5 MB sehingga menghasilkan error `413 Payload Too Large` atau `FUNCTION_INVOCATION_FAILED`.
2. **Timeout Serverless (10–15 detik)**: Proses pembacaan PDF berukuran besar di serverless Vercel sering melebihi batas durasi function, menyebabkan `504 Gateway Timeout`.
3. **Format Tidak Didukung di AI Vision**: Endpoint OpenAI/KoboiLLM standar menolak data base64 dengan format `data:application/pdf;base64,...` di dalam `image_url` (hanya menerima tipe image seperti JPEG/PNG), sehingga terjadi `400 Bad Request`.
4. **Pembatasan 3MB Keras di Client**: Form input memblokir dokumen PDF > 3MB sebelum sempat diproses.

### Solusi yang telah diterapkan:
1. **Ekstraksi Teks PDF di Browser (Client-side)**: Menggunakan `pdfjs-dist` langsung di browser. Untuk PDF digital, teks diekstrak dalam hitungan detik dan hanya teks ringan (< 50 KB) yang dikirim ke AI. Hal ini 100% menghilangkan batasan ukuran payload dan timeout!
2. **Auto-Render Halaman Scanned PDF ke JPEG**: Jika PDF berupa scan (berisi gambar), halaman otomatis di-render ke kanvas browser dan dikonversi menjadi gambar JPEG resolusi optimal (~200–300 KB). Format ini 100% kompatibel dengan fitur Vision dari KoboiLLM, OpenAI, maupun Gemini.
3. **Integrasi Supabase Storage**: Mendukung penyimpanan file langsung ke bucket Supabase `psikogram-files`. URL file publik dapat disimpan dan dirujuk langsung oleh AI.
4. **Pembaruan Endpoint Backend**: Endpoint `/extract-ist`, `/extract-kraepelin`, `/extract-papikostik`, `/extract-mbti`, dan `/extract-bei` kini menerima teks hasil ekstraksi langsung tanpa harus memproses ulang PDF di server.

---

## ☁️ Konfigurasi Supabase Storage

Proyek ini telah dikonfigurasi dengan Supabase:
- **Supabase URL**: `https://ucgpmljuplocjmbspnag.supabase.co`
- **Anon Key**: Tersedia di file `.env` dan `.env.example`

### Langkah Opsional (Membuat Bucket Supabase):
Jika Anda ingin file dokumen tersimpan secara permanen di storage cloud:
1. Buka [Supabase Dashboard](https://supabase.com/dashboard/project/ucgpmljuplocjmbspnag).
2. Masuk ke menu **Storage** > **New Bucket**.
3. Buat bucket bernama: `psikogram-files`.
4. Atur bucket menjadi **Public**.
5. Simpan. Aplikasi akan otomatis mengunggah file ke bucket ini.

---

## 🚀 Panduan Menjalankan & Deploy

### Jalankan Lokal
```bash
npm install
npm run dev
```
Akses di browser: `http://localhost:3000`

### Build untuk Produksi
```bash
npm run build
npm start
```

### Deploy ke Vercel
1. Hubungkan repositori GitHub ini ke Vercel.
2. Tambahkan Environment Variables di Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (opsional)
3. Deploy!
