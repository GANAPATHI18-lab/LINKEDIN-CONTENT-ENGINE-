import React from 'react';
import { HistoryItem, GenerationType } from '../types';

interface HistoryPanelProps {
    history: HistoryItem[];
    onLoad: (item: HistoryItem) => void;
    onDelete: (id: string) => void;
    onClear: () => void;
}

// Helper to format the GenerationType enum into a readable string
const formatGenerationType = (type: GenerationType): string => {
    return type.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoad, onDelete, onClear }) => {
    if (history.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg text-center text-gray-400 h-full flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">No History Yet</h3>
                <p className="text-sm">Your generated content will appear here automatically.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-4 rounded-2xl shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl font-bold">Generation History</h2>
                <button
                    onClick={onClear}
                    className="px-3 py-1 text-xs font-semibold text-red-300 bg-red-800/50 hover:bg-red-800/80 rounded-full transition-colors duration-200"
                >
                    Clear All
                </button>
            </div>
            <ul className="space-y-3 overflow-y-auto flex-grow pr-2">
                {history.map((item) => (
                    <li key={item.id} className="bg-gray-700/50 p-4 rounded-lg group">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="font-bold text-white truncate max-w-xs">{item.options.topic}</p>
                                <p className="text-xs text-gray-400">
                                    {formatGenerationType(item.options.type)} &middot;{' '}
                                    {new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }).format(new Date(item.timestamp))}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    onClick={() => onLoad(item)}
                                    title="Load this item"
                                    className="p-1.5 text-blue-300 bg-blue-800/50 hover:bg-blue-800/80 rounded-full"
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
                                </button>
                                <button
                                    onClick={() => onDelete(item.id)}
                                    title="Delete this item"
                                    className="p-1.5 text-red-300 bg-red-800/50 hover:bg-red-800/80 rounded-full"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default HistoryPanel;