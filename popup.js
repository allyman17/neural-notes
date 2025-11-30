async function loadStats() {
  const result = await chrome.storage.local.get(['savedFilenames', 'imageCount']);
  const savedFilenames = result.savedFilenames || {};
  const imageCount = result.imageCount || 0;

  const fileCount = Object.keys(savedFilenames).length;

  document.getElementById('fileCount').textContent = fileCount;
  document.getElementById('imageCount').textContent = imageCount;
}

document.getElementById('clearStats').addEventListener('click', async () => {
  await chrome.storage.local.clear();
  await loadStats();

  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Statistics cleared!';
  setTimeout(() => {
    statusEl.textContent = 'Active on skillbuilder.aws';
  }, 2000);
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  const statusEl = document.getElementById('status');

  if (currentTab.url && currentTab.url.includes('skillbuilder.aws')) {
    statusEl.textContent = '✓ Active on this page';
    statusEl.style.color = '#059669';
  } else {
    statusEl.textContent = 'Visit skillbuilder.aws to extract content';
    statusEl.style.color = '#6B7280';
  }
});

loadStats();
