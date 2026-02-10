/**
 * Hook for managing the slash command system
 */
import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  parseCommand, 
  isSlashCommand, 
  getPartialCommand,
  getCurrentToken
} from './parser';
import { 
  findCommand, 
  commandGroups 
} from './registry';
import { 
  CommandSuggestion, 
  CommandContext
} from './types';

export function useCommandSystem() {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { addMessage, activeConversationId } = useAppStore();

  // Generate suggestions based on input
  const updateSuggestions = useCallback((input: string, cursorPosition: number) => {
    if (!input.startsWith('/')) {
      setShowSuggestions(false);
      return;
    }

    const { group, subcommand, argIndex } = getPartialCommand(input);
    const { isAfterSpace } = getCurrentToken(input, cursorPosition);
    
    let newSuggestions: CommandSuggestion[] = [];

    // Level 1: Suggesting Command Groups (e.g., /agent, /friend)
    if (argIndex === -1 && !isAfterSpace && group) {
      // User is typing the group name (e.g. /ag...)
      newSuggestions = commandGroups
        .filter(g => g.name.startsWith(group) || g.aliases?.some(a => a.startsWith(group)))
        .map(g => ({
          text: `/${g.name} `,
          label: `/${g.name}`,
          description: g.description,
          icon: g.icon,
          isComplete: false,
          category: 'Commands'
        }));
    } 
    // Level 1 (Empty): Show all groups
    else if (input === '/') {
      newSuggestions = commandGroups.map(g => ({
        text: `/${g.name} `,
        label: `/${g.name}`,
        description: g.description,
        icon: g.icon,
        isComplete: false,
        category: 'Commands'
      }));
    }
    // Level 2: Suggesting Subcommands (e.g., /agent a...)
    else if (argIndex === 0 && group) {
      const groupDef = commandGroups.find(g => g.name === group || g.aliases?.includes(group));
      
      if (groupDef) {
        // Filter subcommands
        const filterText = subcommand || '';
        newSuggestions = groupDef.subcommands
          .filter(s => s.name.startsWith(filterText) || s.aliases?.some(a => a.startsWith(filterText)))
          .map(s => ({
            text: s.name + ' ',
            label: s.name,
            description: s.description,
            icon: s.icon,
            isComplete: false,
            category: groupDef.name
          }));
      }
    }

    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    setSelectedIndex(0);
  }, []);

  // Execute a command
  const executeCommand = useCallback(async (input: string): Promise<boolean> => {
    if (!isSlashCommand(input)) return false;

    try {
      const parsed = parseCommand(input, commandGroups);
      
      // Find the handler
      const found = findCommand(parsed.group, parsed.subcommand);
      
      if (!found) {
        addMessage({
          id: Date.now().toString(),
          content: `Unknown command: /${parsed.group}`,
          type: 'meta',
          sender: 'agent', // System sender
          timestamp: new Date().toLocaleTimeString(),
        });
        return true;
      }

      const { group, subcommand } = found;

      // If we found a group but no subcommand, and the group has subcommands, show help
      if (!subcommand && group.subcommands.length > 0) {
         addMessage({
          id: Date.now().toString(),
          content: `Usage for /${group.name}:\n${group.subcommands.map((s: any) => `• ${s.usage}: ${s.description}`).join('\n')}`,
          type: 'meta',
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString(),
        });
        return true;
      }

      if (subcommand) {
        const context: CommandContext = {
          parsed,
          conversationId: activeConversationId,
          addSystemMessage: (content, type) => {
             addMessage({
              id: Date.now().toString(),
              content,
              type: 'meta',
              sender: 'agent',
              timestamp: new Date().toLocaleTimeString(),
              metadata: { type }
            });
          }
        };

        const result = await subcommand.handler(context);

        if (!result.silent && result.message) {
           addMessage({
              id: Date.now().toString(),
              content: result.message,
              type: 'meta',
              sender: 'agent',
              timestamp: new Date().toLocaleTimeString(),
              metadata: { success: result.success }
            });
        }
      }

      return true;
    } catch (error: any) {
       addMessage({
          id: Date.now().toString(),
          content: `Error executing command: ${error.message}`,
          type: 'meta',
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString(),
          metadata: { error: true }
        });
      return true;
    }
  }, [addMessage, activeConversationId]);

  return {
    suggestions,
    showSuggestions,
    selectedIndex,
    setSelectedIndex,
    updateSuggestions,
    executeCommand,
    setShowSuggestions
  };
}
