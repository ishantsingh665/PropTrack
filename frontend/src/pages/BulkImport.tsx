import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  ChevronRight,
  ArrowRight,
  Info,
  History,
  Download
} from 'lucide-react';
import { uploadCsv, getImportStatus, ImportJob } from '../api/import';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const BulkImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');

  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const job = await getImportStatus(jobId);
      setCurrentJob(job);
      if (job.status === 'completed' || job.status === 'failed') {
        setStep('result');
      } else {
        setTimeout(() => pollStatus(jobId), 2000);
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { jobId } = await uploadCsv(file);
      setStep('processing');
      pollStatus(jobId);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.message || 'Upload failed. Check if snapshot gate is open.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderUpload = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Upload Property Data</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Import thousands of properties at once using a CSV file. 
          Make sure your columns match the required schema.
        </p>

        <div className="mt-8">
          <label className={cn(
            "relative block w-full border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer",
            file ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
          )}>
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-2">
                <FileText className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-sm font-bold text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-red-500 font-medium mt-2 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Click to browse or drag and drop</p>
                <p className="text-xs text-gray-500">Only CSV files are supported</p>
              </div>
            )}
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center"
        >
          {isUploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-2" />}
          Start Import
        </button>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
        <h3 className="text-sm font-bold text-blue-900 flex items-center">
          <Info className="w-4 h-4 mr-2" /> Column Requirements
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-blue-700">
          <li>• <strong>name</strong> - Property display name</li>
          <li>• <strong>address_line1</strong> - Street address (Swedish, Arabic, etc.)</li>
          <li>• <strong>city</strong>, <strong>postal_code</strong>, <strong>country_code</strong> (ISO 2-letter)</li>
          <li>• <strong>gfa_value</strong>, <strong>gfa_unit</strong> (sqft or sqm)</li>
          <li>• <strong>company_name</strong> - Will be linked or created</li>
        </ul>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-xl mx-auto py-20 text-center space-y-6 text-black">
      <div className="relative inline-block">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-600">
          {currentJob?.processedRows || 0}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Processing Your File</h2>
        <p className="text-gray-500 mt-2 text-sm">
          We are validating addresses, converting GFA units, and creating property records. 
          This usually takes a few seconds per 1000 rows.
        </p>
      </div>
      
      {currentJob && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-left">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-500">Status</span>
            <span className="font-bold text-blue-600 uppercase">{currentJob.status}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${(currentJob.processedRows || 0) / (currentJob.totalRows || 1) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-gray-400 text-center">
            {currentJob.processedRows || 0} of {currentJob.totalRows || '...'} rows processed
          </div>
        </div>
      )}
    </div>
  );

  const renderResult = () => {
    if (!currentJob) return null;
    const isSuccess = currentJob.status === 'completed';

    return (
      <div className="max-w-2xl mx-auto space-y-6 text-black">
        <div className={cn(
          "bg-white p-8 rounded-2xl shadow-sm border text-center",
          isSuccess ? "border-green-100" : "border-red-100"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            isSuccess ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          )}>
            {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isSuccess ? 'Import Successful' : 'Import Failed'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            {isSuccess 
              ? `Successfully processed ${currentJob.processedRows} properties from ${currentJob.filename}.`
              : `Encountered critical errors while processing ${currentJob.filename}.`}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total</span>
              <span className="text-lg font-bold text-gray-900">{currentJob.totalRows}</span>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <span className="text-[10px] font-bold text-green-400 uppercase block mb-1">Success</span>
              <span className="text-lg font-bold text-green-700">{currentJob.processedRows}</span>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">Errors</span>
              <span className="text-lg font-bold text-red-700">{currentJob.errorCount || 0}</span>
            </div>
          </div>

          <div className="mt-8 space-x-3">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Import Another File
            </button>
            <button
              onClick={() => window.location.href = '/properties'}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              View Properties
            </button>
          </div>
        </div>

        {currentJob.errors && currentJob.errors.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                Error Details
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-gray-400 font-medium">
                    <th className="px-4 py-2">Row</th>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentJob.errors.map((err: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-400">{err.row || idx + 1}</td>
                      <td className="px-4 py-2 truncate max-w-[200px]">{err.data?.name || err.data?.address_line1 || 'N/A'}</td>
                      <td className="px-4 py-2 text-red-600 font-medium">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
          <p className="text-sm text-gray-500 mt-1">Upload CSV data to populate your portfolio at scale.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
          <span className={cn(step === 'upload' && "text-blue-600 font-bold")}>Upload</span>
          <ChevronRight className="w-3 h-3" />
          <span className={cn(step === 'processing' && "text-blue-600 font-bold")}>Process</span>
          <ChevronRight className="w-3 h-3" />
          <span className={cn(step === 'result' && "text-blue-600 font-bold")}>Result</span>
        </div>
      </div>

      {step === 'upload' && renderUpload()}
      {step === 'processing' && renderProcessing()}
      {step === 'result' && renderResult()}
    </div>
  );
};

export default BulkImport;
