
import React, { useEffect } from 'react';
import { CheckIcon, AlertTriangleIcon, SparklesIcon, XIcon } from './Icons';
import { ToastNotification } from '../types';

interface Props {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

const Toast: React.FC<Props> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none items-end">
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} index={index} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void; index: number }> = ({ toast, onDismiss, index }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckIcon className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangleIcon className="w-4 h-4 text-red-500" />;
      default: return <SparklesIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBgColor = () => {
     switch (toast.type) {
      case 'success': return 'bg-white dark:bg-[#2a2a2a] border-green-500/20';
      case 'error': return 'bg-red-50 dark:bg-red-900/80 border-red-500/20 text-red-800 dark:text-red-100';
      default: return 'bg-white dark:bg-[#2a2a2a] border-gray-300/50';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-opacity-50 animate-in fade-in duration-500 transition-all ${getBgColor()}`} style={{ animationDelay: `${index * 100}ms` }}>
      <div className="shrink-0">{getIcon()}</div>
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="ml-2 text-current opacity-50 hover:opacity-100">
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
