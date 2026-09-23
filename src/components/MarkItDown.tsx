import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Loader2, AlertCircle, Trash2, CheckCircle2, X } from 'lucide-react';
import JSZip from 'jszip';

type ConversionResult = {
  filename: string;
  markdown: string;
  success: boolean;
  error?: string;
};

export function MarkItDown() {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      addFiles(newFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files) as File[];
      addFiles(newFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      if (combined.length > 5) {
        setError('Maksimal 5 file dapat diunggah sekaligus.');
        return combined.slice(0, 5);
      }
      setError('');
      return combined;
    });
    setResults([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setResults([]);
    setError('');
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    
    setIsConverting(true);
    setError('');
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const response = await fetch('/api/markitdown', {
        method: 'POST',
        body: formData,
      });
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(response.ok ? 'Format respons tidak valid' : `Gagal mengunggah (Error ${response.status}).`);
      }
      
      if (!response.ok) {
        throw new Error(data?.error || 'Terjadi kesalahan saat mengonversi file.');
      }
      
      setResults(data.results || []);
      setActiveResultIndex(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    
    const zip = new JSZip();
    let hasValidFiles = false;

    results.forEach(res => {
      if (res.success && res.markdown) {
        hasValidFiles = true;
        const originalName = res.filename;
        const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        zip.file(`${baseName}.md`, res.markdown);
      }
    });

    if (!hasValidFiles) {
      setError("Tidak ada file valid untuk didownload.");
      return;
    }

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MarkItDown_Results.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Gagal membuat file ZIP.");
    }
  };

  const handleClear = () => {
    setFiles([]);
    setResults([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeResult = results[activeResultIndex];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mark It Down Converter</h1>
        <p className="text-gray-600">
          Konversi dokumen (PDF, Word, Excel, PowerPoint, Gambar, dll.) menjadi Markdown secara batch (Maksimal 5 file).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Upload & Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Upload File (Max 5)</h2>
              {files.length > 0 && (
                <button 
                  onClick={handleClear}
                  className="text-sm text-red-600 font-medium hover:text-red-700 flex items-center"
                >
                  <Trash2 size={16} className="mr-1" /> Bersihkan Semua
                </button>
              )}
            </div>
            
            {files.length < 5 && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-100 scale-[1.02]' 
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden"
                  multiple 
                />
                
                <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="bg-indigo-100 p-4 rounded-full mb-4 text-indigo-600">
                    <Upload size={32} />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Klik atau Drag & Drop file</h3>
                  <p className="text-sm text-gray-500">Pilih hingga 5 file sekaligus untuk dikonversi.</p>
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="space-y-2 mb-4">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg">
                    <div className="flex items-center truncate mr-2">
                      <FileText size={18} className="text-indigo-500 mr-3 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate">{f.name}</span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start text-sm">
                <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            
            <button
              onClick={handleConvert}
              disabled={files.length === 0 || isConverting}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center shadow-sm"
            >
              {isConverting ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Mengonversi {files.length} File...
                </>
              ) : (
                `Konversi ${files.length} File ke Markdown`
              )}
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Hasil Markdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[650px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Hasil Markdown</h2>
            <button
              onClick={handleDownloadZip}
              disabled={results.length === 0 || isConverting}
              className="flex items-center text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-sm"
            >
              <Download size={16} className="mr-2" /> Download All (ZIP)
            </button>
          </div>
          
          {results.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
              {results.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveResultIndex(idx)}
                  className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeResultIndex === idx 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {res.success ? <CheckCircle2 size={14} className="text-green-500 mr-1.5" /> : <AlertCircle size={14} className="text-red-500 mr-1.5" />}
                  {res.filename.substring(0, 15)}{res.filename.length > 15 ? '...' : ''}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-hidden flex flex-col">
            {isConverting ? (
               <div className="flex-1 flex flex-col items-center justify-center text-indigo-400">
                 <Loader2 size={48} className="mb-4 animate-spin" />
                 <p className="font-medium text-gray-600">Sedang memproses file...</p>
               </div>
            ) : results.length > 0 && activeResult ? (
              activeResult.success ? (
                <textarea
                  value={activeResult.markdown}
                  readOnly
                  className="w-full h-full bg-transparent resize-none outline-none font-mono text-sm text-gray-700 custom-scrollbar"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400">
                  <AlertCircle size={48} className="mb-4" />
                  <p className="font-medium text-red-600">Gagal mengonversi file ini</p>
                  <p className="text-sm text-red-500 mt-2">{activeResult.error}</p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Pilih file dan klik Konversi untuk melihat hasil</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
