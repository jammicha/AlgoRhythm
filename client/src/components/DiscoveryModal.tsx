import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface DiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDiscover: (params: { seed: string; quantity: number; obscure: boolean; eraMatch: boolean; enableAI: boolean }) => void;
}

const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ isOpen, onClose, onDiscover }) => {
    const [seed, setSeed] = useState('');
    const [quantity, setQuantity] = useState(3);
    const [obscure, setObscure] = useState(false);
    const [eraMatch, setEraMatch] = useState(false);
    const [enableAI, setEnableAI] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onDiscover({ seed, quantity, obscure, eraMatch, enableAI });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface p-6 rounded-xl border border-gray-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
                        <Sparkles className="text-accent" size={20} />
                        Discover New Music
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Seed Artist */}
                    <div>
                        <label className="block text-sm font-mono text-gray-400 mb-2">SEED ARTIST</label>
                        <input
                            type="text"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            className="w-full bg-background border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-accent focus:outline-none"
                            placeholder="e.g. Radiohead"
                            required
                        />
                    </div>

                    {/* Quantity Slider */}
                    <div>
                        <label className="block text-sm font-mono text-gray-400 mb-2">QUANTITY: {quantity}</label>
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                    </div>

                    {/* Era Focus Toggle */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-700">
                        <span className="text-sm font-mono text-gray-300">MATCH ERA</span>
                        <div
                            onClick={() => setEraMatch(!eraMatch)}
                            className={`w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center transition-colors ${eraMatch ? 'bg-accent border-accent' : 'border-gray-500'}`}
                        >
                            {eraMatch && <div className="w-2.5 h-2.5 bg-background rounded-sm" />}
                        </div>
                    </div>

                    {/* Obscurity Toggle */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-700">
                        <span className="text-sm font-mono text-gray-300">DEEP CUTS (OBSCURE)</span>
                        <button
                            type="button"
                            onClick={() => setObscure(!obscure)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${obscure ? 'bg-accent' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${obscure ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* AI Enhanced Toggle */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-700">
                        <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-300">AI ENHANCED</span>
                            <span className="text-[10px] text-gray-500">Use Gemini to rank results</span>
                        </div>
                        <div
                            onClick={() => setEnableAI(!enableAI)}
                            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${enableAI ? 'bg-purple-600' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enableAI ? 'left-7' : 'left-1'}`} />
                        </div>
                    </div>

                    {/* Action */}
                    <button
                        type="submit"
                        className="w-full bg-accent hover:bg-emerald-400 text-background font-bold py-3 rounded-lg transition-colors font-sans"
                    >
                        GENERATE GRAPH
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DiscoveryModal;
