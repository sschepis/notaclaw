/**
 * Slash Command System Types
 * 
 * Provides typed infrastructure for chat-based slash commands
 * like /agent, /friend, /group, /settings, etc.
 */

import { LucideIcon } from 'lucide-react';

/** Result of parsing a slash command */
export interface ParsedCommand {
  /** The full command path, e.g., 'agent add' */
  command: string;
  /** The main command group, e.g., 'agent' */
  group: string;
  /** The subcommand, e.g., 'add' */
  subcommand?: string;
  /** Positional arguments */
  args: string[];
  /** Named flags/options (--key=value or --flag) */
  flags: Record<string, string | boolean>;
  /** The raw input string */
  raw: string;
}

/** Context provided to command handlers */
export interface CommandContext {
  /** The parsed command details */
  parsed: ParsedCommand;
  /** Active conversation ID */
  conversationId: string | null;
  /** Function to add a system message to the chat */
  addSystemMessage: (content: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  /** Function to show a toast notification */
  showToast?: (message: string, type?: 'info' | 'success' | 'error') => void;
  /** Current user identity (public key, nickname, etc.) */
  identity?: {
    publicKey: string;
    nickname?: string;
  };
}

/** Result of command execution */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Message to display to the user */
  message?: string;
  /** Optional data returned by the command */
  data?: any;
  /** If true, suppress the default message display */
  silent?: boolean;
}

/** Parameter definition for command arguments */
export interface CommandParameter {
  /** Parameter name */
  name: string;
  /** Description for help text */
  description: string;
  /** Whether this parameter is required */
  required: boolean;
  /** Type hint for autocomplete */
  type: 'string' | 'number' | 'user_id' | 'model' | 'group_id' | 'channel' | 'duration';
  /** Default value if not provided */
  default?: string | number;
  /** For 'duration' type, example: '5m', '1h', '30s' */
  example?: string;
}

/** Flag definition for command options */
export interface CommandFlag {
  /** Flag name (without --) */
  name: string;
  /** Short alias (single character, without -) */
  alias?: string;
  /** Description for help text */
  description: string;
  /** Whether this flag takes a value or is boolean */
  hasValue: boolean;
  /** Default value */
  default?: string | boolean;
}

/** Definition of a single command or subcommand */
export interface CommandDefinition {
  /** Command name (e.g., 'add' for /agent add) */
  name: string;
  /** Aliases (e.g., ['a'] for /agent a) */
  aliases?: string[];
  /** Description for help text */
  description: string;
  /** Usage example */
  usage: string;
  /** Positional parameters */
  parameters?: CommandParameter[];
  /** Optional flags */
  flags?: CommandFlag[];
  /** The handler function */
  handler: (context: CommandContext) => Promise<CommandResult>;
  /** Icon for autocomplete display */
  icon?: LucideIcon;
  /** Required permissions/capabilities */
  requiredCapabilities?: string[];
}

/** Definition of a command group (e.g., /agent, /friend) */
export interface CommandGroup {
  /** Group name (e.g., 'agent') */
  name: string;
  /** Aliases (e.g., ['a'] for /a instead of /agent) */
  aliases?: string[];
  /** Description for help text */
  description: string;
  /** Icon for display */
  icon?: LucideIcon;
  /** Subcommands in this group */
  subcommands: CommandDefinition[];
  /** Default subcommand if none specified */
  defaultSubcommand?: string;
}

/** Suggestion for autocomplete */
export interface CommandSuggestion {
  /** The text to insert */
  text: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Icon */
  icon?: LucideIcon;
  /** Category for grouping */
  category?: string;
  /** Whether this completes the command or just a part */
  isComplete: boolean;
  /** Cursor offset after insertion (0 = end, -n = n chars before end) */
  cursorOffset?: number;
}

/** State for the command input UI */
export interface CommandInputState {
  /** Whether command mode is active (input starts with /) */
  isCommandMode: boolean;
  /** Current suggestions to display */
  suggestions: CommandSuggestion[];
  /** Currently selected suggestion index */
  selectedIndex: number;
  /** Whether suggestions popup is visible */
  showSuggestions: boolean;
  /** Error message if command is invalid */
  error?: string;
  /** Currently parsed command (partial) */
  partialCommand?: Partial<ParsedCommand>;
}
