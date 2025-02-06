document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const blurSlider = document.getElementById('blurSlider');
  const modeSelect = document.getElementById('modeSelect');
  const undoBtn = document.getElementById('undoBtn');
  const hiddenCount = document.getElementById('hiddenCount');
  const mostHidden = document.getElementById('mostHidden');

  // Load saved settings
  chrome.storage.local.get([
    'focusModeActive',
    'blurIntensity',
    'selectedMode',
    'stats'
  ], (result) => {
    toggleSwitch.checked = result.focusModeActive || false;
    blurSlider.value = result.blurIntensity || 5;
    modeSelect.value = result.selectedMode || 'study';
    
    if (result.stats) {
      hiddenCount.textContent = result.stats.totalHidden || 0;
      mostHidden.textContent = result.stats.mostHiddenType || 'None';
    }
  });

  // Handle toggle switch
  toggleSwitch.addEventListener('change', (e) => {
    const isActive = e.target.checked;
    chrome.storage.local.set({ focusModeActive: isActive });
    sendMessageToContent({ action: 'toggle', state: isActive });
  });

  // Handle blur intensity change
  blurSlider.addEventListener('input', (e) => {
    const intensity = e.target.value;
    chrome.storage.local.set({ blurIntensity: intensity });
    sendMessageToContent({ action: 'updateBlur', intensity });
  });

  // Handle mode selection
  modeSelect.addEventListener('change', (e) => {
    const mode = e.target.value;
    chrome.storage.local.set({ selectedMode: mode });
    sendMessageToContent({ action: 'changeMode', mode });
  });

  // Handle undo button
  undoBtn.addEventListener('click', () => {
    sendMessageToContent({ action: 'undo' });
  });

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'statsUpdate') {
      hiddenCount.textContent = message.stats.totalHidden;
      mostHidden.textContent = message.stats.mostHiddenType;
      undoBtn.disabled = !message.stats.canUndo;
    }
  });
});

async function ensureContentScript() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({type: 'checkContentScript'}, (response) => {
      if (response?.status === 'ready') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

async function sendMessageToContent(message) {
  const isReady = await ensureContentScript();
  if (!isReady) {
    console.error('Content script not ready');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
} 