const DEFAULT_PROMPT = `Please optimize this content for use in a RAG (Retrieval-Augmented Generation) system by improving its formatting and layout. Focus on structure, readability, and retrieval efficiency. Do not remove any content—only reorganize and reformat it.`;

async function loadSettings() {
  const result = await chrome.storage.local.get([
    'claudeEnabled',
    'claudeApiKey',
    'claudeModel',
    'claudePrompt',
    'enablePrefix',
    'prefixStart',
    'promptFilename'
  ]);

  document.getElementById('enableClaude').checked = result.claudeEnabled || false;
  document.getElementById('apiKey').value = result.claudeApiKey || '';
  document.getElementById('model').value = result.claudeModel || 'claude-sonnet-4-5-20250929';
  document.getElementById('customPrompt').value = result.claudePrompt || DEFAULT_PROMPT;
  document.getElementById('enablePrefix').checked = result.enablePrefix || false;
  document.getElementById('prefixStart').value = result.prefixStart !== undefined ? result.prefixStart : 0;
  document.getElementById('promptFilename').checked = result.promptFilename || false;
}

function showStatus(message, isError = false) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = 'status-message ' + (isError ? 'error' : 'success');
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

document.getElementById('saveButton').addEventListener('click', async () => {
  const prefixStart = parseInt(document.getElementById('prefixStart').value, 10);
  
  if (isNaN(prefixStart) || prefixStart < 0 || prefixStart > 999) {
    showStatus('Starting position must be between 0 and 999', true);
    return;
  }

  const settings = {
    claudeEnabled: document.getElementById('enableClaude').checked,
    claudeApiKey: document.getElementById('apiKey').value.trim(),
    claudeModel: document.getElementById('model').value,
    claudePrompt: document.getElementById('customPrompt').value.trim() || DEFAULT_PROMPT,
    enablePrefix: document.getElementById('enablePrefix').checked,
    prefixStart: prefixStart,
    promptFilename: document.getElementById('promptFilename').checked
  };

  if (settings.claudeEnabled && !settings.claudeApiKey) {
    showStatus('Please enter a Claude API key', true);
    return;
  }

  await chrome.storage.local.set(settings);
  showStatus('Settings saved successfully!');
});

document.getElementById('cancelButton').addEventListener('click', () => {
  window.close();
});

loadSettings();
