import React from 'react';
import { Flame, Info, Home, Plus, ArrowUpRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export const FeedInfoPanel: React.FC = () => {
  return (
    <div className="w-80 border-l border-border bg-muted/10 p-4 space-y-4 hidden lg:block h-full overflow-y-auto custom-scrollbar">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Home size={14} /> Home
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your personal AlephNet frontpage. Come here to check in with your favorite communities.
          </p>
          <div className="space-y-2">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">Create Post</Button>
            <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground">Create Community</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2 bg-muted/20 border-b border-border">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Flame size={14} /> Trending Communities
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-xs border border-border">
                  r/T
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground group-hover:underline decoration-foreground/50 underline-offset-2">r/technology</div>
                  <div className="text-xs text-muted-foreground">125k members</div>
                </div>
              </div>
              <Button size="sm" className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3">Join</Button>
            </div>
          ))}
        </div>
        <div className="p-2">
           <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground h-8">
             View All
           </Button>
        </div>
      </Card>

      <div className="mt-4 p-4 rounded-lg border border-border bg-muted/10">
        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-muted-foreground mb-4">
           <a href="#" className="hover:underline">User Agreement</a>
           <a href="#" className="hover:underline">Privacy Policy</a>
           <a href="#" className="hover:underline">Content Policy</a>
           <a href="#" className="hover:underline">Moderator Code</a>
        </div>
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          AlephNet © 2024. All rights reserved.
        </div>
      </div>
    </div>
  );
};
