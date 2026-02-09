import React, { useState } from 'react';
import { useAlephStore } from '../../../store/useAlephStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent } from '../../ui/card';
import { Flame, Star, Clock, ArrowUp, MessageSquare, Share2, Image, Link, MoreHorizontal, Ghost, ArrowDown } from 'lucide-react';
import { cn, formatTimeAgo } from '@/renderer/lib/utils';

export const FeedView: React.FC = () => {
  const {
    groups: { feed, groups },
  } = useAlephStore();

  const [sortBy, setSortBy] = useState<'hot' | 'best' | 'new' | 'top'>('hot');

  const getGroupName = (sourceId: string) => {
    const group = groups.find(g => g.id === sourceId);
    return group ? group.name : 'Unknown Community';
  };

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Create Post Input */}
      <div className="p-4">
        <Card className="bg-card border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/80 flex-shrink-0" />
            <Input 
              placeholder="Create Post" 
              className="bg-muted/20 border-border hover:bg-muted/30 transition-colors focus:bg-muted/40" 
            />
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
              <Image size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
              <Link size={20} />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between px-4 pb-2 sticky top-0 z-10 backdrop-blur-md bg-background/80 pt-2">
        <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortBy('hot')}
            className={cn(
              "text-xs font-medium h-7 px-3 rounded-md transition-all", 
              sortBy === 'hot' ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Flame size={14} className="mr-1.5" /> Hot
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortBy('best')}
            className={cn(
              "text-xs font-medium h-7 px-3 rounded-md transition-all", 
              sortBy === 'best' ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Star size={14} className="mr-1.5" /> Best
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortBy('new')}
            className={cn(
              "text-xs font-medium h-7 px-3 rounded-md transition-all", 
              sortBy === 'new' ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Clock size={14} className="mr-1.5" /> New
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortBy('top')}
            className={cn(
              "text-xs font-medium h-7 px-3 rounded-md transition-all", 
              sortBy === 'top' ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <ArrowUp size={14} className="mr-1.5" /> Top
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 px-4 space-y-4">
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <Ghost size={32} className="opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Your feed is empty</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Join some communities to see content here, or create your own!
            </p>
          </div>
        ) : (
          feed.map(item => (
            <Card key={item.id} className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
              <div className="flex">
                {/* Vote Column */}
                <div className="w-12 bg-muted/20 flex flex-col items-center pt-3 gap-1 border-r border-border">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                    <ArrowUp size={20} strokeWidth={2.5} />
                  </Button>
                  <span className="text-xs font-bold text-foreground">
                    {/* Mock vote count */}
                    {Math.floor(Math.random() * 1000)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors">
                    <ArrowDown size={20} strokeWidth={2.5} />
                  </Button>
                </div>

                {/* Content Column */}
                <div className="flex-1 p-3 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {/* Community Icon */}
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                        {getGroupName(item.sourceId).substring(0, 1).toUpperCase()}
                      </div>
                      <span className="font-bold text-foreground hover:underline cursor-pointer">
                        r/{getGroupName(item.sourceId)}
                      </span>
                      <span>•</span>
                      <span className="hover:underline cursor-pointer">
                        u/{String(item.metadata?.authorDisplayName || 'user')}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal size={16} />
                    </Button>
                  </div>

                  <h3 className="text-lg font-medium text-foreground mb-2 leading-snug">{item.content}</h3>

                  {/* Placeholder for richer content/preview */}
                  {/* <div className="h-48 bg-black/40 rounded-md mb-3 border border-white/5"></div> */}

                  <div className="flex items-center gap-1 mt-3">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted gap-2 rounded-full">
                      <MessageSquare size={16} /> 
                      {/* Mock comment count */}
                      {Math.floor(Math.random() * 50)} Comments
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted gap-2 rounded-full">
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
  );
};
