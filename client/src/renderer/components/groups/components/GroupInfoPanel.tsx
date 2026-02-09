import React from 'react';
import { useAlephStore } from '../../../store/useAlephStore';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Users, Calendar, Shield, Info } from 'lucide-react';

export const GroupInfoPanel: React.FC = () => {
  const {
    groups: { groups, activeGroupId },
    joinGroup,
    leaveGroup
  } = useAlephStore();

  const group = groups.find(g => g.id === activeGroupId);

  if (!group) return null;

  return (
    <div className="w-80 border-l border-border bg-muted/10 p-4 space-y-4 hidden lg:block h-full overflow-y-auto custom-scrollbar">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Info size={14} /> About Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{group.topic || "No description provided."}</p>
          
          <div className="grid grid-cols-2 gap-4 py-2 border-t border-border">
            <div>
              <div className="text-lg font-bold text-foreground">{group.memberCount}</div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {Math.floor(group.memberCount * 0.1) + 1}
              </div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
            <Calendar size={14} />
            <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="pt-2">
            {group.joined ? (
              <Button 
                variant="destructive" 
                className="w-full h-8 text-xs font-semibold" 
                onClick={() => leaveGroup(group.id)}
              >
                Leave
              </Button>
            ) : (
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-semibold" 
                onClick={() => joinGroup(group.id)}
              >
                Join
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground flex gap-2">
            <span className="font-bold text-muted-foreground">1.</span>
            <span>Be respectful to others.</span>
          </div>
          <div className="border-t border-border my-2" />
          <div className="text-sm text-muted-foreground flex gap-2">
            <span className="font-bold text-muted-foreground">2.</span>
            <span>No spam or self-promotion.</span>
          </div>
          <div className="border-t border-border my-2" />
          <div className="text-sm text-muted-foreground flex gap-2">
            <span className="font-bold text-muted-foreground">3.</span>
            <span>Stay on topic.</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Moderators</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" className="w-full justify-start text-xs text-primary h-8 px-2 hover:bg-primary/10 hover:text-primary">
            <Shield size={14} className="mr-2" />
            Message the mods
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
