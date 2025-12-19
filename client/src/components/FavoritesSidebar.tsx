import { useGraphStore } from '../store/useGraphStore';
import { X, Star, Trash2 } from 'lucide-react';

interface FavoritesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const FavoritesSidebar = ({ isOpen, onClose }: FavoritesSidebarProps) => {
    const { nodes, toggleFavorite } = useGraphStore();

    // React Flow structure: node.data.isFavorited
    const favorites = nodes.filter(n => n.data.isFavorited);

    return (
        <div className={`fixed inset-y-0 right-0 w-80 bg-surface border-l border-gray-700 shadow-2xl transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
            <div className={`p-6 h-full flex flex-col ${isOpen ? '' : 'pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-sans flex items-center gap-2">
                        <Star className="text-accent fill-accent" size={20} />
                        FAVORITES
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {favorites.length === 0 ? (
                        <p className="text-gray-500 text-sm font-mono text-center mt-10">
                            No favorites yet. <br /> Right-click an artist to add.
                        </p>
                    ) : (
                        favorites.map(artist => (
                            <div key={artist.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-gray-800 hover:border-gray-600 transition-colors group relative">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 shrink-0">
                                    {artist.data.img ? (
                                        <img src={artist.data.img} alt={artist.data.label} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">?</div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-sm truncate">{artist.data.label}</h3>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {artist.data.tags?.slice(0, 2).map((tag: string, i: number) => (
                                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleFavorite(artist.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-background border border-gray-700 rounded text-gray-400 hover:text-red-400 hover:border-red-400 transition-all absolute right-2 top-2"
                                    title="Remove"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FavoritesSidebar;
