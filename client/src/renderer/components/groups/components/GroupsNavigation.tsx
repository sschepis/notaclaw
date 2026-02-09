import React, { useState } from 'react';
import { Home, Flame, Plus, Search, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { useAlephStore } from '../../../store/useAlephStore';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { cn } from '@/renderer/lib/utils';

export const GroupsNavigation: React.FC = () => {
  const {
    groups: { groups, activeGroupId },
    setActiveGroup,
    createGroup
  } = useAlephStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newVisibility, setNewVisibility] = useState<'public' | 'private' | 'restricted'>('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    communities: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCreateGroup = async () => {
    if (!newName.trim()) return;
    await createGroup(newName, newTopic, newVisibility);
    setIsCreateOpen(false);
    setNewName('');
    setNewTopic('');
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock favorites for now - in reality this would be in the store
  const favoriteGroups = filteredGroups.slice(0, 3); 
  const otherGroups = filteredGroups.slice(3);

  return (
    <div className="w-full border-r border-white/5 bg-gray-950/50 flex flex-col h-full">
      {/* Header / Search */}
      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search communities..." 
            className="pl-8 h-9 bg-black/20 border-white/5 text-sm focus:border-blue-500/50 transition-colors"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 h-9", 
              !activeGroupId && "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            )}
            onClick={() => setActiveGroup(null)}
          >
            <Home size={16} className="mr-2" />
            Home
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 h-9"
          >
            <Flame size={16} className="mr-2" />
            Popular
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar">
        {/* Favorites Section */}
        {favoriteGroups.length > 0 && (
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('favorites')}
              className="flex items-center w-full px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              {expandedSections.favorites ? <ChevronDown size={12} className="mr-1" /> : <ChevronRight size={12} className="mr-1" />}
              Favorites
            </button>
            
            {expandedSections.favorites && (
              <div className="space-y-0.5">
                {favoriteGroups.map(group => (
                  <Button
                    key={group.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 h-8 px-2 truncate",
                      activeGroupId === group.id && "bg-white/10 text-white font-medium"
                    )}
                    onClick={() => setActiveGroup(group.id)}
                  >
                    <Star size={14} className="mr-2 shrink-0 text-yellow-500/50" />
                    <span className="truncate text-sm">{group.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Communities Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 group">
            <button 
              onClick={() => toggleSection('communities')}
              className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              {expandedSections.communities ? <ChevronDown size={12} className="mr-1" /> : <ChevronRight size={12} className="mr-1" />}
              Communities
            </button>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create a Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Name</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">r/</span>
                      <Input 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        placeholder="community"
                        className="pl-7 bg-black/40 border-gray-700 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Community names including capitalization cannot be changed.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Topic</label>
                    <Input 
                      value={newTopic} 
                      onChange={e => setNewTopic(e.target.value)} 
                      placeholder="What is this community about?"
                      className="bg-black/40 border-gray-700 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Privacy</label>
                    <select 
                      value={newVisibility} 
                      onChange={e => setNewVisibility(e.target.value as any)}
                      className="w-full h-10 rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="restricted">Restricted</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      {newVisibility === 'public' && "Anyone can view, post, and comment to this community."}
                      {newVisibility === 'private' && "Only approved users can view and submit to this community."}
                      {newVisibility === 'restricted' && "Anyone can view this community, but only approved users can post."}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="hover:bg-white/10">Cancel</Button>
                  <Button onClick={handleCreateGroup} disabled={!newName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">Create Community</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {expandedSections.communities && (
            <div className="space-y-0.5">
              {otherGroups.length === 0 && favoriteGroups.length === 0 ? (
                <div className="px-2 py-4 text-center text-xs text-gray-600">
                  No communities found
                </div>
              ) : (
                otherGroups.map(group => (
                  <Button
                    key={group.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 h-8 px-2 truncate",
                      activeGroupId === group.id && "bg-white/10 text-white font-medium"
                    )}
                    onClick={() => setActiveGroup(group.id)}
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mr-2 shrink-0 flex items-center justify-center text-[8px] font-bold text-white">
                      {group.name.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate text-sm">{group.name}</span>
                  </Button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
