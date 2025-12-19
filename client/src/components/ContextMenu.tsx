import React from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    visible: boolean;
    isFavorited?: boolean; // New prop
    onFavorite: () => void;
    onRemove: () => void;
    onPreview: () => void;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, isFavorited, onFavorite, onRemove, onPreview, onClose }) => {
    if (!visible) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-surface border border-gray-700 rounded-lg shadow-xl py-1 w-40"
                style={{ top: y, left: x }}
            >
                <button
                    className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-gray-200"
                    onClick={() => { onFavorite(); onClose(); }}
                >
                    {isFavorited ? 'Unfavorite' : 'Favorite'}
                </button>
                <button
                    className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-gray-200"
                    onClick={() => { onPreview(); onClose(); }}
                >
                    Preview
                </button>
                <div className="h-px bg-gray-700 my-1"></div>
                <button
                    className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-red-400 font-bold"
                    onClick={() => { onRemove(); onClose(); }}
                >
                    Remove Artist
                </button>
            </div>
        </>
    );
};

export default ContextMenu;
