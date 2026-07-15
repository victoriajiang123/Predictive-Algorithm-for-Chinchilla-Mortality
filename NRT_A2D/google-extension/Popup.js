const selectorInput = document.getElementById("selector");
const intervalInput = document.getElementById("interval");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDiv = document.getElementById("status");

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function refreshStatus() {
  const tab = await getActiveTab();
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: "GET_STATUS" }, (response) => {
    if (chrome.runtime.lastError) {
      statusDiv.textContent = "Status: content script not loaded (reload page)";
      return;
    }
    if (response && response.running) {
      statusDiv.textContent = `Status: running (every ${response.intervalSeconds}s) on "${response.selector}"`;
    } else {
      statusDiv.textContent = "Status: stopped";
    }
  });
}

// Load saved values into the form for convenience
chrome.storage.local.get(["selector", "intervalSeconds"], (data) => {
  if (data.selector) selectorInput.value = data.selector;
  if (data.intervalSeconds) intervalInput.value = data.intervalSeconds;
});

startBtn.addEventListener("click", async () => {
  const selector = selectorInput.value.trim();
  const intervalSeconds = parseFloat(intervalInput.value) || 10;

  if (!selector) {
    statusDiv.textContent = "Please enter a CSS selector first.";
    return;
  }

  chrome.storage.local.set({ selector, intervalSeconds });

  const tab = await getActiveTab();
  chrome.tabs.sendMessage(
    tab.id,
    { type: "START_CLICKING", selector, intervalSeconds },
    () => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = "Error: reload the target page and try again.";
        return;
      }
      refreshStatus();
    }
  );
});

stopBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  chrome.tabs.sendMessage(tab.id, { type: "STOP_CLICKING" }, () => {
    if (chrome.runtime.lastError) {
      statusDiv.textContent = "Error: reload the target page and try again.";
      return;
    }
    refreshStatus();
  });
});

refreshStatus();
