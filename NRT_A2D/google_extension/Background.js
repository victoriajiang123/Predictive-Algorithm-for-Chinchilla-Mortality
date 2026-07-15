let port = null;

// Block the page's OWN attempt to navigate/download download.asp (which is
// what triggers Chrome's "insecure download" warning and a manual dialog).
// This deliberately excludes 'xmlhttprequest', so our own fetch() calls in
// content.js are NOT blocked and still retrieve the file normally.
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*download.asp*',
          resourceTypes: ['main_frame', 'sub_frame', 'object', 'media', 'font', 'other'],
        },
      },
    ],
  });
});

function connectHost() {
  port = chrome.runtime.connectNative('com.clicksave.host');

  port.onMessage.addListener((response) => {
    console.log('Native host response:', response);
  });

  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.error('Native host disconnected:', chrome.runtime.lastError.message);
    }
    port = null;
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'saveData') {
    if (!port) connectHost();
    port.postMessage({ action: 'saveData', data: msg.data, filename: msg.filename });
  }

  if (msg.action === 'watchDialog') {
    if (!port) connectHost();
    port.postMessage({ action: 'watchDialog' });
  }
});
