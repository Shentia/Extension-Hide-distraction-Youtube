// Track extension state
let isExtensionActive = false;
let removedElements = new Set();
let blurIntensity = 5;
let currentMode = 'study';
let removedStack = [];
let stats = {
  totalHidden: 0,
  elementCounts: {},
  mostHiddenType: 'None'
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'toggle':
      isExtensionActive = message.state;
      handleExtensionToggle();
      break;
    case 'updateBlur':
      blurIntensity = message.intensity;
      updateBlurEffects();
      break;
    case 'changeMode':
      currentMode = message.mode;
      applyModeSettings();
      break;
    case 'undo':
      undoLastRemove();
      break;
  }
});

function handleExtensionToggle() {
  if (isExtensionActive) {
    initializeHoverEffects();
  } else {
    removeHoverEffects();
  }
}

function initializeHoverEffects() {
  // Get all major YouTube sections
  const sections = document.querySelectorAll('#content, #related, #comments, #info, #meta, ytd-rich-grid-row');
  
  sections.forEach(section => {
    if (!section.classList.contains('yt-focus-hoverable')) {
      section.classList.add('yt-focus-hoverable');
      
      // Add hover effect
      section.addEventListener('mouseenter', () => {
        if (isExtensionActive && !removedElements.has(section)) {
          section.classList.add('yt-focus-blurred');
        }
      });

      section.addEventListener('mouseleave', () => {
        if (isExtensionActive && !removedElements.has(section)) {
          section.classList.remove('yt-focus-blurred');
        }
      });

      // Add click handler for removal
      section.addEventListener('click', (e) => {
        if (isExtensionActive && !removedElements.has(section)) {
          e.preventDefault();
          e.stopPropagation();
          removeSection(section);
        }
      });
    }
  });

  // Add keyboard listener for Delete key
  document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(e) {
  if (isExtensionActive && e.key === 'Delete') {
    const hoveredElement = document.querySelector('.yt-focus-blurred');
    if (hoveredElement) {
      removeSection(hoveredElement);
    }
  }
}

function removeSection(section) {
  section.classList.add('yt-focus-hidden');
  removedStack.push({
    element: section,
    type: getElementType(section)
  });
  
  updateStats(getElementType(section));
  updatePopupStats();
}

function removeHoverEffects() {
  const elements = document.querySelectorAll('.yt-focus-hoverable');
  elements.forEach(element => {
    element.classList.remove('yt-focus-hoverable', 'yt-focus-blurred');
  });
  
  // Remove keyboard listener
  document.removeEventListener('keydown', handleKeyPress);
}

// Handle YouTube's dynamic content loading
const observer = new MutationObserver(() => {
  if (isExtensionActive) {
    initializeHoverEffects();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (!isExtensionActive) return;

  if (e.key === 'Delete') {
    const hoveredElement = document.querySelector('.yt-focus-blurred');
    if (hoveredElement) {
      removeSection(hoveredElement);
    }
  }

  if (e.ctrlKey && e.key === 'z') {
    undoLastRemove();
  }

  if (e.ctrlKey && e.shiftKey && e.key === 'F') {
    isExtensionActive = !isExtensionActive;
    handleExtensionToggle();
    chrome.storage.local.set({ focusModeActive: isExtensionActive });
  }
});

function undoLastRemove() {
  if (removedStack.length === 0) return;
  
  const lastRemoved = removedStack.pop();
  lastRemoved.element.classList.remove('yt-focus-hidden');
  
  updateStats(lastRemoved.type, true);
  updatePopupStats();
}

function updateStats(elementType, isUndo = false) {
  if (!isUndo) {
    stats.totalHidden++;
    stats.elementCounts[elementType] = (stats.elementCounts[elementType] || 0) + 1;
  } else {
    stats.totalHidden--;
    stats.elementCounts[elementType]--;
  }

  // Update most hidden type
  stats.mostHiddenType = Object.entries(stats.elementCounts)
    .reduce((a, b) => (b[1] > a[1] ? b : a), ['None', 0])[0];

  chrome.storage.local.set({ stats });
}

function updatePopupStats() {
  chrome.runtime.sendMessage({
    type: 'statsUpdate',
    stats: {
      ...stats,
      canUndo: removedStack.length > 0
    }
  });
}

function getElementType(element) {
  // Map element to a user-friendly name based on ID or class
  const mapping = {
    'comments': 'Comments',
    'related': 'Related Videos',
    'info': 'Video Info',
    'meta': 'Metadata',
    'ytd-rich-grid-row': 'Recommendations'
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (element.id.includes(key) || element.classList.contains(key)) {
      return value;
    }
  }
  return 'Other';
}

function updateBlurEffects() {
  document.documentElement.style.setProperty('--blur-amount', `${blurIntensity * 2}px`);
}

function applyModeSettings() {
  const modeSettings = {
    study: {
      selectors: ['#comments', '#related', 'ytd-rich-grid-row'],
      blurIntensity: 8
    },
    entertainment: {
      selectors: ['#info', '#meta'],
      blurIntensity: 3
    },
    custom: {
      selectors: [],
      blurIntensity: blurIntensity
    }
  };

  const settings = modeSettings[currentMode];
  blurIntensity = settings.blurIntensity;
  updateBlurEffects();
  
  if (settings.selectors.length > 0) {
    settings.selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.classList.add('yt-focus-blurred');
      });
    });
  }
} 