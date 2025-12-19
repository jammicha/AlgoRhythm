import { Handle, Position } from 'reactflow';
import { memo } from 'react';
import { Star } from 'lucide-react';

const ArtistNode = ({ data, selected }: { data: any, selected?: boolean }) => {
    return (
        <div className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all w-[120px] h-[120px] bg-surface 
      ${selected
                ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110 z-50'
                : data.isManual
                    ? 'border-accent shadow-[0_0_15px_rgba(37,208,171,0.5)]'
                    : 'border-gray-700 hover:border-gray-500'
            }
    `}>
            {/* Favorited Star Indicator */}
            {data.isFavorited && (
                <div className="absolute -top-2 -right-2 bg-surface rounded-full p-1 border border-accent/50 shadow-sm z-10 text-yellow-400">
                    <Star size={12} fill="currentColor" />
                </div>
            )}

            <Handle type="target" position={Position.Top} className="!bg-transparent !border-none" />

            {/* Image Container */}
            <div className={`w-16 h-16 rounded-full overflow-hidden mb-2 border-2 shadow-lg transition-colors ${selected ? 'border-white' : 'border-background'}`}>
                {data.img ? (
                    <img src={data.img} alt={data.label} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">?</div>
                )}
            </div>

            {/* Label */}
            <div className="text-center w-full">
                <p className={`text-[10px] font-bold truncate px-1 leading-tight ${selected ? 'text-accent' : 'text-white'}`}>{data.label}</p>
                <p className="text-[8px] text-gray-400 truncate">{data.tags?.[0] || 'Artist'}</p>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none" />
        </div>
    );
};

export default memo(ArtistNode);
