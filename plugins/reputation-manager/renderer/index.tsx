import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Star, Activity, Users, Send, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EntityReputation, Feedback, ReputationSettings, ReputationUpdateEvent } from '../types';

export const activate = (context: any) => {
    const React = context.React as typeof import('react');
    const { useState, useEffect } = React;

    const ReputationPanel = () => {
        const [entities, setEntities] = useState<Record<string, EntityReputation>>({});
        const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
        const [settings, setSettings] = useState<ReputationSettings | null>(null);
        const [loading, setLoading] = useState(true);

        // Feedback form state
        const [feedbackRating, setFeedbackRating] = useState(5);
        const [feedbackComment, setFeedbackComment] = useState('');
        const [feedbackCategory, setFeedbackCategory] = useState('General');
        const [submitting, setSubmitting] = useState(false);

        useEffect(() => {
            const fetchData = async () => {
                try {
                    const [allEntities, currentSettings] = await Promise.all([
                        context.ipc.invoke('reputation:get-all'),
                        context.ipc.invoke('reputation:get-settings')
                    ]);
                    setEntities(allEntities);
                    setSettings(currentSettings);
                    
                    // Default to first entity if available and none selected
                    const entityIds = Object.keys(allEntities);
                    if (entityIds.length > 0 && !selectedEntityId) {
                        setSelectedEntityId(entityIds[0]);
                    }
                } catch (err) {
                    console.error('Failed to load reputation data:', err);
                } finally {
                    setLoading(false);
                }
            };

            fetchData();

            const handleUpdate = (event: ReputationUpdateEvent) => {
                setEntities(prev => {
                    const entity = prev[event.entityId];
                    if (!entity) return prev; // Should re-fetch if new entity
                    
                    return {
                        ...prev,
                        [event.entityId]: {
                            ...entity,
                            score: event.newScore,
                            // Ideally we'd get the full updated entity or update history locally
                            // For now, let's just update the score to trigger UI update
                            // A full refetch might be safer for consistency
                        }
                    };
                });
                // Trigger a refresh to get full history/rank updates
                fetchData();
            };

            context.ipc.on('reputation:updated', handleUpdate);

            return () => {
                // Cleanup listener if possible (context.ipc.off might not be exposed or needed depending on implementation)
            };
        }, []);

        const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

        const handleSubmitFeedback = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!selectedEntityId) return;

            setSubmitting(true);
            try {
                await context.ipc.invoke('reputation:submit-feedback', {
                    entityId: selectedEntityId,
                    score: feedbackRating,
                    comment: feedbackComment,
                    category: feedbackCategory,
                    reviewerId: 'user-interaction' // In a real app, this would be the current user's ID
                });
                setFeedbackComment('');
                setFeedbackRating(5);
                // Data update will come via event or re-fetch
            } catch (err) {
                console.error('Failed to submit feedback:', err);
            } finally {
                setSubmitting(false);
            }
        };

        if (loading) {
            return <div className="p-4 text-white">Loading reputation data...</div>;
        }

        return (
            <div className="h-full flex flex-col p-4 text-white bg-gray-900">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-blue-400" /> Reputation Manager
                    </h2>
                    {settings && (
                        <div className="text-xs text-gray-400">
                            Decay: {settings.decayRate}/day after {settings.decayWindow} days
                        </div>
                    )}
                </div>

                {Object.keys(entities).length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No entities tracked yet.</p>
                        <p className="text-xs mt-2">Interact with peers or agents to generate reputation data.</p>
                    </div>
                ) : (
                    <div className="flex flex-1 gap-4 overflow-hidden">
                        {/* Entity List */}
                        <div className="w-1/3 border-r border-white/10 pr-4 overflow-y-auto">
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Entities</h3>
                            <div className="space-y-2">
                                {Object.values(entities).map(entity => (
                                    <div 
                                        key={entity.id}
                                        onClick={() => setSelectedEntityId(entity.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                            selectedEntityId === entity.id ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                        }`}
                                    >
                                        <div className="font-bold text-sm truncate">{entity.id}</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-blue-300">{entity.rank}</span>
                                            <span className="text-xs font-mono">{Math.round(entity.score)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detail View */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {selectedEntity ? (
                                <>
                                    <div className="bg-white/5 p-6 rounded-lg mb-6 text-center border border-white/10 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                        <div className="text-sm text-gray-400 mb-2">Trust Score</div>
                                        <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                            {Math.round(selectedEntity.score)}
                                        </div>
                                        <div className="text-sm text-blue-300 mt-2 font-medium">{selectedEntity.rank}</div>
                                        
                                        {/* Simple Trend Indicator */}
                                        <div className="mt-4 flex justify-center gap-2">
                                            {selectedEntity.history.length > 1 && (
                                                (() => {
                                                    const last = selectedEntity.history[selectedEntity.history.length - 1].score;
                                                    const prev = selectedEntity.history[selectedEntity.history.length - 2].score;
                                                    const diff = last - prev;
                                                    if (diff > 0) return <span className="text-green-400 text-xs flex items-center gap-1"><TrendingUp size={12}/> +{diff.toFixed(1)}</span>;
                                                    if (diff < 0) return <span className="text-red-400 text-xs flex items-center gap-1"><TrendingDown size={12}/> {diff.toFixed(1)}</span>;
                                                    return <span className="text-gray-400 text-xs flex items-center gap-1"><Minus size={12}/> Stable</span>;
                                                })()
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2">
                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Submit Feedback</h3>
                                            <form onSubmit={handleSubmitFeedback} className="bg-white/5 p-4 rounded-lg border border-white/10">
                                                <div className="flex gap-4 mb-3">
                                                    <div className="flex-1">
                                                        <label className="block text-xs text-gray-500 mb-1">Rating</label>
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onClick={() => setFeedbackRating(star)}
                                                                    className={`text-lg focus:outline-none transition-transform hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-gray-600'}`}
                                                                >
                                                                    ★
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs text-gray-500 mb-1">Category</label>
                                                        <select 
                                                            value={feedbackCategory}
                                                            onChange={(e) => setFeedbackCategory(e.target.value)}
                                                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                                                        >
                                                            <option value="General">General</option>
                                                            <option value="Performance">Performance</option>
                                                            <option value="Reliability">Reliability</option>
                                                            <option value="Communication">Communication</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="block text-xs text-gray-500 mb-1">Comment</label>
                                                    <textarea
                                                        value={feedbackComment}
                                                        onChange={(e) => setFeedbackComment(e.target.value)}
                                                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none resize-none h-20"
                                                        placeholder="Describe your experience..."
                                                        required
                                                    />
                                                </div>
                                                <button 
                                                    type="submit" 
                                                    disabled={submitting}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {submitting ? 'Submitting...' : <><Send size={14} /> Submit Feedback</>}
                                                </button>
                                            </form>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Recent Feedback</h3>
                                                <select 
                                                    className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-gray-400 focus:border-blue-500 outline-none"
                                                    onChange={(e) => {
                                                        // Filter logic would go here. For now just visual.
                                                        console.log('Filter by:', e.target.value);
                                                    }}
                                                >
                                                    <option value="all">All Categories</option>
                                                    <option value="General">General</option>
                                                    <option value="Performance">Performance</option>
                                                    <option value="Reliability">Reliability</option>
                                                    <option value="Communication">Communication</option>
                                                    <option value="DSN">DSN</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedEntity.feedback.length === 0 ? (
                                                    <div className="text-center text-gray-500 py-4 text-sm">No feedback yet.</div>
                                                ) : (
                                                    selectedEntity.feedback.map((item) => (
                                                        <div key={item.id} className="bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors group">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-bold text-sm text-blue-300">{item.reviewerId}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                                                                    <button className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity" title="Report this feedback">
                                                                        Report
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex text-yellow-400 text-xs">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <span key={i} className={i < item.score ? 'text-yellow-400' : 'text-gray-700'}>★</span>
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-400">{item.category}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-300 mt-1">{item.comment}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-500">
                                    Select an entity to view details
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const ReputationManagerButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'reputation-manager';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('reputation-manager')}
                title="Reputation Manager"
            >
                <Shield size={20} strokeWidth={1.5} />
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'reputation-manager-nav',
        component: ReputationManagerButton
    });

    context.registerComponent('sidebar:view:reputation-manager', {
        id: 'reputation-manager-panel',
        component: ReputationPanel
    });
};
