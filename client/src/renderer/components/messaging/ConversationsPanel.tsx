import React, { useState, useEffect } from 'react';
import { useAlephStore } from '../../store/useAlephStore';
import { useAppStore } from '../../store/useAppStore';
import { 
    Hash, Globe, Lock, Shield, 
    Plus, Search, Settings, Bot
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DirectMessageView } from './DirectMessageView'; // We might reuse the chat view part
import { GroupsPanel } from '../groups/GroupsPanel'; // We might reuse the group view part
import { DomainDefinition } from '@/shared/alephnet-types';

// --- Types ---

interface DomainUI extends DomainDefinition {
    icon: React.ReactNode;
}

// --- Mock Data (Fallback) ---

const MOCK_DOMAINS: DomainUI[] = [
    { id: 'public', name: 'Public', handle: '@public', icon: <Globe size={20} />, type: 'public' } as any,
    { id: 'devs', name: 'Developers', handle: '@developers', icon: <Hash size={20} />, type: 'private' } as any,
    { id: 'core', name: 'Aleph Core', handle: '@aleph_core', icon: <Shield size={20} />, type: 'secret' } as any,
];

// --- Components ---

const DomainRail: React.FC<{ 
    activeDomainId: string; 
    onSelectDomain: (id: string) => void; 
    domains: DomainUI[];
}> = ({ activeDomainId, onSelectDomain, domains }) => {
    return (
        <div className="w-[50px] flex flex-col items-center py-4 gap-3 border-r border-border bg-muted/20">
            {domains.map((domain) => (
                <div key={domain.id} className="relative group">
                    {activeDomainId === domain.id && (
                        <motion.div 
                            layoutId="activeDomainIndicator"
                            className="absolute -left-3 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                        />
                    )}
                    <button
                        onClick={() => onSelectDomain(domain.id)}
                        className={`
                            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                            ${activeDomainId === domain.id 
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                                : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                            }
                        `}
                    >
                        {domain.icon}
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-3 px-2 py-1 bg-popover text-xs text-popover-foreground rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border">
                        {domain.name}
                    </div>
                </div>
            ))}
            
            <div className="h-px w-6 bg-border my-1" />
            
            <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/20 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all border border-dashed border-border hover:border-primary/50">
                <Plus size={20} />
            </button>
        </div>
    );
};

