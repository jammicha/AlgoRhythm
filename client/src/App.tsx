import { useState, useEffect } from 'react';
import { useGraphStore } from './store/useGraphStore';
import MusicGraph from './components/MusicGraph';
import DiscoveryModal from './components/DiscoveryModal';
import ContextMenu from './components/ContextMenu';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import EdgeContextMenu from './components/EdgeContextMenu';
import FavoritesSidebar from './components/FavoritesSidebar';
import PreviewSidebar from './components/PreviewSidebar';
import { Search, RotateCcw, RotateCw, ListMusic, Layout } from 'lucide-react';
import { Position, type Node, type Edge } from 'reactflow';

// Custom Layout Helper using Dagre
import dagre from 'dagre';

const nodeWidth = 200;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'HOZ' | 'VERT') => {
  console.log(`[Layout] Running Dagre (${direction}). Nodes: ${nodes.length}, Edges: ${edges.length}`);
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Map 'HOZ' -> 'LR' (Left to Right), 'VERT' -> 'TB' (Top to Bottom)
  const rankDir = direction === 'HOZ' ? 'LR' : 'TB';

  dagreGraph.setGraph({
    rankdir: rankDir,
    ranker: 'network-simplex', // Reverting to robust solver for better balancing
    nodesep: 80, // Increased spacing
    ranksep: 120,
    marginx: 50,
    marginy: 50
  });

  // Map for quick node lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    const targetNode = nodeMap.get(edge.target);

    // LOGIC: If the target is a "Manual" (Seed) node, we treating it as a new "Root".
    // We visually keep the edge, but for the LAYOUT engine, we sever the connection.
    // This allows the Manual node to snap to the top/left level along with other seeds,
    // rather than being pushed down/right as a child.

    // Exception: If BOTH are manual, maybe we still want to sever to keep them equal?
    // Or maybe we want to keep structure? 
    // User request: "line the parent nodes correctly". Implies alignment.
    // So we effectively ignore ANY dependency affecting a Manual node's position.

    // Only add edge constraint if target is NOT manual.
    // If target IS manual, it's a seed/parent, so let it float to the top.
    if (targetNode?.data?.isManual) {
      // Skip adding edge constraint
      return;
    }

    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    return {
      ...node,
      targetPosition: rankDir === 'LR' ? Position.Left : Position.Top,
      sourcePosition: rankDir === 'LR' ? Position.Right : Position.Bottom,
      // We pass the new position
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      draggable: true
    };
  });

  return { nodes: layoutedNodes, edges };
};



