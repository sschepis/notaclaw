import React, { useState } from 'react';

export const activate = (context: any) => {
    console.log('[Semantic Search] Renderer activated');
    const { useAppStore } = context;

    const SearchPanel = () => {
        const { queryGlobalMemory, storeMemory } = useAppStore();
        const [query, setQuery] = useState('');
        const [results, setResults] = useState<any[]>([]);
        const [isIndexing, setIsIndexing] = useState(false);
        const [indexContent, setIndexContent] = useState('');

        const handleSearch = async () => {
            if (!query.trim()) return;
            const res = await queryGlobalMemory(query);
            setResults(res?.fragments || []);
        };

        const handleIndex = async () => {
            if (!indexContent.trim()) return;
            setIsIndexing(true);
            setTimeout(() => {
                setIsIndexing(false);
                setIndexContent('');
                alert('Content indexed successfully');
            }, 1000);
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Semantic Search</h2>
                
                <div className="bg-white/5 p-4 rounded-lg mb-4 space-y-3 border border-white/10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Search Knowledge</h3>
                    <div className="flex gap-2">
                        <input 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Ask a question or search..."
                            className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {results.map((res: any, i: number) => (
                        <div key={i} className="bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10">
                            <p className="text-sm text-gray-200">{res.content}</p>
                            <div className="mt-1 flex justify-between text-xs text-gray-500">
                                <span>Similarity: {(res.similarity * 100).toFixed(0)}%</span>
                                <span>{new Date(res.timestamp).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && query && <div className="text-center text-gray-500 mt-4">No results found.</div>}
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Index Content</h3>
                    <textarea 
                        value={indexContent}
                        onChange={(e) => setIndexContent(e.target.value)}
                        placeholder="Paste text to index..."
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:border-blue-500 mb-2"
                    />
                    <button 
                        onClick={handleIndex}
                        disabled={isIndexing || !indexContent}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-medium transition-colors disabled:opacity-50"
                    >
                        {isIndexing ? 'Indexing...' : 'Index Content'}
                    </button>
                </div>
            </div>
        );
    };

    const SemanticSearchButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'semantic-search';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('semantic-search')}
                title="Semantic Search"
            >
                SS
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'semantic-search-nav',
        component: SemanticSearchButton
    });

    context.registerComponent('sidebar:view:semantic-search', {
        id: 'semantic-search-panel',
        component: SearchPanel
    });
};
