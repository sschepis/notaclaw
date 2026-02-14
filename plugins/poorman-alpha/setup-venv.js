#!/usr/bin/env node
/**
 * setup-venv.js — Creates a Python virtual environment for the poorman-alpha plugin
 * and installs sympy (and optionally matplotlib) into it.
 *
 * Usage:
 *   node setup-venv.js            # Creates venv and installs sympy
 *   node setup-venv.js --check    # Checks if venv is ready
 *   node setup-venv.js --clean    # Removes the venv
 *
 * The venv is created at <plugin-dir>/.venv/
 * The plugin's sympy-bridge.js auto-detects this venv and uses it.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PLUGIN_DIR = __dirname;
const VENV_DIR = path.join(PLUGIN_DIR, '.venv');
const IS_WIN = process.platform === 'win32';
const PYTHON_BIN = IS_WIN
  ? path.join(VENV_DIR, 'Scripts', 'python.exe')
  : path.join(VENV_DIR, 'bin', 'python3');
const PIP_BIN = IS_WIN
  ? path.join(VENV_DIR, 'Scripts', 'pip.exe')
  : path.join(VENV_DIR, 'bin', 'pip3');

const REQUIRED_PACKAGES = ['sympy'];
const OPTIONAL_PACKAGES = ['matplotlib'];

function findSystemPython() {
  const candidates = IS_WIN
    ? ['python3', 'python', 'py -3']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const result = spawnSync(cmd.split(' ')[0], cmd.split(' ').slice(1).concat(['--version']), {
        encoding: 'utf-8',
        timeout: 5000,
      });
      if (result.status === 0 && result.stdout.includes('Python 3')) {
        return cmd;
      }
    } catch (_) {
      // Continue
    }
  }
  return null;
}

function venvExists() {
  return fs.existsSync(PYTHON_BIN);
}

function checkVenv() {
  if (!venvExists()) {
    console.log('❌ Virtual environment not found at', VENV_DIR);
    return false;
  }

  // Check sympy
  const result = spawnSync(PYTHON_BIN, ['-c', 'import sympy; print(sympy.__version__)'], {
    encoding: 'utf-8',
    timeout: 10000,
  });

  if (result.status === 0) {
    console.log('✅ Virtual environment OK');
    console.log('   Python:', PYTHON_BIN);
    console.log('   SymPy:', result.stdout.trim());

    // Check matplotlib (optional)
    const mpl = spawnSync(PYTHON_BIN, ['-c', 'import matplotlib; print(matplotlib.__version__)'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    if (mpl.status === 0) {
      console.log('   Matplotlib:', mpl.stdout.trim());
    } else {
      console.log('   Matplotlib: not installed (plots unavailable)');
    }
    return true;
  }

  console.log('❌ SymPy not found in venv');
  return false;
}

function createVenv() {
  const systemPython = findSystemPython();
  if (!systemPython) {
    console.error('❌ Python 3 not found on system. Please install Python 3.8+ first.');
    console.error('   macOS: brew install python3');
    console.error('   Ubuntu: sudo apt install python3 python3-venv');
    console.error('   Windows: https://python.org/downloads');
    process.exit(1);
  }

  console.log(`Using system Python: ${systemPython}`);

  // Create venv
  console.log(`Creating virtual environment at ${VENV_DIR}...`);
  const createArgs = systemPython.split(' ').slice(1).concat(['-m', 'venv', VENV_DIR]);
  const createResult = spawnSync(systemPython.split(' ')[0], createArgs, {
    encoding: 'utf-8',
    timeout: 60000,
    stdio: 'inherit',
  });

  if (createResult.status !== 0) {
    console.error('❌ Failed to create virtual environment');
    console.error('   You may need to install python3-venv:');
    console.error('   Ubuntu: sudo apt install python3-venv');
    process.exit(1);
  }

  // Install required packages
  console.log('Installing required packages:', REQUIRED_PACKAGES.join(', '));
  const installResult = spawnSync(PIP_BIN, ['install', '--upgrade', 'pip'].concat(REQUIRED_PACKAGES), {
    encoding: 'utf-8',
    timeout: 120000,
    stdio: 'inherit',
  });

  if (installResult.status !== 0) {
    console.error('❌ Failed to install required packages');
    process.exit(1);
  }

  // Install optional packages (non-fatal)
  console.log('Installing optional packages:', OPTIONAL_PACKAGES.join(', '));
  const optResult = spawnSync(PIP_BIN, ['install'].concat(OPTIONAL_PACKAGES), {
    encoding: 'utf-8',
    timeout: 120000,
    stdio: 'inherit',
  });

  if (optResult.status !== 0) {
    console.log('⚠️  Optional packages failed to install (plot generation unavailable)');
  }

  console.log('✅ Virtual environment created successfully');
  checkVenv();
}

function cleanVenv() {
  if (fs.existsSync(VENV_DIR)) {
    console.log(`Removing virtual environment at ${VENV_DIR}...`);
    fs.rmSync(VENV_DIR, { recursive: true, force: true });
    console.log('✅ Virtual environment removed');
  } else {
    console.log('No virtual environment found');
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg === '--check') {
  process.exit(checkVenv() ? 0 : 1);
} else if (arg === '--clean') {
  cleanVenv();
} else {
  if (venvExists()) {
    console.log('Virtual environment already exists. Checking...');
    if (checkVenv()) {
      console.log('Everything is up to date.');
    } else {
      console.log('Recreating...');
      cleanVenv();
      createVenv();
    }
  } else {
    createVenv();
  }
}

// ── Exports for programmatic use ─────────────────────────────────────────

module.exports = {
  VENV_DIR,
  PYTHON_BIN,
  PIP_BIN,
  venvExists,
  checkVenv,
  createVenv,
  cleanVenv,
  findSystemPython,
};
