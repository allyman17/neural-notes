let hasExtracted = false;
let currentUrl = window.location.href;

console.log('[AWS Extractor] Content script loaded on:', window.location.href);
console.log('[AWS Extractor] Is in iframe:', window !== window.top);

function extractContent() {
  console.log('[AWS Extractor] extractContent called, hasExtracted:', hasExtracted);
  
  if (hasExtracted && currentUrl === window.location.href) {
    console.log('[AWS Extractor] Already extracted this page, skipping');
    return;
  }

  // Check if we're in the parent page with iframe
  const iframe = document.querySelector('iframe#renderer_iframe');
  if (iframe && window === window.top) {
    console.log('[AWS Extractor] Found iframe on parent page, waiting for iframe content...');
    // The content script will also run inside the iframe, so we don't extract from parent
    return;
  }

  const pageWrap = document.querySelector('div.page-wrap#page-wrap');

  if (!pageWrap) {
    console.log('[AWS Extractor] page-wrap element not found on page');
    console.log('[AWS Extractor] Checking for iframe content...');
    return;
  }
  
  console.log('[AWS Extractor] Found page-wrap, extracting content...');

  hasExtracted = true;
  currentUrl = window.location.href;

  const textContent = pageWrap.innerText || pageWrap.textContent;

  const images = [];
  const imgElements = pageWrap.querySelectorAll('img');
  imgElements.forEach((img) => {
    if (img.src) {
      images.push({
        src: img.src,
        alt: img.alt || 'image'
      });
    }
  });

  const pageTitle = document.title || 'untitled';

  console.log('[AWS Extractor] Sending message to background script...');
  console.log('[AWS Extractor] Title:', pageTitle);
  console.log('[AWS Extractor] Text length:', textContent.length);
  console.log('[AWS Extractor] Images found:', images.length);
  
  chrome.runtime.sendMessage({
    action: 'saveContent',
    data: {
      title: pageTitle,
      text: textContent,
      images: images,
      url: window.location.href
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[AWS Extractor] Error sending message:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('[AWS Extractor] Content extracted and saved successfully');
    } else {
      console.log('[AWS Extractor] Response:', response);
    }
  });
}

function observePageChanges() {
  const observer = new MutationObserver((mutations) => {
    const pageWrap = document.querySelector('div.page-wrap#page-wrap');
    if (pageWrap && !hasExtracted) {
      extractContent();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(extractContent, 1000);
    observePageChanges();
  });
} else {
  setTimeout(extractContent, 1000);
  observePageChanges();
}

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    hasExtracted = false;
    currentUrl = url;
    setTimeout(extractContent, 1500);
  }
}).observe(document, { subtree: true, childList: true });
