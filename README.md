# Sistem Psikogram & Ekstraksi AI (Seleksi Staf & BEI)

Aplikasi psikogram lengkap dengan fitur ekstraksi otomatis hasil psikotes (IST, Kraepelin, PAPI Kostick, MBTI) dan wawancara BEI (*Behavior Event Interview*) berbasis Google Gemini AI.

---

## 🚀 Panduan Deploy ke Vercel (Sekali Push)

Proyek ini telah dikonfigurasi penuh dengan **Vercel Serverless Functions** (`vercel.json` dan folder `api/`), sehingga Anda cukup melakukan push ke GitHub:

### 1. Push ke GitHub
```bash
git add .
git commit -m "feat: setup vercel serverless functions and auto-compression"
git push origin main
```

### 2. Hubungkan ke Vercel
1. Buka [dashboard.vercel.com](https://vercel.com/dashboard) lalu klik **"Add New..."** > **"Project"**.
2. Pilih repository GitHub ini.
3. Pada **Framework Preset**, pilih **Vite** (atau biarkan *Auto-detected*).
4. Pada bagian **Environment Variables**, tambahkan:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *(API Key Gemini Anda dari Google AI Studio)*
5. Klik tombol **Deploy**.

### 3. Selesai!
- Aplikasi web Anda langsung aktif di URL `https://<nama-proyek>.vercel.app`.
- Cek status server API dengan membuka:
  `https://<nama-proyek>.vercel.app/api/health`
  Jika mengembalikan `{"status":"ok","geminiConfigured":true}`, maka serverless function siap memproses dokumen.

---

## 🛠️ Fitur & Spesifikasi Arsitektur

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend / API**: Express.js yang siap berjalan di lingkungan lokal/container maupun **Vercel Serverless Function** (`api/index.ts` & `api/[...all].ts`).
- **AI Processing**: Google Gemini 2.5 Flash via `@google/genai`.
- **Auto Image Optimization**: Otomatis mengompresi foto lembar tes dari kamera ponsel/scanner di sisi browser sebelum dikirim, menjaga ukuran payload selalu di bawah batas 4.5 MB Vercel.
- **Temporary Storage**: Menggunakan direktori `os.tmpdir()` yang ramah serverless (mencegah error *read-only filesystem*).
- **Execution Limit**: Dikonfigurasi hingga 60 detik (`maxDuration: 60`) untuk mencegah *timeout* saat membaca dokumen PDF panjang.
