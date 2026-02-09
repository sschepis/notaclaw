import React, { useEffect } from 'react';
import { useAlephStore } from '../../store/useAlephStore';
import { GroupsNavigation } from './components/GroupsNavigation';

export const GroupsPanel: React.FC = () => {
  const { loadGroups, loadFeed } = useAlephStore();

  useEffect(() => { loadGroups(); loadFeed(); }, []);

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar - now occupying the full sidebar slot */}
        <GroupsNavigation />
      </div>
    </div>
  );
};
