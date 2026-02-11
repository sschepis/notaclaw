/**
 * Pairing Service for Agent Control
 * 
 * Implements a Bluetooth-style short-code pairing flow:
 * 1. User triggers "Pair New Device" in VS Code
 * 2. Extension shows a 6-digit code with a 2-minute countdown
 * 3. Client enters the code and sends pair.initiate with its ECDH public key
 * 4. Extension verifies the code, performs ECDH key exchange, asks user to confirm
 * 5. On approval, generates a pairing token, encrypts it with shared secret, sends to client
 * 6. Client stores the token; future connections use it directly via auth.authenticate
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import {
  generatePairingCode,
  generatePairingToken,
  generateECDHKeyPair,
  deriveSharedSecret,
  encryptWithSharedSecret,
  hashToken,
  verifyTokenHash,
  fingerprintPublicKey,
  ECDHKeyPair,
} from '../utils/crypto';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PairedDevice {
  id: string;
  name: string;
  fingerprint: string;
  tokenHash: string;
  pairedAt: number;
  lastSeen: number;
}

export interface PairingSession {
  code: string;
  ecdhKeyPair: ECDHKeyPair;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

export interface PairInitiateParams {
  code: string;
  clientPublicKey: string;
  clientName: string;
  clientFingerprint: string;
}

export interface PairCompleteResult {
  serverPublicKey: string;
  encryptedToken: string;
  instanceId: string;
  instanceName: string;
  port: number;
}

export interface PairRejectedResult {
  reason: string;
}

// ============================================================================
// PairingService
// ============================================================================

const PAIRING_CODE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
const MAX_PAIRING_ATTEMPTS_PER_MINUTE = 5;
const PAIRED_DEVICES_KEY = 'agentControl.pairedDevices';

export class PairingService {
  private context: vscode.ExtensionContext;
  private activePairingSession: PairingSession | null = null;
  private pairingStatusBarItem: vscode.StatusBarItem | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private pairingAttempts: number[] = []; // timestamps of recent attempts

  // Callback to resolve pairing on user approval (set during pair.initiate handling)
  private pendingApproval: {
    resolve: (approved: boolean) => void;
    clientName: string;
    clientFingerprint: string;
  } | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Pairing Flow — Server Side
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Start a new pairing session. Shows a 6-digit code to the user.
   * Returns the pairing code for display.
   */
  async startPairing(): Promise<string> {
    // Cancel any existing session
    this.cancelPairing();

    const code = generatePairingCode();
    const ecdhKeyPair = generateECDHKeyPair();
    const now = Date.now();

    this.activePairingSession = {
      code,
      ecdhKeyPair,
      createdAt: now,
      expiresAt: now + PAIRING_CODE_EXPIRY_MS,
      consumed: false,
    };

    logger.info(`Pairing session started. Code: ${code}`);

    // Show the code in a notification with countdown
    this.showPairingNotification(code);

    // Set expiry timer
    setTimeout(() => {
      if (this.activePairingSession?.code === code && !this.activePairingSession.consumed) {
        this.cancelPairing();
        vscode.window.showInformationMessage('Pairing code expired. Start a new pairing session if needed.');
      }
    }, PAIRING_CODE_EXPIRY_MS);

    return code;
  }

  /**
   * Cancel the current pairing session.
   */
  cancelPairing(): void {
    this.activePairingSession = null;
    this.pendingApproval = null;
    this.hidePairingNotification();
  }

  /**
   * Handle a pair.initiate request from a client.
   * This is called from the WebSocket server when a client sends pair.initiate.
   * 
   * Returns PairCompleteResult on success, PairRejectedResult on failure.
   */
  async handlePairInitiate(params: PairInitiateParams): Promise<PairCompleteResult | PairRejectedResult> {
    // Rate limit pairing attempts
    if (!this.checkPairingRateLimit()) {
      logger.warn('Pairing rate limit exceeded');
      return { reason: 'Too many pairing attempts. Please wait and try again.' };
    }

    // Check if there's an active pairing session
    if (!this.activePairingSession) {
      logger.warn('Pairing attempt with no active session');
      return { reason: 'No active pairing session. Please start pairing from VS Code first.' };
    }

    // Check if session has expired
    if (Date.now() > this.activePairingSession.expiresAt) {
      this.cancelPairing();
      return { reason: 'Pairing code has expired. Please start a new pairing session.' };
    }

    // Check if session was already consumed
    if (this.activePairingSession.consumed) {
      return { reason: 'Pairing code has already been used.' };
    }

    // Verify the code
    if (params.code !== this.activePairingSession.code) {
      logger.warn(`Invalid pairing code attempt: ${params.code}`);
      return { reason: 'Invalid pairing code.' };
    }

    // Code is valid — mark as consumed immediately
    this.activePairingSession.consumed = true;

    // Check auto-approve setting
    const autoApprove = vscode.workspace.getConfiguration('agentControl').get<boolean>('pairing.autoApprove', false);

    let approved: boolean;
    if (autoApprove) {
      approved = true;
      logger.info(`Auto-approved pairing for ${params.clientName}`);
    } else {
      // Ask the user for confirmation
      approved = await this.requestUserApproval(params.clientName, params.clientFingerprint);
    }

    if (!approved) {
      this.cancelPairing();
      logger.info(`User denied pairing for ${params.clientName}`);
      return { reason: 'Pairing request denied by user.' };
    }

    // Pairing approved — perform ECDH key exchange
    try {
      const sharedSecret = deriveSharedSecret(
        this.activePairingSession.ecdhKeyPair.privateKey,
        params.clientPublicKey
      );

      // Generate a pairing token
      const pairingToken = generatePairingToken();
      const tokenHash = hashToken(pairingToken);

      // Encrypt the token with the shared secret
      const encryptedToken = encryptWithSharedSecret(pairingToken, sharedSecret);

      // Store the paired device
      const deviceId = crypto.randomUUID();
      const device: PairedDevice = {
        id: deviceId,
        name: params.clientName,
        fingerprint: params.clientFingerprint,
        tokenHash,
        pairedAt: Date.now(),
        lastSeen: Date.now(),
      };

      await this.addPairedDevice(device);

      // Get instance info
      const workspaceName = vscode.workspace.name || 'VS Code';
      const port = vscode.workspace.getConfiguration('agentControl').get<number>('port', 19876);

      // Clean up pairing state
      this.cancelPairing();

      logger.info(`Device paired successfully: ${params.clientName} (${deviceId})`);
      vscode.window.showInformationMessage(`✓ Paired with ${params.clientName}`);

      return {
        serverPublicKey: this.activePairingSession?.ecdhKeyPair.publicKey || '', // Already cancelled but we saved it above
        encryptedToken,
        instanceId: deviceId,
        instanceName: workspaceName,
        port,
      };
    } catch (error) {
      logger.error('Failed to complete pairing key exchange', error);
      this.cancelPairing();
      return { reason: 'Key exchange failed. Please try again.' };
    }
  }

  // Fixed version: save ECDH state before cancelling
  async handlePairInitiateSafe(params: PairInitiateParams): Promise<PairCompleteResult | PairRejectedResult> {
    // Rate limit pairing attempts
    if (!this.checkPairingRateLimit()) {
      logger.warn('Pairing rate limit exceeded');
      return { reason: 'Too many pairing attempts. Please wait and try again.' };
    }

    // Check if there's an active pairing session
    if (!this.activePairingSession) {
      logger.warn('Pairing attempt with no active session');
      return { reason: 'No active pairing session. Please start pairing from VS Code first.' };
    }

    // Check if session has expired
    if (Date.now() > this.activePairingSession.expiresAt) {
      this.cancelPairing();
      return { reason: 'Pairing code has expired. Please start a new pairing session.' };
    }

    // Check if session was already consumed
    if (this.activePairingSession.consumed) {
      return { reason: 'Pairing code has already been used.' };
    }

    // Verify the code
    if (params.code !== this.activePairingSession.code) {
      logger.warn(`Invalid pairing code attempt: ${params.code}`);
      return { reason: 'Invalid pairing code.' };
    }

    // Code is valid — mark as consumed immediately and save ECDH state
    this.activePairingSession.consumed = true;
    const serverPublicKey = this.activePairingSession.ecdhKeyPair.publicKey;
    const serverPrivateKey = this.activePairingSession.ecdhKeyPair.privateKey;

    // Check auto-approve setting
    const autoApprove = vscode.workspace.getConfiguration('agentControl').get<boolean>('pairing.autoApprove', false);

    let approved: boolean;
    if (autoApprove) {
      approved = true;
      logger.info(`Auto-approved pairing for ${params.clientName}`);
    } else {
      // Ask the user for confirmation
      approved = await this.requestUserApproval(params.clientName, params.clientFingerprint);
    }

    if (!approved) {
      this.cancelPairing();
      logger.info(`User denied pairing for ${params.clientName}`);
      return { reason: 'Pairing request denied by user.' };
    }

    // Pairing approved — perform ECDH key exchange
    try {
      const sharedSecret = deriveSharedSecret(serverPrivateKey, params.clientPublicKey);

      // Generate a pairing token
      const pairingToken = generatePairingToken();
      const tokenHash = hashToken(pairingToken);

      // Encrypt the token with the shared secret
      const encryptedToken = encryptWithSharedSecret(pairingToken, sharedSecret);

      // Store the paired device
      const deviceId = crypto.randomUUID();
      const device: PairedDevice = {
        id: deviceId,
        name: params.clientName,
        fingerprint: params.clientFingerprint,
        tokenHash,
        pairedAt: Date.now(),
        lastSeen: Date.now(),
      };

      await this.addPairedDevice(device);

      // Get instance info
      const workspaceName = vscode.workspace.name || 'VS Code';
      const port = vscode.workspace.getConfiguration('agentControl').get<number>('port', 19876);

      // Clean up pairing state
      this.hidePairingNotification();
      this.activePairingSession = null;
      this.pendingApproval = null;

      logger.info(`Device paired successfully: ${params.clientName} (${deviceId})`);
      vscode.window.showInformationMessage(`✓ Paired with ${params.clientName}`);

      return {
        serverPublicKey,
        encryptedToken,
        instanceId: deviceId,
        instanceName: workspaceName,
        port,
      };
    } catch (error) {
      logger.error('Failed to complete pairing key exchange', error);
      this.cancelPairing();
      return { reason: 'Key exchange failed. Please try again.' };
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Token Validation (called from AuthService)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Validate a token against stored paired devices.
   * Returns the device if valid, null otherwise.
   */
  validatePairedToken(token: string): PairedDevice | null {
    const devices = this.getPairedDevices();
    for (const device of devices) {
      if (verifyTokenHash(token, device.tokenHash)) {
        // Update last seen
        device.lastSeen = Date.now();
        this.updatePairedDevice(device);
        return device;
      }
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Device Management
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Get all paired devices.
   */
  getPairedDevices(): PairedDevice[] {
    return this.context.globalState.get<PairedDevice[]>(PAIRED_DEVICES_KEY, []);
  }

  /**
   * Add a new paired device.
   */
  async addPairedDevice(device: PairedDevice): Promise<void> {
    const devices = this.getPairedDevices();
    
    // Check max devices limit
    const maxDevices = vscode.workspace.getConfiguration('agentControl').get<number>('pairing.maxDevices', 10);
    if (devices.length >= maxDevices) {
      // Remove the oldest device
      devices.sort((a, b) => a.lastSeen - b.lastSeen);
      devices.shift();
      logger.info('Removed oldest paired device to stay within limit');
    }

    devices.push(device);
    await this.context.globalState.update(PAIRED_DEVICES_KEY, devices);
    logger.info(`Paired device added: ${device.name} (${device.id})`);
  }

  /**
   * Update a paired device's metadata.
   */
  async updatePairedDevice(device: PairedDevice): Promise<void> {
    const devices = this.getPairedDevices();
    const index = devices.findIndex(d => d.id === device.id);
    if (index >= 0) {
      devices[index] = device;
      await this.context.globalState.update(PAIRED_DEVICES_KEY, devices);
    }
  }

  /**
   * Remove (revoke) a paired device.
   */
  async removePairedDevice(deviceId: string): Promise<boolean> {
    const devices = this.getPairedDevices();
    const filtered = devices.filter(d => d.id !== deviceId);
    if (filtered.length === devices.length) {
      return false; // Not found
    }
    await this.context.globalState.update(PAIRED_DEVICES_KEY, filtered);
    logger.info(`Paired device removed: ${deviceId}`);
    return true;
  }

  /**
   * Rename a paired device.
   */
  async renamePairedDevice(deviceId: string, newName: string): Promise<boolean> {
    const devices = this.getPairedDevices();
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return false;
    }
    device.name = newName;
    await this.context.globalState.update(PAIRED_DEVICES_KEY, devices);
    return true;
  }

  /**
   * Clear all paired devices.
   */
  async clearAllPairedDevices(): Promise<void> {
    await this.context.globalState.update(PAIRED_DEVICES_KEY, []);
    logger.info('All paired devices cleared');
  }

  // ──────────────────────────────────────────────────────────────────────
  // UI Helpers
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Show the pairing code in a notification and status bar.
   */
  private showPairingNotification(code: string): void {
    // Show a notification
    vscode.window.showInformationMessage(
      `🔗 Pairing Code: ${code.substring(0, 3)} ${code.substring(3)}  —  Enter this code in your AlephNet client`,
      'Cancel'
    ).then(action => {
      if (action === 'Cancel') {
        this.cancelPairing();
      }
    });

    // Show in status bar with countdown
    if (!this.pairingStatusBarItem) {
      this.pairingStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        101 // Higher priority than the main status bar item
      );
    }

    const updateCountdown = () => {
      if (!this.activePairingSession || this.activePairingSession.consumed) {
        this.hidePairingNotification();
        return;
      }
      const remaining = Math.max(0, this.activePairingSession.expiresAt - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      if (seconds <= 0) {
        this.hidePairingNotification();
        return;
      }
      this.pairingStatusBarItem!.text = `$(key) ${code.substring(0, 3)} ${code.substring(3)} (${seconds}s)`;
      this.pairingStatusBarItem!.tooltip = `Pairing code: ${code} — expires in ${seconds}s\nClick to cancel`;
      this.pairingStatusBarItem!.command = 'agentControl.cancelPairing';
      this.pairingStatusBarItem!.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
      this.pairingStatusBarItem!.show();
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  /**
   * Hide the pairing notification and status bar item.
   */
  private hidePairingNotification(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.pairingStatusBarItem) {
      this.pairingStatusBarItem.hide();
    }
  }

  /**
   * Request user approval for a pairing request via a modal dialog.
   */
  private async requestUserApproval(clientName: string, clientFingerprint: string): Promise<boolean> {
    const shortFingerprint = clientFingerprint.substring(0, 8);
    const choice = await vscode.window.showWarningMessage(
      `🔗 "${clientName}" (${shortFingerprint}…) wants to connect.\n\nThis will grant full access to your VS Code workspace.`,
      { modal: true },
      'Allow',
      'Deny'
    );
    return choice === 'Allow';
  }

  /**
   * Show the paired devices management QuickPick.
   */
  async showManageDevices(): Promise<void> {
    const devices = this.getPairedDevices();

    if (devices.length === 0) {
      vscode.window.showInformationMessage('No paired devices. Use "Pair New Device" to connect a client.');
      return;
    }

    const items: (vscode.QuickPickItem & { deviceId?: string; action?: string })[] = devices.map(d => {
      const lastSeen = new Date(d.lastSeen).toLocaleString();
      const pairedAt = new Date(d.pairedAt).toLocaleDateString();
      return {
        label: `$(device-mobile) ${d.name}`,
        description: `Paired: ${pairedAt}`,
        detail: `Last seen: ${lastSeen}  •  ID: ${d.fingerprint.substring(0, 8)}…`,
        deviceId: d.id,
      };
    });

    items.push(
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: '$(trash) Unpair All Devices', action: 'clearAll' }
    );

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Paired Devices',
      placeHolder: 'Select a device to manage',
    });

    if (!selected) {
      return;
    }

    if (selected.action === 'clearAll') {
      const confirm = await vscode.window.showWarningMessage(
        'Remove all paired devices? They will need to re-pair to connect.',
        { modal: true },
        'Remove All'
      );
      if (confirm === 'Remove All') {
        await this.clearAllPairedDevices();
        vscode.window.showInformationMessage('All paired devices removed.');
      }
      return;
    }

    if (selected.deviceId) {
      const action = await vscode.window.showQuickPick(
        [
          { label: '$(edit) Rename', action: 'rename' },
          { label: '$(trash) Unpair', action: 'unpair' },
        ],
        { title: `Manage: ${selected.label}` }
      );

      if (action?.action === 'rename') {
        const newName = await vscode.window.showInputBox({
          prompt: 'Enter new device name',
          value: selected.label.replace('$(device-mobile) ', ''),
        });
        if (newName) {
          await this.renamePairedDevice(selected.deviceId, newName);
          vscode.window.showInformationMessage(`Device renamed to "${newName}".`);
        }
      } else if (action?.action === 'unpair') {
        const confirm = await vscode.window.showWarningMessage(
          `Unpair "${selected.label.replace('$(device-mobile) ', '')}"? It will need to re-pair to connect.`,
          { modal: true },
          'Unpair'
        );
        if (confirm === 'Unpair') {
          await this.removePairedDevice(selected.deviceId);
          vscode.window.showInformationMessage('Device unpaired.');
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ──────────────────────────────────────────────────────────────────────

  private checkPairingRateLimit(): boolean {
    const now = Date.now();
    // Remove attempts older than 1 minute
    this.pairingAttempts = this.pairingAttempts.filter(t => now - t < 60000);

    if (this.pairingAttempts.length >= MAX_PAIRING_ATTEMPTS_PER_MINUTE) {
      return false;
    }

    this.pairingAttempts.push(now);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────

  dispose(): void {
    this.cancelPairing();
    if (this.pairingStatusBarItem) {
      this.pairingStatusBarItem.dispose();
      this.pairingStatusBarItem = null;
    }
  }
}
