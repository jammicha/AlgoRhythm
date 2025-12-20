import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const GhostNode = () => {
    return (
        <div className="relative flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed border-gray-600 w-[120px] h-[120px] bg-surface/50 animate-pulse">
            <Handle type="target" position={Position.Top} className="!bg-transparent !border-none" />

            <div className="w-16 h-16 rounded-full bg-gray-700/50 mb-2" />

            <div className="w-20 h-2 bg-gray-700/50 rounded" />

            <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none" />
        </div>
    );
};

export default memo(GhostNode);
