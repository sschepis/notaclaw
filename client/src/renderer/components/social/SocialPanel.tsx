import React, { useEffect, useState } from 'react';
import { useAlephStore } from '../../store/useAlephStore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Shield, Edit2, Users } from 'lucide-react';

type Tab = 'friends' | 'requests' | 'profile';

export const SocialPanel: React.FC = () => {
  const {
    social: { friends, friendRequests, myProfile },
    loadFriends, loadFriendRequests, loadProfile,
    addFriend, acceptFriendRequest, rejectFriendRequest, blockUser,
    updateProfile,
  } = useAlephStore();
  const [tab, setTab] = useState<Tab>('friends');
  const [addUserId, setAddUserId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    loadProfile();
  }, []);

  const handleAddFriend = async () => {
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
    { id: 'friends', label: 'Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: friendRequests.length },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-white/5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
              tab === t.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label} {t.count !== undefined && t.count > 0 && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Friends List */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {/* Add friend input */}
            <div className="flex gap-2 mb-4">
              <input
                value={addUserId}
                onChange={e => setAddUserId(e.target.value)}
                placeholder="Enter user ID to add..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <Button size="sm" onClick={handleAddFriend} disabled={!addUserId.trim()} className="bg-blue-600 hover:bg-blue-700 h-7 px-2">
                <UserPlus size={12} />
              </Button>
            </div>

            {friends.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                <Users size={24} className="mx-auto mb-2 opacity-40" />
                <p>No friends yet. Add someone above!</p>
              </div>
            ) : (
              <AnimatePresence>
                {friends.map((friend, i) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-blue-900 to-purple-900 text-white text-xs font-bold">
                          {friend.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-950 ${
                        friend.status === 'online' ? 'bg-emerald-500' : friend.status === 'away' ? 'bg-amber-500' : 'bg-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{friend.displayName}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{friend.status} • ℵ {friend.resonance.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => blockUser(friend.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-400 transition-all"
                      title="Block user"
                    >
                      <Shield size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Friend Requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {friendRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">No pending requests.</div>
            ) : (
              friendRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-amber-900 to-orange-900 text-white text-xs font-bold">
                      {req.fromDisplayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">{req.fromDisplayName}</p>
                    {req.message && <p className="text-[10px] text-gray-400 truncate">{req.message}</p>}
                    <p className="text-[9px] text-gray-600">{new Date(req.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => acceptFriendRequest(req.id)} className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700">
                      <Check size={12} />
                    </Button>
                    <Button size="sm" onClick={() => rejectFriendRequest(req.id)} className="h-7 w-7 p-0 bg-red-600/50 hover:bg-red-600">
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && myProfile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-blue-800 to-purple-800 text-white text-xl font-bold">
                  {myProfile.displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {editMode ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white h-16 resize-none" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveProfile} className="h-6 text-[10px] bg-blue-600">Save</Button>
                      <Button size="sm" onClick={() => setEditMode(false)} className="h-6 text-[10px] bg-gray-700">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{myProfile.displayName}</h3>
                      <button onClick={startEditing} className="p-1 hover:bg-white/10 rounded"><Edit2 size={12} className="text-gray-400" /></button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{myProfile.bio || 'No bio set.'}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full font-medium">{myProfile.tier}</span>
                      <span>Rep: {myProfile.reputation}</span>
                      <span>Joined {new Date(myProfile.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Profile Links</h4>
              {myProfile.links.length === 0 ? (
                <p className="text-xs text-gray-600">No links added.</p>
              ) : (
                myProfile.links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-white/5 text-xs text-blue-400 mb-1">
                    <span className="truncate flex-1">{link.title}</span>
                    <a href={link.url} className="text-[10px] text-gray-500 hover:text-blue-400 truncate">{link.url}</a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
