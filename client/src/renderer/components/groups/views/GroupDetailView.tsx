import React, { useState } from 'react';
import { MessageSquare, Bell, MoreHorizontal, Image as ImageIcon, Link as LinkIcon, ArrowUp, ArrowDown, Share2, Ghost } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent } from '../../ui/card';
import { useAlephStore } from '../../../store/useAlephStore';
import { cn, formatTimeAgo } from '@/renderer/lib/utils';

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ groupId }) => {
  const {
    groups: { groups, activeGroupPosts },
    createGroupPost, setActivePost, loadPostComments
  } = useAlephStore();

  const [postInput, setPostInput] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'members'>('posts');

  const group = groups.find(g => g.id === groupId);

  const handlePost = async () => {
    if (!postInput.trim()) return;
    await createGroupPost(groupId, postInput.trim());
    setPostInput('');
  };

  if (!group) return <div>Group not found</div>;

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Group Header */}
      <div className="bg-gray-900">
        {/* Cover Image */}
        <div className="h-32 w-full bg-gradient-to-r from-blue-900 to-purple-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        {/* Group Info Bar */}
        <div className="px-6 pb-4">
          <div className="flex items-end -mt-6 mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-gray-950 bg-gray-800 flex items-center justify-center text-3xl font-bold text-white shadow-lg z-10">
              {group.name.substring(0, 1).toUpperCase()}
            </div>
            <div className="ml-4 flex-1 mb-1">
              <h1 className="text-2xl font-bold text-white leading-none mb-1">{group.name}</h1>
              <p className="text-sm text-gray-400">r/{group.name.toLowerCase().replace(/\s+/g, '')}</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" className="h-8 rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold">
                Joined
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                <Bell size={18} />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-white/10 text-sm font-medium">
            <button 
              onClick={() => setActiveTab('posts')}
              className={cn(
                "pb-3 border-b-2 transition-colors px-1",
                activeTab === 'posts' ? "border-white text-white" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700"
              )}
            >
              Posts
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={cn(
                "pb-3 border-b-2 transition-colors px-1",
                activeTab === 'about' ? "border-white text-white" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700"
              )}
            >
              About
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={cn(
                "pb-3 border-b-2 transition-colors px-1",
                activeTab === 'members' ? "border-white text-white" : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700"
              )}
            >
              Members
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post Composer */}
          <Card className="bg-white/5 border-white/5 overflow-hidden">
            <CardContent className="p-3">
               <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex-shrink-0" />
                <Input 
                  value={postInput} 
                  onChange={e => setPostInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handlePost()}
                  placeholder="Create a post" 
                  className="bg-black/20 border-white/10 hover:bg-black/30 transition-colors focus:bg-black/40 h-10" 
                />
              </div>
              <div className="flex justify-between items-center pl-12">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                    <ImageIcon size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                    <LinkIcon size={18} />
                  </Button>
                </div>
                {postInput.trim() && (
                  <Button size="sm" onClick={handlePost} className="h-7 px-4 bg-white text-black hover:bg-gray-200 rounded-full font-semibold">
                    Post
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 mb-2">
             <Button variant="ghost" size="sm" className="h-8 rounded-full bg-white/10 text-white hover:bg-white/20 text-xs font-medium">Hot</Button>
             <Button variant="ghost" size="sm" className="h-8 rounded-full text-gray-400 hover:bg-white/10 hover:text-white text-xs font-medium">New</Button>
             <Button variant="ghost" size="sm" className="h-8 rounded-full text-gray-400 hover:bg-white/10 hover:text-white text-xs font-medium">Top</Button>
          </div>

          {/* Posts Feed */}
          <div className="space-y-3">
            {activeGroupPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/5 rounded-lg border border-white/5 border-dashed">
                <Ghost size={32} className="opacity-50 mb-3" />
                <p className="text-sm">No posts yet. Be the first to share something!</p>
              </div>
            ) : (
              activeGroupPosts.map(post => (
                <Card key={post.id} className="bg-white/5 border-white/5 hover:border-white/10 transition-all cursor-pointer group overflow-hidden">
                  <div className="flex">
                    {/* Vote Column */}
                    <div className="w-10 bg-black/20 flex flex-col items-center pt-3 gap-0.5 border-r border-white/5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 rounded">
                        <ArrowUp size={18} strokeWidth={2.5} />
                      </Button>
                      <span className="text-xs font-bold text-white">
                         {Object.values(post.reactions).reduce((a, b) => a + b, 0) || 0}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded">
                        <ArrowDown size={18} strokeWidth={2.5} />
                      </Button>
                    </div>
                    
                    <div 
                      className="flex-1 p-3 pl-4"
                      onClick={() => { setActivePost(post.id); loadPostComments(groupId, post.id); }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-medium text-white hover:underline">u/{post.authorDisplayName}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(post.timestamp)}</span>
                        </div>
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={16} />
                          </Button>
                      </div>
                      
                      <h3 className="text-base font-medium text-white mb-2 leading-snug">{post.content}</h3>
                      
                      <div className="flex items-center gap-1 mt-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:bg-white/10 gap-2 rounded-full">
                          <MessageSquare size={16} /> 
                          {post.commentCount} Comments
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:bg-white/10 gap-2 rounded-full">
                          <Share2 size={16} /> 
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="hidden lg:block space-y-4">
          <Card className="bg-white/5 border-white/5">
            <CardContent className="p-4 space-y-4">
               <div className="font-medium text-sm text-gray-400 uppercase tracking-wider">About Community</div>
               <div className="text-sm text-gray-300 leading-relaxed">
                 {group.topic || "Welcome to this community! Discuss everything related to the topic here."}
               </div>
               
               <div className="grid grid-cols-2 gap-4 py-2 border-t border-white/10">
                 <div>
                   <div className="text-lg font-bold text-white">{group.memberCount || 1}</div>
                   <div className="text-xs text-gray-500">Members</div>
                 </div>
                 <div>
                   <div className="text-lg font-bold text-white flex items-center gap-1">
                     <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                     {Math.floor((group.memberCount || 1) * 0.1) + 1}
                   </div>
                   <div className="text-xs text-gray-500">Online</div>
                 </div>
               </div>

               <div className="pt-2 border-t border-white/10 text-xs text-gray-500">
                 Created {new Date(group.createdAt).toLocaleDateString()}
               </div>
               
               <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">Create Post</Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/5">
            <CardContent className="p-4 space-y-3">
               <div className="font-medium text-sm text-gray-400 uppercase tracking-wider">Rules</div>
               <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2">
                 <li>Be respectful to others.</li>
                 <li>No spam or self-promotion.</li>
                 <li>Stay on topic.</li>
               </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