const ConversationList: React.FC<{ 
    domainId: string;
    onSelectConversation: (type: 'dm' | 'group' | 'ai', id: string) => void;
    domains: DomainUI[];
}> = ({ domainId, onSelectConversation, domains }) => {
    const { messaging: { conversations }, groups: { groups } } = useAlephStore();
    const { conversations: aiConversations, createConversation } = useAppStore();
    const [search, setSearch] = useState('');

    const activeDomain = domains.find(d => d.id === domainId);

    // Filter items based on search and domain
    // In a real app, we'd filter by domainId. For now, we show all if 'public', or subsets if others.
    
    const filteredConversations = conversations.filter(c => 
        c.peerDisplayName.toLowerCase().includes(search.toLowerCase())
    );

    const filteredGroups = groups.filter(g => 
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredAIConversations = Object.values(aiConversations)
        .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
        .filter(c => {
            // Filter by domain
            if (domainId === 'public') return true; // Show all in public for now, or filter by public domain ID
            return c.domainId === domainId;
        })
        .sort((a, b) => b.updatedAt - a.createdAt);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
            {/* Header */}
            <div className="p-3 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">
                        {activeDomain?.name || 'Unknown Domain'}
                    </h2>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Settings size={14} />
                    </button>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-muted/20 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/30 focus:bg-muted/30 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6">
                
                {/* AI Conversations Section */}
                <div>
                    <div className="px-2 mb-2 flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conversations</span>
                        <Plus 
                            size={12} 
                            className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer hover:text-foreground transition-all" 
                            onClick={async (e) => {
                                e.stopPropagation();
                                // Pass domainId to createConversation if not public
                                const targetDomain = domainId === 'public' ? undefined : domainId;
                                // Note: createConversation signature in useAppStore needs update to accept domainId
                                // But for now assuming it might accept arguments or we need to update useAppStore too.
                                // useAppStore.createConversation currently takes no args?
                                // Let's check useAppStore.
                                const id = await createConversation(targetDomain); 
                                onSelectConversation('ai', id);
                            }}
                        />
                    </div>
                    <div className="space-y-0.5">
                        {filteredAIConversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => onSelectConversation('ai', conv.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 text-left group transition-colors"
                            >
                                <div className="relative">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                                        <Bot size={14} className="text-primary" />
                                    </div>
                                </div>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground truncate flex-1">{conv.title}</span>
                            </button>
                        ))}
                        {filteredAIConversations.length === 0 && (
                            <div className="px-2 py-2 text-center">
                                <p className="text-xs text-muted-foreground italic">No conversations</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Direct Messages Section */}
                <div>
                    <div className="px-2 mb-2 flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
                        <Plus size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer hover:text-foreground transition-all" />
                    </div>
                    <div className="space-y-0.5">
                        {filteredConversations.map(conv => (
                            <button
                                key={conv.peerId}
                                onClick={() => onSelectConversation('dm', conv.peerId)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 text-left group transition-colors"
                            >
                                <div className="relative">
                                    <Avatar className="h-6 w-6 rounded-full ring-1 ring-border">
                                        <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                                            {conv.peerDisplayName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {conv.unreadCount > 0 && (
                                        <div className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary flex items-center justify-center border border-background">
                                            <span className="text-[8px] font-bold text-primary-foreground">{conv.unreadCount}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                            {conv.peerDisplayName}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {filteredConversations.length === 0 && (
                            <div className="px-2 py-4 text-center">
                                <p className="text-xs text-muted-foreground italic">No messages yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Groups Section */}
                <div>
                    <div className="px-2 mb-2 flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Groups</span>
                        <Plus size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer hover:text-foreground transition-all" />
                    </div>
                    <div className="space-y-0.5">
                        {filteredGroups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => onSelectConversation('group', group.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 text-left group transition-colors"
                            >
                                <div className="w-6 h-6 rounded-lg bg-muted/20 flex items-center justify-center border border-border group-hover:border-muted-foreground/30 transition-colors">
                                    {group.visibility === 'private' ? <Lock size={12} className="text-muted-foreground" /> : <Hash size={14} className="text-muted-foreground" />}
                                </div>
                                <span className="text-sm text-muted-foreground group-hover:text-foreground truncate flex-1">{group.name}</span>
                            </button>
                        ))}
                         {filteredGroups.length === 0 && (
                            <div className="px-2 py-4 text-center">
                                <p className="text-xs text-muted-foreground italic">No groups found</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export const ConversationsPanel: React.FC = () => {
    const [activeDomainId, setActiveDomainId] = useState('public');
    const { 
        messaging: { activeConversationPeerId }, 
        groups: { activeGroupId },
        domains: { domains },
        loadDomains,
        setActiveConversation,
        setActiveGroup
    } = useAlephStore();
    const { setActiveConversationId } = useAppStore();

    useEffect(() => {
        loadDomains();
    }, [loadDomains]);

    // Map domains to UI domains with icons
    const uiDomains: DomainUI[] = domains.length > 0 ? domains.map(d => ({
        ...d,
        icon: d.visibility === 'public' ? <Globe size={20} /> : <Hash size={20} /> // Simple icon mapping
    })) : MOCK_DOMAINS;

    const isChatActive = !!activeConversationPeerId || !!activeGroupId;

    const handleSelectConversation = (type: 'dm' | 'group' | 'ai', id: string) => {
        if (type === 'dm') {
            setActiveConversation(id);
            setActiveGroup(null);
            setActiveConversationId(null);
        } else if (type === 'group') {
            setActiveGroup(id);
            setActiveConversation(null);
            setActiveConversationId(null);
        } else if (type === 'ai') {
            setActiveConversationId(id);
            setActiveConversation(null);
            setActiveGroup(null);
        }
    };

    const handleBack = () => {
        setActiveConversation(null);
        setActiveGroup(null);
        setActiveConversationId(null);
    };

    return (
        <div className="h-full w-full flex bg-background">
            {isChatActive ? (
                <div className="flex-1 flex flex-col min-w-0">
                    <button onClick={handleBack} className="p-2 text-muted-foreground hover:text-foreground">Back</button>
                    {activeConversationPeerId && <DirectMessageView />}
                    {activeGroupId && <GroupsPanel />} 
                </div>
            ) : (
                <>
                    <DomainRail activeDomainId={activeDomainId} onSelectDomain={setActiveDomainId} domains={uiDomains} />
                    <ConversationList domainId={activeDomainId} onSelectConversation={handleSelectConversation} domains={uiDomains} />
                </>
            )}
        </div>
    );
};
