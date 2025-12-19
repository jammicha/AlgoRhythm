import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, Connection } from 'reactflow';

interface GraphState {
    nodes: Node[];
    edges: Edge[];
    history: { nodes: Node[]; edges: Edge[] }[];
    future: { nodes: Node[]; edges: Edge[] }[];

    setGraph: (nodes: Node[], edges: Edge[]) => void;
    appendGraph: (nodes: Node[], edges: Edge[]) => void;
    toggleFavorite: (id: string) => void;
    removeNode: (id: string) => void;

    // Selection State
    selectedNodeId: string | null;
    selectNode: (id: string | null) => void;

    getDescendants: (id: string) => string[];

    // React Flow specific helpers
    onNodesChange: (changes: any) => void;
    onEdgesChange: (changes: any) => void;
    onConnect: (connection: Connection) => void;

    undo: () => void;
    redo: () => void;
}

// Helper to diff/apply changes would be needed for full interactivity
// But for now we just store full state or use applyNodeChanges from reactflow if we import it.
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';

export const useGraphStore = create<GraphState>()(
    persist(
        (set, get) => ({
            nodes: [],
            edges: [],
            history: [],
            future: [],

            setGraph: (nodes, edges) => set((state) => {
                const newHistory = [...state.history, { nodes: state.nodes, edges: state.edges }];
                return { nodes, edges, history: newHistory, future: [] };
            }),

            toggleFavorite: (id) => set((state) => {
                const newNodes = state.nodes.map(n => {
                    if (n.id === id) {
                        return {
                            ...n,
                            data: { ...n.data, isFavorited: !n.data.isFavorited }
                        };
                    }
                    return n;
                });
                return { nodes: newNodes };
            }),

            selectedNodeId: null,
            selectNode: (id) => set({ selectedNodeId: id }),

            getDescendants: (id) => {
                const { edges } = get();
                const descendants = new Set<string>();
                const queue = [id];

                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    const outgoing = edges.filter(e => e.source === currentId);

                    for (const edge of outgoing) {
                        if (!descendants.has(edge.target)) {
                            descendants.add(edge.target);
                            queue.push(edge.target);
                        }
                    }
                }
                return Array.from(descendants);
            },

            removeNode: (id) => set((state) => {
                // Cascading Delete Logic
                const descendants = new Set<string>();
                const queue = [id];

                // Map of nodes for quick lookup
                const nodeMap = new Map(state.nodes.map(n => [n.id, n]));

                // Find all recursive descendants to remove
                while (queue.length > 0) {
                    const currentId = queue.shift()!;

                    // Find outgoing edges from the current node
                    const outgoing = state.edges.filter(e => e.source === currentId);

                    for (const edge of outgoing) {
                        const targetNode = nodeMap.get(edge.target);

                        // CRITICAL CHANGE: Stop cascade if we hit a "Manual" (Seed/Parent) node.
                        // We do NOT delete it, and we do NOT traverse past it.
                        // It effectively "prunes" the branch at this protected node.
                        if (targetNode && targetNode.data?.isManual) {
                            continue;
                        }

                        if (!descendants.has(edge.target)) {
                            descendants.add(edge.target);
                            queue.push(edge.target);
                        }
                    }
                }

                // Add the start node itself to the removal set (always remove the clicked node)
                descendants.add(id);

                // Filter nodes
                const newNodes = state.nodes.filter(n => !descendants.has(n.id));

                // Filter edges (remove any edge connected to a removed node)
                const newEdges = state.edges.filter(e =>
                    !descendants.has(e.source) && !descendants.has(e.target)
                );

                // Add to history
                const newHistory = [...state.history, { nodes: state.nodes, edges: state.edges }];

                return { nodes: newNodes, edges: newEdges, history: newHistory, future: [] };
            }),

            onNodesChange: (changes) => set((state) => ({
                nodes: applyNodeChanges(changes, state.nodes),
            })),

            onEdgesChange: (changes) => set((state) => ({
                edges: applyEdgeChanges(changes, state.edges),
            })),

            onConnect: (connection) => set((state) => ({
                edges: addEdge(connection, state.edges),
            })),

            undo: () => set((state) => {
                if (state.history.length === 0) return state;
                const previous = state.history[state.history.length - 1];
                const newHistory = state.history.slice(0, -1);
                return {
                    nodes: previous.nodes,
                    edges: previous.edges,
                    history: newHistory,
                    future: [{ nodes: state.nodes, edges: state.edges }, ...state.future]
                };
            }),

            redo: () => set((state) => {
                if (state.future.length === 0) return state;
                const next = state.future[0];
                const newFuture = state.future.slice(1);
                return {
                    nodes: next.nodes,
                    edges: next.edges,
                    history: [...state.history, { nodes: state.nodes, edges: state.edges }],
                    future: newFuture
                };
            }),

            appendGraph: (newNodes, newEdges) => set((state) => {
                // 1. Merge Nodes
                const nodeMap = new Map(state.nodes.map(n => [n.id, n]));

                newNodes.forEach(newNode => {
                    if (nodeMap.has(newNode.id)) {
                        // Node exists: Merge data (e.g. isManual, isFavorited, Tags)
                        const existing = nodeMap.get(newNode.id)!;

                        console.log(`[Store] Merging Node: ${newNode.id}. Existing Manual: ${existing.data.isManual}, New Manual: ${newNode.data.isManual}`);

                        nodeMap.set(newNode.id, {
                            ...existing,
                            data: {
                                ...existing.data,
                                ...newNode.data,
                                // Special handling for flags to ensure true > false?
                                // If incoming isManual is true, we want to set it.
                                isManual: existing.data.isManual || newNode.data.isManual,
                                isFavorited: existing.data.isFavorited || newNode.data.isFavorited
                            }
                        });
                    } else {
                        // New Node
                        nodeMap.set(newNode.id, newNode);
                    }
                });

                const mergedNodes = Array.from(nodeMap.values());

                // 2. Merge Edges avoiding duplicates by ID
                const existingEdgeIds = new Set(state.edges.map(e => e.id));
                const uniqueNewEdges = newEdges.filter(e => !existingEdgeIds.has(e.id));
                const mergedEdges = [...state.edges, ...uniqueNewEdges];

                console.log(`[Store] Graph Updated. Nodes: ${mergedNodes.length}, Edges: ${mergedEdges.length}`);

                // Only push to history if there are changes (new edges or new/updated nodes)
                // Note: We might update existing nodes even if no *new* nodes are added.
                // Simple history check might be redundant but safe.
                const newHistory = [...state.history, { nodes: state.nodes, edges: state.edges }];

                return { nodes: mergedNodes, edges: mergedEdges, history: newHistory, future: [] };
            }),
        }),
        {
            name: 'algorhythm-storage-v2', // bump version to avoid conflict with old structure
            partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
        }
    )
);
