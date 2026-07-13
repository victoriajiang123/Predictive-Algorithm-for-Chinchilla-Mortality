let port = null;
 
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
    port.postMessage({ data: msg.data });
  }
});
