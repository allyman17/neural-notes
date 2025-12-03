let hasExtracted = false;
let currentUrl = window.location.href;
let previewModal = null;

console.log('[AWS Extractor] Content script loaded on:', window.location.href);
console.log('[AWS Extractor] Is in iframe:', window !== window.top);

// Create preview modal
function createPreviewModal() {
  if (previewModal) return previewModal;

  const modal = document.createElement('div');
  modal.id = 'aws-extractor-preview-modal';
  modal.innerHTML = `
    <div class="aws-extractor-modal-overlay">
      <div class="aws-extractor-modal-content">
        <div class="aws-extractor-modal-header">
          <h2>Preview Content Before Sending to Claude</h2>
          <button class="aws-extractor-close-btn" id="aws-extractor-close">&times;</button>
        </div>
        <div class="aws-extractor-modal-body">
          <div class="aws-extractor-info">
            <div><strong>Title:</strong> <span id="aws-extractor-title"></span></div>
            <div><strong>Characters:</strong> <span id="aws-extractor-char-count"></span></div>
            <div class="aws-extractor-url-line">
              <strong>URL:</strong> <span id="aws-extractor-url" title=""></span>
            </div>
          </div>
          <textarea id="aws-extractor-text-preview" placeholder="Content will appear here..."></textarea>
        </div>
        <div class="aws-extractor-modal-footer">
          <button class="aws-extractor-btn aws-extractor-btn-cancel" id="aws-extractor-cancel">Cancel</button>
          <button class="aws-extractor-btn aws-extractor-btn-confirm" id="aws-extractor-confirm">Send to Claude</button>
        </div>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #aws-extractor-preview-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .aws-extractor-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .aws-extractor-modal-content {
      background: white;
      border-radius: 8px;
      width: 100%;
      max-width: 1100px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .aws-extractor-modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .aws-extractor-modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #111827;
    }
    
    .aws-extractor-close-btn {
      background: none;
      border: none;
      font-size: 28px;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }
    
    .aws-extractor-close-btn:hover {
      background: #f3f4f6;
      color: #111827;
    }
    
    .aws-extractor-modal-body {
      padding: 24px;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .aws-extractor-info {
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }
    
    .aws-extractor-info > div {
      margin-bottom: 4px;
    }
    
    .aws-extractor-info > div:last-child {
      margin-bottom: 0;
    }
    
    .aws-extractor-url-line {
      display: flex;
      gap: 8px;
    }
    
    #aws-extractor-url {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #6b7280;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    #aws-extractor-url:hover {
      color: #3b82f6;
    }
    
    #aws-extractor-url.expanded {
      white-space: normal;
      word-break: break-all;
    }
    
    #aws-extractor-url.collapsed {
      white-space: nowrap;
    }
    
    #aws-extractor-text-preview {
      flex: 1;
      width: 100%;
      min-height: 400px;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.5;
      resize: vertical;
      outline: none;
    }
    
    #aws-extractor-text-preview:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .aws-extractor-modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .aws-extractor-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .aws-extractor-btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }
    
    .aws-extractor-btn-cancel:hover {
      background: #e5e7eb;
    }
    
    .aws-extractor-btn-confirm {
      background: #3b82f6;
      color: white;
    }
    
    .aws-extractor-btn-confirm:hover {
      background: #2563eb;
    }
  `;

  document.head.appendChild(style);
  previewModal = modal;
  return modal;
}

function showPreviewModal(title, text, images, url) {
  return new Promise((resolve, reject) => {
    const modal = createPreviewModal();
    document.body.appendChild(modal);

    // Populate modal
    document.getElementById('aws-extractor-title').textContent = title;
    
    // Setup URL toggle functionality
    const urlElement = document.getElementById('aws-extractor-url');
    let urlExpanded = false;
    let shortUrl = '';
    
    try {
      const urlObj = new URL(url);
      shortUrl = `${urlObj.hostname}...`;
    } catch (e) {
      shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
    
    urlElement.textContent = shortUrl;
    urlElement.className = 'collapsed';
    urlElement.setAttribute('title', 'Click to toggle full URL');
    
    // Toggle URL on click
    urlElement.addEventListener('click', () => {
      urlExpanded = !urlExpanded;
      if (urlExpanded) {
        urlElement.textContent = url;
        urlElement.className = 'expanded';
      } else {
        urlElement.textContent = shortUrl;
        urlElement.className = 'collapsed';
      }
    });
    
    document.getElementById('aws-extractor-char-count').textContent = text.length.toLocaleString();
    
    const textarea = document.getElementById('aws-extractor-text-preview');
    textarea.value = text;

    // Update character count on edit
    textarea.addEventListener('input', () => {
      document.getElementById('aws-extractor-char-count').textContent = textarea.value.length.toLocaleString();
    });

    // Handle buttons
    const closeModal = () => {
      modal.remove();
    };

    document.getElementById('aws-extractor-close').onclick = () => {
      closeModal();
      reject(new Error('User cancelled'));
    };

    document.getElementById('aws-extractor-cancel').onclick = () => {
      closeModal();
      reject(new Error('User cancelled'));
    };

    document.getElementById('aws-extractor-confirm').onclick = () => {
      const editedText = textarea.value;
      closeModal();
      resolve({ title, text: editedText, images, url });
    };
  });
}

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

  console.log('[AWS Extractor] Showing preview modal...');
  console.log('[AWS Extractor] Title:', pageTitle);
  console.log('[AWS Extractor] Text length:', textContent.length);
  console.log('[AWS Extractor] Images found:', images.length);
  
  // Show preview modal and wait for user confirmation
  showPreviewModal(pageTitle, textContent, images, window.location.href)
    .then((data) => {
      console.log('[AWS Extractor] User confirmed, sending to background script...');
      
      chrome.runtime.sendMessage({
        action: 'saveContent',
        data: data
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[AWS Extractor] Error sending message:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('[AWS Extractor] Content extracted and saved successfully');
        } else {
          console.log('[AWS Extractor] Response:', response);
        }
      });
    })
    .catch((error) => {
      console.log('[AWS Extractor] User cancelled preview:', error.message);
      hasExtracted = false; // Allow re-extraction if cancelled
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
