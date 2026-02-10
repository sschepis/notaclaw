/**
 * Slash Command Parser
 * 
 * Parses user input into structured command objects.
 * Supports:
 * - /command subcommand arg1 arg2
 * - --flag and --key=value options
 * - Quoted strings for arguments with spaces
 */

import { ParsedCommand, CommandGroup } from './types';

/**
 * Check if a string starts with a slash command
 */
export function isSlashCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Tokenize input string, handling quoted strings
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse flags from tokens
 * Returns { flags, remaining } where remaining are non-flag tokens
 */
function parseFlags(tokens: string[]): {
  flags: Record<string, string | boolean>;
  remaining: string[];
} {
  const flags: Record<string, string | boolean> = {};
  const remaining: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('--')) {
      const flagPart = token.slice(2);
      if (flagPart.includes('=')) {
        const [key, ...valueParts] = flagPart.split('=');
        flags[key] = valueParts.join('=');
      } else {
        flags[flagPart] = true;
      }
    } else if (token.startsWith('-') && token.length === 2) {
      // Short flag like -v
      flags[token.slice(1)] = true;
    } else {
      remaining.push(token);
    }
  }

  return { flags, remaining };
}

/**
 * Parse a slash command string into a structured ParsedCommand
 */
export function parseCommand(input: string, groups?: CommandGroup[]): ParsedCommand {
  const trimmed = input.trim();
  
  if (!trimmed.startsWith('/')) {
    throw new Error('Command must start with /');
  }

  // Remove leading slash and tokenize
  const withoutSlash = trimmed.slice(1);
  const tokens = tokenize(withoutSlash);

  if (tokens.length === 0) {
    return {
      command: '',
      group: '',
      args: [],
      flags: {},
      raw: input,
    };
  }

  // First token is the command group
  const group = tokens[0].toLowerCase();
  
  // Parse flags from remaining tokens
  const { flags, remaining } = parseFlags(tokens.slice(1));

  // Determine subcommand and args
  let subcommand: string | undefined;
  let args: string[] = [];

  if (remaining.length > 0) {
    // Check if first remaining token is a known subcommand
    const potentialSubcommand = remaining[0].toLowerCase();
    
    // Look up the command group to see if this is a valid subcommand
    const groupDef = groups?.find(g => 
      g.name === group || g.aliases?.includes(group)
    );

    if (groupDef) {
      const isSubcommand = groupDef.subcommands.some(sc => 
        sc.name === potentialSubcommand || sc.aliases?.includes(potentialSubcommand)
      );

      if (isSubcommand) {
        subcommand = potentialSubcommand;
        args = remaining.slice(1);
      } else {
        // No matching subcommand, all remaining are args
        args = remaining;
      }
    } else {
      // Unknown group, treat first as potential subcommand
      subcommand = potentialSubcommand;
      args = remaining.slice(1);
    }
  }

  const command = subcommand ? `${group} ${subcommand}` : group;

  return {
    command,
    group,
    subcommand,
    args,
    flags,
    raw: input,
  };
}

/**
 * Parse a duration string (e.g., '5m', '1h', '30s') into minutes
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like '5m', '1h', '30s'`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return value / 60;
    case 'm': return value;
    case 'h': return value * 60;
    case 'd': return value * 60 * 24;
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Format a duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} seconds`;
  } else if (minutes < 60) {
    return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 60 * 24) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.round(minutes / (60 * 24));
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

/**
 * Extract the current incomplete token for autocomplete
 */
export function getCurrentToken(input: string, cursorPosition: number): {
  token: string;
  tokenStart: number;
  tokenEnd: number;
  isAfterSpace: boolean;
} {
  const beforeCursor = input.slice(0, cursorPosition);
  const tokens = tokenize(beforeCursor);
  
  // Check if cursor is right after a space
  const isAfterSpace = beforeCursor.endsWith(' ');
  
  if (isAfterSpace || tokens.length === 0) {
    return {
      token: '',
      tokenStart: cursorPosition,
      tokenEnd: cursorPosition,
      isAfterSpace: true,
    };
  }

  // Find the position of the last token
  const lastToken = tokens[tokens.length - 1];
  const tokenStart = beforeCursor.lastIndexOf(lastToken);
  
  return {
    token: lastToken,
    tokenStart,
    tokenEnd: cursorPosition,
    isAfterSpace: false,
  };
}

/**
 * Get the command group and subcommand being typed
 */
export function getPartialCommand(input: string): {
  group: string;
  subcommand: string;
  argIndex: number;
} {
  if (!input.startsWith('/')) {
    return { group: '', subcommand: '', argIndex: -1 };
  }

  const tokens = tokenize(input.slice(1));
  const nonFlagTokens = tokens.filter(t => !t.startsWith('-'));

  return {
    group: nonFlagTokens[0]?.toLowerCase() || '',
    subcommand: nonFlagTokens[1]?.toLowerCase() || '',
    argIndex: Math.max(0, nonFlagTokens.length - 3), // -1 for group, -1 for subcommand, -1 for current
  };
}
