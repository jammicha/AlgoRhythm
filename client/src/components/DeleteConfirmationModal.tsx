import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    count: number;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, count }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-surface border border-red-500/30 rounded-lg shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full text-red-400">
                        <AlertTriangle size={32} />
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Artist?</h3>
                        <p className="text-gray-400 text-sm">
                            This will remove the artist and
                            <span className="text-white font-bold mx-1">{count}</span>
                            associated child nodes. This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
