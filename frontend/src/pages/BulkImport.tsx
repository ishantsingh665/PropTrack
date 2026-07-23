import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Download,
  Building2,
  ShieldCheck,
  X
} from 'lucide-react';
import { uploadCsv, getImportStatus, ImportJob } from '../api/import';
import { getCompany, Company } from '../api/companies';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';

const BulkImport: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');

  const [file, setFile] = useState<File | null>(null);
  const [targetCompany, setTargetCompany] = useState<Company | null>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');

  // Preview States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [previewStats, setPreviewData] = useState<{ count: number, totalGfa: number } | null>(null);

  useEffect(() => {
    if (companyId) {
      getCompany(companyId).then(setTargetCompany).catch(console.error);
    }
  }, [companyId]);

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
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Basic preview parse
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const headers = lines[0].toLowerCase().split(',');
        const gfaIdx = headers.findIndex(h => h.includes('gfa_value') || h.includes('gfa_val'));
        
        let count = 0;
        let totalGfa = 0;
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          count++;
          if (gfaIdx !== -1) {
            const cols = lines[i].split(',');
            const val = parseFloat(cols[gfaIdx]);
            if (!isNaN(val)) totalGfa += val;
          }
        }
        setPreviewData({ count, totalGfa });
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleStartImport = () => {
    if (!file) return;
    if (targetCompany) {
      setIsConfirmModalOpen(true);
    } else {
      handleUpload();
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsConfirmModalOpen(false);
    setIsUploading(true);
    try {
      const { jobId } = await uploadCsv(file, companyId || undefined);
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
      {targetCompany && (
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-none">Scoped Upload Active</h3>
              <p className="text-blue-100 text-xs mt-1">Target: <span className="font-bold">{targetCompany.name}</span></p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/import')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Clear target company"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

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
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewData(null); }}
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
          onClick={handleStartImport}
          disabled={!file || isUploading}
          className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-blue-100"
        >
          {isUploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-2" />}
          {targetCompany ? 'Review & Ingest' : 'Start Import'}
        </button>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
        <h3 className="text-sm font-bold text-blue-900 flex items-center">
          <Info className="w-4 h-4 mr-2" /> Column Requirements
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-blue-700">
          <li>• <strong>name</strong> - Property display name</li>
          <li>• <strong>address_line1</strong> - Street address</li>
          <li>• <strong>city</strong>, <strong>postal_code</strong>, <strong>country_code</strong></li>
          <li>• <strong>gfa_value</strong>, <strong>gfa_unit</strong> (sqft or sqm)</li>
          {!targetCompany && <li>• <strong>company_name</strong> - Will be linked or created</li>}
          {targetCompany && <li className="font-bold text-blue-900">• Company column is ignored (locked to {targetCompany.name})</li>}
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

      {/* Verification Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Verify Bulk Import"
      >
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              You are about to perform a <strong>scoped upload</strong>. All properties in this file will be strictly associated with the target company. Any company identifiers in the file will be ignored.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target Company</span>
              <span className="text-sm font-bold text-gray-900">{targetCompany?.name}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Properties</span>
                <span className="text-lg font-bold text-gray-900">{previewStats?.count}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total GFA Impact</span>
                <span className="text-lg font-bold text-gray-900">{(previewStats?.totalGfa || 0).toLocaleString()} <span className="text-[10px] text-gray-400">sqft</span></span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center shadow-lg shadow-blue-200"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm & Ingest
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BulkImport;
