function sanitizeFilename(filename) {
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  sanitized = sanitized.replace(/\s+/g, '_');
  sanitized = sanitized.substring(0, 200);
  return sanitized || 'untitled';
}

async function getUniqueFilename(baseFilename, extension) {
  const sanitized = sanitizeFilename(baseFilename);
  
  const settings = await chrome.storage.local.get(['enablePrefix', 'prefixStart', 'currentPrefix', 'savedFilenames']);
  const savedFilenames = settings.savedFilenames || {};
  
  if (settings.enablePrefix) {
    // Use incrementing prefix
    const currentPrefix = settings.currentPrefix !== undefined ? settings.currentPrefix : (settings.prefixStart || 0);
    const prefix = String(currentPrefix).padStart(3, '0');
    const filename = `${prefix}_${sanitized}${extension}`;
    
    // Increment for next time
    await chrome.storage.local.set({ currentPrefix: currentPrefix + 1 });
    
    // Still track in savedFilenames
    savedFilenames[filename] = true;
    await chrome.storage.local.set({ savedFilenames });
    
    return filename;
  } else {
    // Original behavior: check for duplicates
    let filename = `${sanitized}${extension}`;
    let counter = 1;

    while (savedFilenames[filename]) {
      filename = `${sanitized}_${counter}${extension}`;
      counter++;
    }

    savedFilenames[filename] = true;
    await chrome.storage.local.set({ savedFilenames });

    return filename;
  }
}

async function downloadImage(imageData, baseFilename, index) {
  try {
    const response = await fetch(imageData.src);
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const base64data = reader.result;

        const extension = imageData.src.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        const ext = extension ? extension[0] : '.jpg';
        const imageName = `${sanitizeFilename(baseFilename)}_image_${index}${ext}`;

        chrome.downloads.download({
          url: base64data,
          filename: imageName,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(downloadId);
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

async function transformWithClaude(text, title, url) {
  const settings = await chrome.storage.local.get([
    'claudeEnabled',
    'claudeApiKey',
    'claudeModel',
    'claudePrompt'
  ]);

  console.log('[AWS Extractor Background] Claude enabled:', settings.claudeEnabled);
  console.log('[AWS Extractor Background] API key present:', !!settings.claudeApiKey);
  console.log('[AWS Extractor Background] Model:', settings.claudeModel);

  if (!settings.claudeEnabled || !settings.claudeApiKey) {
    console.log('[AWS Extractor Background] Claude disabled or no API key, returning raw text');
    return text;
  }

  try {
    console.log('[AWS Extractor Background] Calling Claude API...');
    console.log('[AWS Extractor Background] Content length:', text.length);
    
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.anthropic.com/v1/messages', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('x-api-key', settings.claudeApiKey);
      xhr.setRequestHeader('anthropic-version', '2023-06-01');
      xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
      
      // Increase timeout for large content
      xhr.timeout = 180000; // 180 seconds (3 minutes)
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log('[AWS Extractor Background] Claude transformation successful');
            resolve(data.content[0].text);
          } catch (e) {
            console.error('[AWS Extractor Background] Error parsing response:', e);
            resolve(text);
          }
        } else {
          console.error('[AWS Extractor Background] Claude API error:', xhr.status, xhr.responseText);
          resolve(text);
        }
      };
      
      xhr.onerror = function() {
        console.error('[AWS Extractor Background] Network error calling Claude API');
        resolve(text);
      };
      
      xhr.onabort = function() {
        console.error('[AWS Extractor Background] Request aborted');
        resolve(text);
      };
      
      xhr.ontimeout = function() {
        console.error('[AWS Extractor Background] Request timed out after 3 minutes');
        resolve(text);
      };
      
      const requestBody = {
        model: settings.claudeModel || 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `${settings.claudePrompt}\n\n---\n\nTitle: ${title}\nURL: ${url}\n\nContent:\n${text}`
        }]
      };
      
      console.log('[AWS Extractor Background] Request body size:', JSON.stringify(requestBody).length);
      xhr.send(JSON.stringify(requestBody));
    });
  } catch (error) {
    console.error('[AWS Extractor Background] Error transforming with Claude:', error);
    return text;
  }
}

async function saveTextContent(title, text, url) {
  try {
    console.log('[AWS Extractor Background] Starting text transformation...');
    const transformedText = await transformWithClaude(text, title, url);
    console.log('[AWS Extractor Background] Transformation complete, saving file...');
    
    const filename = await getUniqueFilename(title, '.md');

    const content = `# ${title}\n\n**URL:** ${url}  \n**Extracted:** ${new Date().toISOString()}\n\n---\n\n${transformedText}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);

    const settings = await chrome.storage.local.get(['promptFilename']);
    const saveAs = settings.promptFilename || false;

    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: saveAs
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[AWS Extractor Background] Download failed:', chrome.runtime.lastError);
      } else {
        console.log('[AWS Extractor Background] Text file saved:', filename);
        URL.revokeObjectURL(blobUrl);
      }
    });

    return filename;
  } catch (error) {
    console.error('[AWS Extractor Background] Error saving text content:', error);
    throw error;
  }
}

// Keep-alive mechanism to prevent service worker from terminating
let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) return;
  
  console.log('[AWS Extractor Background] Starting keep-alive');
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker alive
    });
  }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    console.log('[AWS Extractor Background] Stopping keep-alive');
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

console.log('[AWS Extractor Background] Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AWS Extractor Background] Message received:', request.action);
  
  if (request.action === 'saveContent') {
    const { title, text, images, url } = request.data;
    console.log('[AWS Extractor Background] Processing save request for:', title);

    // Start keep-alive to prevent service worker termination
    startKeepAlive();

    // Process asynchronously
    (async () => {
      try {
        const textFilename = await saveTextContent(title, text, url);

        if (images && images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            try {
              await downloadImage(images[i], title, i + 1);
            } catch (error) {
              console.error(`[AWS Extractor Background] Failed to download image ${i + 1}:`, error);
            }
          }
        }

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'AWS Skill Builder Content Saved',
          message: `Saved: ${textFilename}\n${images.length} image(s) extracted`
        });
      } catch (error) {
        console.error('[AWS Extractor Background] Error in saveContent:', error);

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Save Failed',
          message: 'Failed to save content. Check console for details.'
        });
      } finally {
        // Stop keep-alive after processing is complete
        stopKeepAlive();
      }
    })();

    sendResponse({ success: true, status: 'processing' });
    return false;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AWS Skill Builder Content Extractor installed');
});
