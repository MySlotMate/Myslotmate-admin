import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl rounded-3xl border border-brand-100 bg-white p-6 shadow-panel transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-100 text-slate-500 hover:bg-brand-50 hover:text-brand-700 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 overflow-y-auto pr-1 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
