import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, CheckCircle2, Lock, AlertTriangle, Send } from 'lucide-react';
import { trustApi } from '../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'RESOURCE' | 'TRANSPORT' | 'REQUEST' | 'SUSPICIOUS_REQUEST';
  targetId?: number;
  targetTitle?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  targetId,
  targetTitle
}) => {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getReasons = () => {
    switch (reportType) {
      case 'RESOURCE':
        return [
          { id: 'closed_facility', label: 'Closed / Defunct Facility' },
          { id: 'fake_ngo', label: 'Unverified / Fake Organization' },
          { id: 'inaccurate_info', label: 'Inaccurate Phone / Location' },
          { id: 'expired_supplies', label: 'Unsafe or Expired Supplies' },
          { id: 'other', label: 'Other Trust Concern' }
        ];
      case 'TRANSPORT':
        return [
          { id: 'wrong_fare', label: 'Unexpected Payment / Wrong Fare Requested' },
          { id: 'fake_driver', label: 'Unverified / Suspicious Driver or Volunteer' },
          { id: 'wrong_timing', label: 'Route Cancelled / Wrong Schedule' },
          { id: 'suspicious_information', label: 'Inaccurate Route Information' },
          { id: 'other', label: 'Other Mobility Safety Issue' }
        ];
      case 'REQUEST':
      case 'SUSPICIOUS_REQUEST':
      default:
        return [
          { id: 'fake_request', label: 'Fraudulent / Fake Distress Claim' },
          { id: 'duplicate_scam', label: 'Duplicate / Spam Submission' },
          { id: 'offensive_content', label: 'Inappropriate or Offensive Content' },
          { id: 'suspicious_behavior', label: 'Suspicious / Unsafe Contact Information' },
          { id: 'other', label: 'Other Suspicious Activity' }
        ];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setErrorMsg('Please select a reason for reporting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await trustApi.createReport({
        report_type: reportType,
        target_id: targetId,
        target_title: targetTitle || 'Target Item',
        reason,
        details,
        is_anonymous: isAnonymous
      });

      setSuccessMsg(res.message || 'Report submitted successfully.');
      setTimeout(() => {
        setSuccessMsg(null);
        setReason('');
        setDetails('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#161616] rounded-3xl border border-[#E2E8E4] dark:border-white/10 shadow-2xl overflow-hidden text-[#18352D] dark:text-white transition-all animate-modal-content">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0B4F3A] to-[#159B5B] text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center text-rose-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Report {reportType === 'RESOURCE' ? 'Resource Facility' : reportType === 'TRANSPORT' ? 'Transport Route' : 'Suspicious Request'}
              </h3>
              <p className="text-[11px] text-emerald-100/90 font-medium">Humanitarian Trust & Safety Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {targetTitle && (
            <div className="p-3 rounded-2xl bg-[#FFFDF3] dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 text-xs font-semibold">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Reporting Item:</span>
              <span className="text-[#18352D] dark:text-white font-bold">{targetTitle}</span>
            </div>
          )}

          {successMsg ? (
            <div className="p-6 text-center space-y-2 bg-emerald-50 dark:bg-orange-950/40 text-emerald-800 dark:text-orange-300 rounded-2xl border border-emerald-200 dark:border-orange-500/40">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 dark:text-orange-400" />
              <h4 className="font-extrabold text-sm">{successMsg}</h4>
              <p className="text-xs">Our verification officers have been notified.</p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs border border-rose-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Select Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wider block">
                  Select Reason *
                </label>
                <div className="space-y-1.5">
                  {getReasons().map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        reason === r.id
                          ? 'bg-[#E8F3E9] dark:bg-orange-950/40 border-[#159B5B] dark:border-orange-500/40 text-[#0B4F3A] dark:text-orange-300'
                          : 'bg-white dark:bg-[#0D0D0D] border-[#E2E8E4] dark:border-white/10 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.id}
                        checked={reason === r.id}
                        onChange={(e) => setReason(e.target.value)}
                        className="accent-[#159B5B] dark:accent-[#F25C38]"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Details text area */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wider block">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any relevant context to assist our safety officers..."
                  rows={3}
                  className="w-full p-3 bg-white dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10 rounded-2xl text-xs text-[#18352D] dark:text-white outline-none focus:border-[#159B5B] dark:focus:border-[#F25C38]"
                />
              </div>

              {/* Privacy Control: Anonymous Reporting Toggle */}
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#0D0D0D] border border-[#E2E8E4] dark:border-white/10">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded accent-[#159B5B] dark:accent-[#F25C38] w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-extrabold text-[#18352D] dark:text-white flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-[#159B5B] dark:text-orange-400" />
                      <span>Anonymous Reporting Protection</span>
                    </span>
                    <span className="text-[10px] text-stone-500 block">Your user identity will not be attached to this trust report.</span>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Trust Report'}</span>
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>,
    document.body
  );
};

export default ReportModal;
