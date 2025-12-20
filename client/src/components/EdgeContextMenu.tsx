import { useEffect, useState } from 'react';

interface EdgeContextMenuProps {
    x: number;
    y: number;
    source: string;
    target: string;
    onClose: () => void;
}

const EdgeContextMenu = ({ x, y, source, target, onClose }: EdgeContextMenuProps) => {
    const [explanation, setExplanation] = useState<string>("Analyzing connection...");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchExplanation = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5111'}/api/discovery/explain-connection`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source, target })
                });

                if (response.ok && mounted) {
                    const data = await response.json();
                    setExplanation(data.explanation || "No explanation found.");
                } else if (mounted) {
                    setExplanation("Failed to analyze connection.");
                }
            } catch (err) {
                if (mounted) setExplanation("Error connecting to AI.");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchExplanation();
        return () => { mounted = false; };
    }, [source, target]);

    return (
        <div
            className="fixed z-50 bg-surface/95 backdrop-blur-sm border border-accent rounded-xl shadow-2xl p-4 w-64 text-sm animate-in fade-in zoom-in-95 duration-200"
            style={{ top: y, left: x }}
        >
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Analysis</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white">&times;</button>
            </div>

            <div className="mb-1 text-white font-semibold">
                {source} ↔ {target}
            </div>

            <div className={`mt-2 text-gray-300 leading-snug ${loading ? 'animate-pulse' : ''}`}>
                {explanation}
            </div>


        </div>
    );
};

export default EdgeContextMenu;
