function sanitizeFilename(filename) {
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  sanitized = sanitized.replace(/\s+/g, '_');
  sanitized = sanitized.substring(0, 200);
  return sanitized || 'untitled';
}

async function getUniqueFilename(baseFilename, extension) {
  const sanitized = sanitizeFilename(baseFilename);
  let filename = `${sanitized}${extension}`;
  let counter = 1;

  const result = await chrome.storage.local.get('savedFilenames');
  const savedFilenames = result.savedFilenames || {};

  while (savedFilenames[filename]) {
    filename = `${sanitized}_${counter}${extension}`;
    counter++;
  }

  savedFilenames[filename] = true;
  await chrome.storage.local.set({ savedFilenames });

  return filename;
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

async function saveTextContent(title, text, url) {
  try {
    const filename = await getUniqueFilename(title, '.txt');

    const content = `Title: ${title}\nURL: ${url}\nExtracted: ${new Date().toISOString()}\n\n${text}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
      } else {
        console.log('Text file saved:', downloadId);
        URL.revokeObjectURL(blobUrl);
      }
    });

    return filename;
  } catch (error) {
    console.error('Error saving text content:', error);
    throw error;
  }
}

console.log('[AWS Extractor Background] Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[AWS Extractor Background] Message received:', request.action);
  
  if (request.action === 'saveContent') {
    const { title, text, images, url } = request.data;
    console.log('[AWS Extractor Background] Processing save request for:', title);

    (async () => {
      try {
        const textFilename = await saveTextContent(title, text, url);

        if (images && images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            try {
              await downloadImage(images[i], title, i + 1);
            } catch (error) {
              console.error(`Failed to download image ${i + 1}:`, error);
            }
          }
        }

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'AWS Skill Builder Content Saved',
          message: `Saved: ${textFilename}\n${images.length} image(s) extracted`
        });

        sendResponse({ success: true, filename: textFilename });
      } catch (error) {
        console.error('Error in saveContent:', error);

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Save Failed',
          message: 'Failed to save content. Check console for details.'
        });

        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AWS Skill Builder Content Extractor installed');
});
