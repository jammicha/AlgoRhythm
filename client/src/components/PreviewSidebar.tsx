import React, { useState, useEffect } from 'react';
import { X, Play, Pause, ExternalLink } from 'lucide-react';

interface PreviewSidebarProps {
    artistName: string | null;
    onClose: () => void;
    initialTab?: 'tracks' | 'overview';
}

const PreviewSidebar: React.FC<PreviewSidebarProps> = ({ artistName, onClose, initialTab = 'overview' }) => {
    const isOpen = !!artistName;
    const [activeTab, setActiveTab] = useState<'tracks' | 'overview'>('overview');
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [tracks, setTracks] = useState<{ title: string; plays: string; duration: string; previewUrl: string }[]>([]);
    const [details, setDetails] = useState<{ bio: string; playcount: string; listeners: string; tags: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    // Reset and fetch when artist changes
    useEffect(() => {
        setPlayingIndex(null);
        setActiveTab(initialTab); // Use the prop to set initial tab on open
        if (audio) {
            audio.pause();
            setAudio(null);
        }

        if (artistName) {
            setLoading(true);

            // Parallel fetch for speed
            Promise.all([
                fetch(`http://localhost:5111/api/discovery/tracks?artist=${encodeURIComponent(artistName)}`).then(res => res.json()),
                fetch(`http://localhost:5111/api/discovery/artist-details?artist=${encodeURIComponent(artistName)}`).then(res => res.json())
            ])
                .then(([tracksData, detailsData]) => {
                    // Process Tracks
                    const formattedTracks = tracksData.map((t: any) => ({
                        title: t.title || t.Title,
                        plays: t.plays || t.Plays,
                        duration: t.duration || t.Duration,
                        previewUrl: t.previewUrl || t.PreviewUrl
                    }));
                    setTracks(formattedTracks);

                    // Process Details
                    setDetails({
                        bio: detailsData.bio || detailsData.Bio,
                        playcount: detailsData.playcount || detailsData.Playcount,
                        listeners: detailsData.listeners || detailsData.Listeners,
                        tags: detailsData.tags || detailsData.Tags || []
                    });
                })
                .catch(err => {
                    console.error("Failed to load artist data", err);
                    setTracks([]);
                    setDetails(null);
                })
                .finally(() => setLoading(false));

        } else {
            setTracks([]);
            setDetails(null);
        }
    }, [artistName]);

    const handlePlay = (index: number) => {
        if (playingIndex === index) {
            audio?.pause();
            setPlayingIndex(null);
        } else {
            if (audio) audio.pause();

            const track = tracks[index];
            if (track.previewUrl) {
                const newAudio = new Audio(track.previewUrl);
                newAudio.volume = 0.5;
                newAudio.play();
                newAudio.onended = () => setPlayingIndex(null);
                setAudio(newAudio);
                setPlayingIndex(index);
            } else {
                alert("No preview available for this track");
            }
        }
    };

    // Cleanup
    useEffect(() => {
        return () => { if (audio) audio.pause(); };
    }, [audio]);

    return (
        <div className={`fixed inset-y-0 right-0 w-96 bg-surface border-l border-gray-700 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
            <div className={`filter ${isOpen ? '' : 'pointer-events-none'} h-full flex flex-col`}>

                {/* Header */}
                <div className="relative h-48 bg-gray-800 shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent z-10" />
                    {artistName && (
                        <img
                            src={`https://placehold.co/400x200?text=${artistName}`}
                            alt={artistName}
                            className="w-full h-full object-cover opacity-60"
                        />
                    )}
                    <button
                        onClick={() => { onClose(); if (audio) audio.pause(); }}
                        className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full hover:bg-black/70 text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute bottom-4 left-6 z-20">
                        <h2 className="text-2xl font-bold font-sans text-white leading-none">{artistName}</h2>
                        <div className="flex gap-2 mt-2">
                            {details?.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-gray-300">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('tracks')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'tracks' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
                    >
                        Top Tracks
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {loading ? (
                        <div className="flex justify-center p-8 text-gray-500 font-mono text-sm animate-pulse">Loading...</div>
                    ) : activeTab === 'tracks' ? (
                        // Tracks List
                        tracks.length === 0 ? <div className="text-center text-gray-500 py-8 text-sm">No tracks found.</div> :
                            tracks.map((track, i) => (
                                <div
                                    key={i}
                                    className={`group flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${playingIndex === i ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    onClick={() => handlePlay(i)}
                                >
                                    <div className="w-8 h-8 flex items-center justify-center text-gray-400 group-hover:text-accent">
                                        {playingIndex === i ? <Pause size={16} className="fill-current text-accent" /> : <span className="font-mono text-xs group-hover:hidden">{i + 1}</span>}
                                        <Play size={16} className={`hidden ${playingIndex !== i ? 'group-hover:block fill-current' : ''}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-medium truncate ${playingIndex === i ? 'text-accent' : 'text-gray-200'}`}>{track.title}</h4>
                                        <p className="text-xs text-gray-500">{track.plays}</p>
                                    </div>
                                    <span className="text-xs font-mono text-gray-600">{track.duration}</span>
                                </div>
                            ))) : (
                        // Overview Tab
                        <div className="space-y-6 animate-in fade-in duration-300 p-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Listeners</p>
                                    <p className="text-xl font-mono text-white">{details?.listeners || '0'}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Plays</p>
                                    <p className="text-xl font-mono text-white">{details?.playcount || '0'}</p>
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Biography</h3>
                                <div
                                    className="text-sm text-gray-300 leading-relaxed space-y-2 prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: details?.bio || "No biography available." }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-background/50">
                    <button
                        onClick={() => { if (audio) audio.pause(); window.open(`https://open.spotify.com/search/${encodeURIComponent(artistName || '')}`, '_blank'); }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-colors"
                    >
                        <ExternalLink size={18} />
                        Open on Spotify
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewSidebar;
