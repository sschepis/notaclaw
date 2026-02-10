/**
 * Desktop Accessibility Learner - OS Accessibility API Extractor
 * Extracts UI elements using native OS accessibility APIs.
 * 
 * macOS: Uses AppleScript + System Events
 * Windows: Uses UIAutomation (future)
 * Linux: Uses AT-SPI (future)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  DesktopTarget, 
  ActiveApplication, 
  DesktopElementRole
} from './types';

const execAsync = promisify(exec);

// ─── Role Mapping ────────────────────────────────────────────────────────

const MACOS_ROLE_MAP: Record<string, DesktopElementRole> = {
  'AXButton': 'button',
  'AXLink': 'link',
  'AXTextField': 'input',
  'AXTextArea': 'textarea',
  'AXCheckBox': 'checkbox',
  'AXRadioButton': 'radio',
  'AXPopUpButton': 'select',
  'AXMenu': 'menu',
  'AXMenuItem': 'menuitem',
  'AXTabGroup': 'tab',
  'AXSlider': 'slider',
  'AXImage': 'image',
  'AXStaticText': 'text',
  'AXHeading': 'heading',
  'AXToolbar': 'toolbar',
  'AXSheet': 'dialog',
  'AXWindow': 'window',
};

function mapRole(axRole: string): DesktopElementRole {
  return MACOS_ROLE_MAP[axRole] || 'unknown';
}

// ─── macOS AppleScript Extractor ─────────────────────────────────────────

/**
 * Get the currently active application.
 */
export async function getActiveApplication(): Promise<ActiveApplication> {
  const script = `
    tell application "System Events"
      set frontApp to first application process whose frontmost is true
      set appName to name of frontApp
      set bundleId to bundle identifier of frontApp
      try
        set windowName to name of front window of frontApp
      on error
        set windowName to ""
      end try
      return appName & "|" & bundleId & "|" & windowName
    end tell
  `;
  
  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    const [name, bundleId, windowTitle] = stdout.trim().split('|');
    
    return {
      name: name || 'Unknown',
      bundleId: bundleId || undefined,
      windowTitle: windowTitle || ''
    };
  } catch (error) {
    console.warn('[AccessibilityExtractor] Failed to get active app:', error);
    return { name: 'Unknown', windowTitle: '' };
  }
}

/**
 * Get list of all running applications with their process IDs.
 */
