import React, { useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    ConnectionMode,
    ReactFlowProvider,
    type Node,
    SelectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '../store/useGraphStore';
import ArtistNode from './ArtistNode';

interface MusicGraphProps {
    onNodeClick?: (event: React.MouseEvent, node: Node) => void;
    onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
    onNodeRightClick?: (event: React.MouseEvent, node: Node) => void;
    onEdgeContextMenu?: (event: React.MouseEvent, edge: any) => void;
    onPaneClick?: () => void;
    width: number;
    height: number;
}

import GhostNode from './GhostNode';

const nodeTypes = {
    artist: ArtistNode,
    ghost: GhostNode,
};

const MusicGraphData: React.FC<MusicGraphProps> = ({ onNodeClick, onNodeDoubleClick, onNodeRightClick, onEdgeContextMenu, onPaneClick }) => {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGraphStore();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            // Optional: Check if target is an edge if needed, but blocking globally is safer for this 'app-like' feel
        };

        container.addEventListener('contextmenu', handleContextMenu);
        return () => container.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-background no-select"
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}

                // Interaction Handlers
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={onNodeRightClick}
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneClick={onPaneClick}

                // Default Edge Options
                defaultEdgeOptions={{
                    interactionWidth: 40, // EXTREME interaction width to ensure clicks register
                    type: 'smoothstep'
                }}

                // Visuals
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={4}
                className="bg-background"

                // Interaction Logic
                panOnDrag={[0]}        // Left Click Pans (Standard)
                selectionOnDrag={false} // Disable auto-selection-drag (Requires Modifier Key)
                selectionKeyCode="Shift" // Shift + Drag = Selection Box
                multiSelectionKeyCode="Control" // Ctrl + Click = Add to selection
                selectionMode={SelectionMode.Partial}
                onPaneContextMenu={(e) => e.preventDefault()} // Block browser menu on background
            >
                <Background color="#1f2937" gap={20} />
                <Controls className="bg-surface border-gray-700 text-white fill-white" />
            </ReactFlow>
        </div>
    );
};

const MusicGraph: React.FC<MusicGraphProps> = (props) => {
    return (
        <ReactFlowProvider>
            <MusicGraphData {...props} />
        </ReactFlowProvider>
    );
}

export default MusicGraph;
