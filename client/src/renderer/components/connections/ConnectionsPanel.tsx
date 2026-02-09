import React, { useEffect, useState } from 'react';
import { useAlephStore } from '../../store/useAlephStore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Shield, Edit2, Users, Link } from 'lucide-react';

type Tab = 'connections' | 'requests' | 'profile';

export const ConnectionsPanel: React.FC = () => {
  const {
    social: { friends, friendRequests, myProfile },
    loadFriends, loadFriendRequests, loadProfile,
    addFriend, acceptFriendRequest, rejectFriendRequest, blockUser,
    updateProfile,
  } = useAlephStore();
  const [tab, setTab] = useState<Tab>('connections');
  const [addUserId, setAddUserId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    loadProfile();
  }, []);

  const handleAddConnection = async () => {
    if (!addUserId.trim()) return;
    await addFriend(addUserId.trim());
    setAddUserId('');
  };

  const handleSaveProfile = async () => {
    await updateProfile({ displayName: editName, bio: editBio });
    setEditMode(false);
  };

  const startEditing = () => {
    setEditName(myProfile?.displayName ?? '');
    setEditBio(myProfile?.bio ?? '');
    setEditMode(true);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'connections', label: 'Connections', count: friends.length },
    { id: 'requests', label: 'Requests', count: friendRequests.length },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/20">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
              tab === t.id ? 'text-primary bg-muted/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
            }`}
          >
            {t.label} {t.count !== undefined && t.count > 0 && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Connections List */}
        {tab === 'connections' && (
          <div className="space-y-4">
            {/* Add connection input */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link size={12} className="text-muted-foreground" />
                </div>
                <input
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  placeholder="Enter Node ID to connect..."
                  className="w-full bg-muted/20 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button size="sm" onClick={handleAddConnection} disabled={!addUserId.trim()} className="bg-primary hover:bg-primary/90 h-auto px-3 shadow-lg shadow-primary/20">
                <UserPlus size={14} />
              </Button>
            </div>

            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
                <Users size={32} className="mb-3 opacity-20" />
                <p className="text-xs font-medium">No connections yet</p>
                <p className="text-[10px] opacity-60 mt-1">Add a Node ID above to connect</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <AnimatePresence>
                  {friends.map((friend, i) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/30 hover:border-muted-foreground/30 transition-all group cursor-pointer"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-background shadow-lg">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {friend.displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                          friend.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                          friend.status === 'away' ? 'bg-amber-500' : 'bg-muted'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-foreground transition-colors">{friend.displayName}</p>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded border border-border">
                            ℵ {friend.resonance.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground capitalize mt-0.5 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${friend.status === 'online' ? 'bg-emerald-500/50' : 'bg-muted/50'}`} />
                          {friend.status}
                        </p>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); blockUser(friend.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                        title="Block Connection"
                      >
                        <Shield size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {friendRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs border-2 border-dashed border-border rounded-xl">
                No pending requests
              </div>
            ) : (
              friendRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-amber-900 to-orange-900 text-white text-xs font-bold">
                      {req.fromDisplayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{req.fromDisplayName}</p>
                    {req.message && <p className="text-xs text-muted-foreground truncate mt-0.5">"{req.message}"</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(req.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptFriendRequest(req.id)} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-lg shadow-emerald-900/20">
                      <Check size={14} />
                    </Button>
                    <Button size="sm" onClick={() => rejectFriendRequest(req.id)} className="h-8 w-8 p-0 bg-destructive/20 hover:bg-destructive/40 text-destructive hover:text-destructive-foreground rounded-full">
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && myProfile && (
          <div className="space-y-6">
            <div className="flex flex-col items-center p-6 bg-gradient-to-b from-muted/20 to-transparent rounded-2xl border border-border">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-2xl">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-3xl font-bold">
                    {myProfile.displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button onClick={startEditing} className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg border-2 border-background">
                  <Edit2 size={14} />
                </button>
              </div>

              <div className="text-center w-full">
                {editMode ? (
                  <div className="space-y-3 w-full max-w-xs mx-auto animate-in fade-in zoom-in-95 duration-200">
                    <input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center focus:border-primary/50 focus:outline-none" 
                      placeholder="Display Name"
                    />
                    <textarea 
                      value={editBio} 
                      onChange={e => setEditBio(e.target.value)} 
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs text-foreground h-20 resize-none focus:border-primary/50 focus:outline-none" 
                      placeholder="Bio"
                    />
                    <div className="flex gap-2 justify-center pt-2">
                      <Button size="sm" onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90 text-xs px-4">Save Changes</Button>
                      <Button size="sm" onClick={() => setEditMode(false)} className="bg-muted hover:bg-muted/80 text-xs px-4">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">{myProfile.displayName}</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">{myProfile.bio || 'No bio set.'}</p>
                    
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                        {myProfile.tier}
                      </span>
                      <span className="px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-[10px] font-bold uppercase tracking-wider border border-secondary/30">
                        Rep: {myProfile.reputation}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats / Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-card rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Joined</p>
                <p className="text-sm text-foreground mt-1">{new Date(myProfile.joinedAt).toLocaleDateString()}</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Node ID</p>
                <p className="text-sm text-foreground mt-1 font-mono truncate opacity-60">7f8a9...2b1c</p>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3 pl-1">Connected Identities</h4>
              {myProfile.links.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">No external identities linked.</p>
              ) : (
                <div className="space-y-2">
                  {myProfile.links.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors group">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Link size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{link.title}</p>
                        <a href={link.url} className="text-[10px] text-muted-foreground hover:text-primary truncate block transition-colors">{link.url}</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