export async function getRunningApplications(): Promise<{ name: string; pid: number }[]> {
  const script = `
    tell application "System Events"
      set appList to ""
      repeat with p in (every application process where background only is false)
        set appList to appList & name of p & "|" & unix id of p & linefeed
      end repeat
      return appList
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    return stdout.trim().split('\n')
      .filter(line => line.includes('|'))
      .map(line => {
        const [name, pid] = line.split('|');
        return { name: name.trim(), pid: parseInt(pid.trim(), 10) };
      });
  } catch (error) {
    console.warn('[AccessibilityExtractor] Failed to list running apps:', error);
    return [];
  }
}

/**
 * Extract accessibility tree from the current application.
 * Returns a list of interactive elements.
 */
export async function extractAccessibilityTree(
  options: { maxElements?: number, targetAppName?: string } = {}
): Promise<DesktopTarget[]> {
  const maxElements = options.maxElements || 100;
  
  // If targetAppName is provided, we assume it's the EXACT name resolved by the caller
  // The caller (DesktopAccessibilityLearner) is responsible for fuzzy matching first.
  const targetAppScript = options.targetAppName 
    ? `
      try
        set frontApp to application process "${options.targetAppName.replace(/"/g, '\\"')}"
      on error
        return "ERROR: App not found"
      end try
      
      -- Bring app to front to ensure visibility for vision fallback
      try
        set frontmost of frontApp to true
        delay 0.5 -- Wait for focus switch animation
      end try
      `
    : `set frontApp to first application process whose frontmost is true`;

  const script = `
    set output to ""
    set elementCount to 0
    set maxCount to ${maxElements}
    
    tell application "System Events"
      ${targetAppScript}
      
      set appName to name of frontApp
      
      try
        if (count of windows of frontApp) = 0 then
           return appName & linefeed & "No Window" & linefeed & ""
        end if

        set frontWindow to window 1 of frontApp
        set windowName to name of frontWindow
        
        -- Get all UI elements (limited depth for performance)
        set allElements to entire contents of frontWindow
        
        repeat with elem in allElements
          if elementCount ≥ maxCount then exit repeat
          
          try
            set elemRole to role of elem
            
            -- Only process interactive elements
            if elemRole is in {"AXButton", "AXLink", "AXTextField", "AXTextArea", "AXCheckBox", "AXRadioButton", "AXPopUpButton", "AXMenuItem", "AXSlider"} then
              set elemTitle to ""
              try
                set elemTitle to title of elem
              end try
              if elemTitle is "" then
                try
                  set elemTitle to description of elem
                end try
              end if
              if elemTitle is "" then
                try
                  set elemTitle to value of elem
                end try
              end if
              
              set elemPos to {0, 0}
              set elemSize to {0, 0}
              try
                set elemPos to position of elem
                set elemSize to size of elem
              end try
              
              -- Format: role|title|x|y|width|height
              set output to output & elemRole & "|" & elemTitle & "|" & (item 1 of elemPos) & "|" & (item 2 of elemPos) & "|" & (item 1 of elemSize) & "|" & (item 2 of elemSize) & linefeed
              set elementCount to elementCount + 1
            end if
          end try
        end repeat
        
        return appName & linefeed & windowName & linefeed & output
      on error errMsg
        return appName & linefeed & "Error: " & errMsg & linefeed & ""
      end try
    end tell
  `;
  
  try {
    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 8000 // Increased timeout for background apps
    });
    
    if (stdout.startsWith("ERROR:")) {
        console.warn('[AccessibilityExtractor]', stdout);
        return [];
    }

    return parseAppleScriptOutput(stdout);
  } catch (error) {
    console.warn('[AccessibilityExtractor] Failed to extract a11y tree:', error);
    return [];
  }
}

/**
 * Parse the AppleScript output into DesktopTarget objects.
 */
function parseAppleScriptOutput(output: string): DesktopTarget[] {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];
  
  const appName = lines[0];
  const windowTitle = lines[1];
  const targets: DesktopTarget[] = [];
  const now = Date.now();
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split('|');
    if (parts.length < 6) continue;
    
    const [axRole, label, xStr, yStr, widthStr, heightStr] = parts;
    const x = parseInt(xStr, 10) || 0;
    const y = parseInt(yStr, 10) || 0;
    const width = parseInt(widthStr, 10) || 0;
    const height = parseInt(heightStr, 10) || 0;
    
    const role = mapRole(axRole);
    
    // Generate stable ID based on app, role, and approximate position
    const id = generateTargetId(appName, windowTitle, role, label, x, y);
    
    targets.push({
      id,
      appName,
      windowTitle,
      role,
      label: label || `${role} at (${x}, ${y})`,
      bounds: { x, y, width, height },
      clickPoint: { x: x + width / 2, y: y + height / 2 },
      confidence: 0.9, // High confidence from a11y API
      source: 'a11y',
      firstSeen: now,
      lastSeen: now,
      hitCount: 0,
      missCount: 0,
      depth: 0
    });
  }
  
  return targets;
}

/**
 * Generate a stable ID for a target.
 * Uses app name, role, label, and approximate position to create uniqueness.
 */
function generateTargetId(
  appName: string, 
  _windowTitle: string, 
  role: DesktopElementRole, 
  label: string, 
  x: number, 
  y: number
): string {
  // Normalize and sanitize
  const normalizedApp = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
  
  // Use position bucket (50px grid) for stability across minor layout changes
  const xBucket = Math.floor(x / 50);
  const yBucket = Math.floor(y / 50);
  
  return `${normalizedApp}_${role}_${normalizedLabel}_${xBucket}_${yBucket}`;
}

/**
 * Check if accessibility permissions are granted.
 */
export async function checkAccessibilityPermission(): Promise<boolean> {
  const script = `
    tell application "System Events"
      try
        set frontApp to first application process whose frontmost is true
        set testAccess to name of frontApp
        return "granted"
      on error
        return "denied"
      end try
    end tell
  `;
  
  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    return stdout.trim() === 'granted';
  } catch {
    return false;
  }
}

/**
 * Get screen size from primary display.
 */
export async function getScreenSize(): Promise<{ width: number; height: number }> {
  const script = `
    tell application "Finder"
      set screenBounds to bounds of window of desktop
      return (item 3 of screenBounds) & "x" & (item 4 of screenBounds)
    end tell
  `;
  
  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const [width, height] = stdout.trim().split('x').map(Number);
    return { width: width || 1920, height: height || 1080 };
  } catch {
    return { width: 1920, height: 1080 }; // Default fallback
  }
}
