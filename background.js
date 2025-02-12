// Initialize extension state when installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.set({
    focusModeActive: false,
    blurIntensity: 5,
    selectedMode: 'study',
    stats: {
      totalHidden: 0,
      elementCounts: {},
      mostHiddenType: 'None'
    }
  });
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-focus-mode') {
    chrome.storage.local.get(['focusModeActive'], (result) => {
      const newState = !result.focusModeActive;
      chrome.storage.local.set({ focusModeActive: newState });
      
      // Send message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggle',
            state: newState
          });
        }
      });
    });
  }
});

// Add this to handle popup messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'checkContentScript') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['content.js']
        }, () => {
          sendResponse({status: 'ready'});
        });
      }
    });
    return true; // Keep the message channel open for async response
  }
}); 