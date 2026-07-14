let intervalId = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'start') {
    if (intervalId) return; // already running
    clickAndScrape(); // run immediately, then every 10s
    intervalId = setInterval(clickAndScrape, 10000);
    console.log('Click & Save: started, running every 10s.');
  }

  if (msg.action === 'stop') {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Click & Save: stopped.');
  }
});

function clickAndScrape() {
  // ---- CUSTOMIZE THIS SELECTOR to match the button you want to click ----
  const button = document.querySelector('#idBtnSave');

  if (!button) {
    console.warn('Click & Save: button not found on this page.');
    return;
  }

  button.click();

  // Give the page time to update/render new data after the click.
  // Increase this if the site is slow, or replace with a MutationObserver
  // if you need to wait for a specific element to appear instead.
  setTimeout(() => {
    const data = scrapeData();
    chrome.runtime.sendMessage({ action: 'saveData', data });
  }, 1000);
}

function scrapeData() {
  // ---- CUSTOMIZE THIS to match the data you actually want ----
  // Example: turns the first <table> on the page into CSV.
  const rows = document.querySelectorAll('table tr');
  let csv = '';
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td, th')).map(
      (cell) => `"${cell.innerText.replace(/"/g, '""')}"`
    );
    csv += cells.join(',') + '\n';
  });
  return csv;
}
