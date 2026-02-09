import React from 'react';
import { useAlephStore } from '../../store/useAlephStore';
import { PostDetailView } from './views/PostDetailView';
import { GroupDetailView } from './views/GroupDetailView';
import { FeedView } from './views/FeedView';
import { GroupInfoPanel } from './components/GroupInfoPanel';
import { FeedInfoPanel } from './components/FeedInfoPanel';

export const GroupsStage: React.FC = () => {
  const {
    groups: { activeGroupId, activePostId },
    setActivePost
  } = useAlephStore();

  const renderMainContent = () => {
    if (activePostId && activeGroupId) {
      return <PostDetailView groupId={activeGroupId} postId={activePostId} onBack={() => setActivePost(null)} />;
    }
    if (activeGroupId) {
      return <GroupDetailView groupId={activeGroupId} onBack={() => {}} />;
    }
    return <FeedView />;
  };

  const renderRightPanel = () => {
    if (activeGroupId) {
      return <GroupInfoPanel />;
    }
    return <FeedInfoPanel />;
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
             <div className="flex flex-col min-h-full pb-20 max-w-4xl mx-auto w-full">
                {renderMainContent()}
             </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-80 border-l border-border bg-muted/10 hidden xl:block overflow-y-auto custom-scrollbar">
            {renderRightPanel()}
        </div>
    </div>
  );
};
