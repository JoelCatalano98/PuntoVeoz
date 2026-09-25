import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmacionEmisionProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmacionEmision: React.FC<ConfirmacionEmisionProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  children,
  confirmText = 'Finalizar',
  cancelText = 'Cancelar',
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all flex flex-col">
        <div className={`p-6 border-b ${isDestructive ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-100 dark:border-slate-700'} flex items-center gap-3`}>
          {isDestructive && <AlertTriangle className="text-red-500" size={24} />}
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{title}</h2>
        </div>
        
        <div className="p-6 text-gray-600 dark:text-slate-300">
          {children}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-slate-400 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm transition-colors ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 focus:ring-2 focus:ring-red-500/50' 
                : 'bg-brand-light hover:bg-blue-400 text-brand-dark focus:ring-2 focus:ring-brand-light/50'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmacionEmision;
