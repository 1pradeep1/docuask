import { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function PDFUpload({ onUploadSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const validateAndStage = (file) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be under 20 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndStage(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => validateAndStage(e.target.files[0]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      onUploadSuccess({ sessionId: data.sessionId, filename: data.filename });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-4 shadow-lg">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">DocuAsk</h1>
        <p className="text-slate-500 mt-2">Upload a PDF and ask questions — answers come only from your document.</p>
      </div>

      {/* Upload Card */}
      <div className="w-full max-w-lg">
        <div
          onClick={() => !selectedFile && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
            ${dragOver ? 'border-brand-500 bg-brand-50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-brand-500 hover:bg-brand-50'}
            ${selectedFile ? 'cursor-default border-green-400 bg-green-50' : ''}
          `}
        >
          {selectedFile ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div className="text-left min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="p-1.5 rounded-full hover:bg-slate-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Drop your PDF here</p>
              <p className="text-sm text-slate-400 mt-1">or click to browse — max 20 MB</p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="mt-4 w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200
            bg-brand-500 hover:bg-brand-600 active:scale-[0.98] shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Uploading…
            </span>
          ) : 'Upload & Start Asking'}
        </button>
      </div>

      <p className="mt-6 text-xs text-slate-400">Your PDF is processed securely and never stored permanently.</p>
    </div>
  );
}