function App() {
  const { nodes, appendGraph, toggleFavorite, removeNode, getDescendants, undo, redo } = useGraphStore();
  const [modalOpen, setModalOpen] = useState(nodes.length === 0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [previewArtist, setPreviewArtist] = useState<{ name: string; tab: 'overview' | 'tracks' } | null>(null);
  const [layoutMode, setLayoutMode] = useState<'HOZ' | 'VERT'>('HOZ'); // Default: Horizontal Parents (Trees), Vertical Children (Lists)
  const [isLayoutFrozen, setIsLayoutFrozen] = useState(false); // Toggle to freeze layout during expansion

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; nodeId: string | null }>({
    x: 0,
    y: 0,
    visible: false,
    nodeId: null
  });

  const [edgeContextMenu, setEdgeContextMenu] = useState<{ x: number; y: number; visible: boolean; source: string | null; target: string | null }>({
    x: 0,
    y: 0,
    visible: false,
    source: null,
    target: null
  });

  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });

  // -- (skipped lines) --

  {/* Organize Button (Bottom Left) */ }
  {/* Organize Button (Bottom Left) */ }
  <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
    <button
      onClick={() => setIsLayoutFrozen(!isLayoutFrozen)}
      className={`flex items-center gap-2 px-4 py-3 border border-gray-700 rounded-full text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95 ${isLayoutFrozen ? 'bg-accent text-background' : 'bg-surface hover:bg-gray-700'
        }`}
      title={isLayoutFrozen ? "Layout Frozen (New nodes won't move existing ones)" : "Layout Active (Auto-organize)"}
    >
      <Layout size={18} />
      {isLayoutFrozen ? 'LAYOUT FROZEN' : 'FREEZE LAYOUT'}
    </button>

    <button
      onClick={() => {
        const newMode = layoutMode === 'HOZ' ? 'VERT' : 'HOZ';
        setLayoutMode(newMode);

        const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
          useGraphStore.getState().nodes,
          useGraphStore.getState().edges,
          newMode
        );
        useGraphStore.getState().setGraph(newNodes, newEdges);
      }}
      className="flex items-center gap-2 px-4 py-3 bg-surface border border-gray-700 rounded-full hover:bg-gray-700 text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
      title={`Current: ${layoutMode === 'HOZ' ? 'Horizontal Trees' : 'Vertical Trees'}`}
    >
      {layoutMode === 'HOZ' ? <RotateCw size={18} /> : <RotateCcw size={18} />}
      {layoutMode === 'HOZ' ? 'ORGANIZE ↕' : 'ORGANIZE ↔'}
    </button>
  </div>

  useEffect(() => {
    const handleResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDiscover = async ({ seed, seedId, originPos, quantity, obscure, eraMatch, enableAI = false }: any) => {
    console.log("Discovering for:", seed, quantity, obscure, eraMatch, enableAI);

    try {

      // 1. ADD GHOST NODES
      const center = originPos || { x: 0, y: 0 };
      const radius = originPos ? 300 : 250;
      const ghostIds: string[] = [];
      const ghostNodes: Node[] = [];
      const ghostEdges: Edge[] = [];

      for (let i = 0; i < quantity; i++) {
        const gId = `ghost-${Date.now()}-${i}`;
        ghostIds.push(gId);
        const angle = (i / quantity) * 2 * Math.PI;

        ghostNodes.push({
          id: gId,
          type: 'ghost',
          position: {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
          },
          data: { label: 'Loading...' }
        });

        if (seedId) {
          ghostEdges.push({
            id: `e-${seedId}-${gId}`,
            source: seedId,
            target: gId,
            animated: true,
            style: { stroke: '#4A5568', strokeDasharray: '5,5' }
          });
        }
      }

      // Append Ghosts immediately
      appendGraph(ghostNodes, ghostEdges);

      // 2. FETCH DATA
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5111'}/api/discovery/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seedArtist: seed,
          valence: 0.5,
          energy: 0.5,
          obscure: obscure,
          quantity: quantity,
          eraMatch: eraMatch,
          enableAI: enableAI
        }),
      });

      // 3. REMOVE GHOST NODES
      // We manually verify and remove them from the store state before adding real ones
      // Since 'removeNode' in store cascades, we might want a simpler 'removeGhost' or just filter.
      // For now, simpler: filter out these IDs from current state.
      const currentState = useGraphStore.getState();
      const nodesWithoutGhosts = currentState.nodes.filter(n => !ghostIds.includes(n.id));
      const edgesWithoutGhosts = currentState.edges.filter(e => !ghostEdges.some(ge => ge.id === e.id));

      // Reset state to "clean" (without ghosts) before appending real
      useGraphStore.getState().setGraph(nodesWithoutGhosts, edgesWithoutGhosts);

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();

      const newNodes = data.map((artist: any, index: number) => {
        // Deduplication: Check if this artist already exists (Case Insensitive)
        // If so, reuse the EXISTING ID so we merge into it, rather than creating a duplicate.
        const existingNode = useGraphStore.getState().nodes.find(n => n.id.toLowerCase() === artist.name.toLowerCase()); // Assuming ID is roughly Name-based or Name is unique key
        const finalId = existingNode ? existingNode.id : artist.name; // Use Name as ID if no match, or reuse existing ID

        // Radial layout around the 'center'
        // If expanding, maybe limit angle spread to "fan out" away from center? 
        // For simplicity, just full circle around parent for now.
        const angle = (index / data.length) * 2 * Math.PI;

        return {
          id: finalId,
          type: 'artist',
          position: {
            x: center.x + Math.cos(angle) * radius + (Math.random() * 50 - 25),
            y: center.y + Math.sin(angle) * radius + (Math.random() * 50 - 25)
          },
          data: {
            label: artist.name || artist.Name,
            img: artist.imageUrl || artist.ImageUrl,
            isFavorited: existingNode?.data?.isFavorited || artist.isFavorited, // Preserve favorite status if merging
            tags: artist.tags,
            isManual: existingNode?.data?.isManual || false
          },
        };
      });

      let finalNodes = [...newNodes];
      let sourceId = seedId;

      // Ensure the SEED node is marked as Manual (Green Border)
      // This applies whether it's a new search OR a double-click on an existing node
      if (!sourceId) {
        // NEW SEARCH CASE
        const existingNode = useGraphStore.getState().nodes.find(n => n.id.toLowerCase() === seed.toLowerCase());
        const newSeedId = existingNode ? existingNode.id : seed;
        sourceId = newSeedId;

        // Fetch details for the seed node to get real tags
        let seedTags = ["Artist"];
        let seedImg = `https://placehold.co/200x200?text=${seed}`;

        try {
          const seedDetailsParams = new URLSearchParams({ artist: seed });
          const seedRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5111'}/api/discovery/artist-details?${seedDetailsParams}`);
          if (seedRes.ok) {
            const seedData = await seedRes.json();
            if (seedData.tags && seedData.tags.length > 0) {
              seedTags = seedData.tags.slice(0, 3); // Take top 3 tags
            }
            if (seedData.imageUrl || seedData.ImageUrl) {
              seedImg = seedData.imageUrl || seedData.ImageUrl;
            }
          }
        } catch (err) {
          console.warn("Failed to fetch seed details", err);
        }

        const seedNode = {
          id: newSeedId,
          type: 'artist',
          position: center,
          data: {
            label: seed,
            img: seedImg,
            isFavorited: existingNode?.data?.isFavorited || false,
            isManual: true, // ALWAYS Green for the active seed
            tags: seedTags
          }
        };
        finalNodes.push(seedNode);
      } else {
        // DOUBLE CLICK CASE (Existing Node)
        // We want to update this node to be "isManual" (Green)
        const existingSeed = useGraphStore.getState().nodes.find(n => n.id === sourceId);
        if (existingSeed) {
          finalNodes.push({
            ...existingSeed,
            data: {
              ...existingSeed.data,
              isManual: true // Upgrade to Manual/Parent status
            }
          });
        }
      }

      console.log(`[Discover] Creating Edges from Source: ${sourceId}`);
      const newEdges = newNodes.filter((n: any) => n.id !== sourceId).map((n: any) => ({
        id: `e-${sourceId}-${n.id}`,
        source: sourceId,
        target: n.id,
        animated: true,
        style: { stroke: '#4A5568' }
      }));
      console.log(`[Discover] New Edges Created:`, newEdges.length);

      appendGraph(finalNodes, newEdges);

      // FORCE AUTO-LAYOUT following the current template
      // Wrap in timeout to ensure state is settled and avoid race conditions
      setTimeout(() => {
        // CHECK IF LAYOUT IS FROZEN
        if (isLayoutFrozen) {
          console.log("[Discover] Layout Frozen. Skipping auto-layout.");
          return;
        }

        console.log(`[Discover] Triggering Auto-Layout. Current Global Nodes: ${useGraphStore.getState().nodes.length}`);
        const { nodes: updatedNodes, edges: updatedEdges } = useGraphStore.getState();

        // Sanity Check: Ensure dagre receives non-zero nodes
        if (updatedNodes.length > 0) {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            updatedNodes,
            updatedEdges,
            layoutMode
          );
          useGraphStore.getState().setGraph(layoutedNodes, layoutedEdges);
          console.log("[Discover] Layout Applied.");
        }
      }, 100);

      // Ensure Sidebar doesn't stay open if the first click of the double-click triggered it
      setPreviewArtist(null);

    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      alert("Failed to fetch recommendations. Ensure Backend is running on port 5111.");
    }
  };

  const handleNodeRightClick = (event: React.MouseEvent, node: any) => {
    event.preventDefault(); // Prevent native browser menu
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      visible: true,
      nodeId: node.id
    });
  };

  const handleEdgeRightClick = (event: React.MouseEvent, edge: any) => {
    event.preventDefault();
    console.log("Edge Right Click Detected!", edge);

    // Find node labels for source and target
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (sourceNode?.data?.label && targetNode?.data?.label) {
      setEdgeContextMenu({
        x: event.clientX,
        y: event.clientY,
        visible: true,
        source: sourceNode.data.label,
        target: targetNode.data.label
      });
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background text-white selection:bg-accent selection:text-background">
      {/* Header / Overlay Controls */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div>
          <h1 className="text-4xl font-bold font-sans tracking-tighter">AlgoRhythm</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 font-mono text-xs">AI-POWERED MUSIC DISCOVERY</p>
            <div className="h-4 w-px bg-gray-700"></div>
            {/* Genre Header Placeholder - Dynamic based on graph would be cool later */}
            <div className="flex gap-2 text-[10px] font-mono text-accent/80 uppercase tracking-widest">
              <span>Indie</span>
              <span>•</span>
              <span>Alternative</span>
              <span>•</span>
              <span>Electronic</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={undo}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-gray-700 rounded hover:bg-gray-700 text-sm font-bold"
            title="Undo"
          >
            <RotateCcw size={16} />
            UNDO
          </button>
          <button
            onClick={redo}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-gray-700 rounded hover:bg-gray-700 text-sm font-bold"
            title="Redo"
          >
            <RotateCw size={16} />
            REDO
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-surface border border-gray-700 rounded hover:bg-gray-700 relative"
            title="Favorites"
          >
            <ListMusic size={20} />
            {/* Simple badge if needed later */}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-background font-bold rounded hover:bg-emerald-400 transition-colors"
          >
            <Search size={20} />
            ADD ARTIST
          </button>
        </div>
      </div>

      {/* Organize Button (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-20">
        <button
          onClick={() => {
            const newMode = layoutMode === 'HOZ' ? 'VERT' : 'HOZ';
            setLayoutMode(newMode);

            const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
              useGraphStore.getState().nodes,
              useGraphStore.getState().edges,
              newMode
            );
            useGraphStore.getState().setGraph(newNodes, newEdges);
          }}
          className="flex items-center gap-2 px-4 py-3 bg-surface border border-gray-700 rounded-full hover:bg-gray-700 text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
          title={`Switch to ${layoutMode === 'HOZ' ? 'Vertical' : 'Horizontal'} Layout`}
        >
          <Layout size={18} />
          {layoutMode === 'HOZ' ? 'ORGANIZE ↕' : 'ORGANIZE ↔'}
        </button>
      </div>

      {/* Main Graph Area */}
      <MusicGraph
        width={dimensions.w}
        height={dimensions.h}
        onNodeClick={(_, node) => {
          // IMMEDIATE Select & Preview
          useGraphStore.getState().selectNode(node.id);
          if (node.data?.label) {
            setPreviewArtist({ name: node.data.label, tab: 'overview' });
          }
        }}
        onPaneClick={() => {
          useGraphStore.getState().selectNode(null);
          setPreviewArtist(null);
        }}
        onNodeDoubleClick={(_, node) => {
          // IMMEDIATE Discovery
          if (node.data?.label) {
            handleDiscover({
              seed: node.data.label,
              seedId: node.id,
              originPos: node.position,
              quantity: 3,
              obscure: false,
              eraMatch: false
            });
          }
        }}
        onNodeRightClick={handleNodeRightClick}
        onEdgeContextMenu={handleEdgeRightClick}
      />

      {/* Modals & Context Menus */}
      <DiscoveryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDiscover={handleDiscover}
      />

      <FavoritesSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <PreviewSidebar
        artistName={previewArtist?.name || null}
        onClose={() => setPreviewArtist(null)}
        initialTab={previewArtist?.tab || 'overview'}
      />

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        onClose={handleContextMenuClose}
        isFavorited={contextMenu.nodeId ? nodes.find(n => n.id === contextMenu.nodeId)?.data.isFavorited : false}
        onFavorite={() => contextMenu.nodeId && toggleFavorite(contextMenu.nodeId)}
        onPreview={() => {
          const artistName = nodes.find(n => n.id === contextMenu.nodeId)?.data.label;
          if (artistName) {
            setPreviewArtist({ name: artistName, tab: 'tracks' });
            handleContextMenuClose();
          }
        }}
        onRemove={() => {
          if (contextMenu.nodeId) {
            const descendants = getDescendants(contextMenu.nodeId);
            if (descendants.length > 0) {
              setDeleteCandidate(contextMenu.nodeId);
            } else {
              removeNode(contextMenu.nodeId);
            }
          }
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate) removeNode(deleteCandidate);
        }}
        count={deleteCandidate ? getDescendants(deleteCandidate).length : 0}
      />

      {edgeContextMenu.visible && edgeContextMenu.source && edgeContextMenu.target && (
        <EdgeContextMenu
          x={edgeContextMenu.x}
          y={edgeContextMenu.y}
          source={edgeContextMenu.source}
          target={edgeContextMenu.target}
          onClose={() => setEdgeContextMenu(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}

export default App;
