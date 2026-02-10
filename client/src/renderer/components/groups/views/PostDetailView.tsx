import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Share2, MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { useAlephStore } from '../../../store/useAlephStore';
import { cn, formatTimeAgo } from '@/renderer/lib/utils';

interface PostDetailViewProps {
  groupId: string;
  postId: string;
  onBack: () => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({ groupId, postId, onBack }) => {
  const {
    groups: { activeGroupPosts, activePostComments },
    commentOnPost
  } = useAlephStore();

  const [commentInput, setCommentInput] = useState('');

  const post = activeGroupPosts.find(p => p.id === postId);

  const handleComment = async () => {
    if (!commentInput.trim()) return;
    await commentOnPost(groupId, postId, commentInput.trim());
    setCommentInput('');
  };

  if (!post) return <div>Post not found</div>;

  return (
    <div className="flex flex-col min-h-full bg-gray-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex items-center gap-4 p-3 bg-gray-950/90 backdrop-blur-md border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{post.content}</h2>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>u/{post.authorDisplayName}</span>
            <span>•</span>
            <span>{formatTimeAgo(post.timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
        {/* Main Post */}
        <Card className="bg-white/5 border-white/5 overflow-hidden">
          <div className="flex">
             {/* Vote Column */}
             <div className="w-12 bg-black/20 flex flex-col items-center pt-3 gap-0.5 border-r border-white/5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 rounded">
                  <ArrowUp size={20} strokeWidth={2.5} />
                </Button>
                <span className="text-sm font-bold text-white">
                    {Object.values(post.reactions).reduce((a, b) => a + b, 0) || 0}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded">
                  <ArrowDown size={20} strokeWidth={2.5} />
                </Button>
              </div>

              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {post.authorDisplayName.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="text-xs font-medium text-white">u/{post.authorDisplayName}</div>
                  <div className="text-xs text-gray-500">• {formatTimeAgo(post.timestamp)}</div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 ml-auto hover:text-white">
                    <MoreHorizontal size={16} />
                  </Button>
                </div>

                <div className="text-lg text-gray-100 mb-4 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-400 hover:bg-white/10 gap-2 rounded-full">
                    <MessageSquare size={16} />
                    <span>{post.commentCount} Comments</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-400 hover:text-white hover:bg-white/5 gap-2 ml-auto rounded-full text-xs">
                    <Share2 size={16} />
                    <span>Share</span>
                  </Button>
                </div>
              </div>
          </div>
        </Card>

        {/* Comment Input */}
        <Card className="bg-white/5 border-white/5">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-white mb-2">Comment as <span className="text-blue-400">Current User</span></div>
            <div className="relative">
              <textarea
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment();
                  }
                }}
                placeholder="What are your thoughts?"
                className="w-full min-h-[100px] bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-y"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                 <Button size="sm" onClick={handleComment} disabled={!commentInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-4 rounded-full text-xs font-semibold">
                  Comment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        <div className="space-y-0">
          {activePostComments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
               <MessageSquare size={24} className="mx-auto mb-2 opacity-20" />
               No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            activePostComments.map((comment, index) => (
              <div key={comment.id} className={cn("flex gap-3 p-4", index !== activePostComments.length - 1 && "border-b border-white/5")}>
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center text-xs text-gray-300 font-bold border border-white/5">
                    {comment.authorDisplayName.substring(0, 1).toUpperCase()}
                  </div>
                  {/* Thread line could go here */}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white hover:underline cursor-pointer">u/{comment.authorDisplayName}</span>
                    <span className="text-[10px] text-gray-500">• {formatTimeAgo(comment.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-2">{comment.content}</p>
                  
                  <div className="flex items-center gap-3">
                    <button className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                      <ArrowUp size={14} /> 
                      <span className="font-normal">Vote</span>
                    </button>
                    <button className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                      <MessageSquare size={14} /> 
                      <span className="font-normal">Reply</span>
                    </button>
                    <button className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                      <Share2 size={14} /> 
                      <span className="font-normal">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
