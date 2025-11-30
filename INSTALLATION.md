# AWS Skill Builder Content Extractor - Installation Guide

## Overview
This Chrome extension automatically extracts and saves content from AWS Skill Builder pages when you visit them.

## Features
- Automatically extracts text from the main content area (`div.page-wrap#page-wrap`)
- Downloads extracted content as `.txt` files
- Extracts and saves all images found in the content area
- Creates unique filenames based on page titles
- Handles duplicate filenames automatically
- Provides notifications when content is saved
- Only activates on `skillbuilder.aws` domain

## Installation Instructions

### Step 1: Prepare the Extension Files
1. Ensure you have all the following files in the project directory:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `popup.html`
   - `popup.js`
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

### Step 2: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable "Developer mode" by toggling the switch in the top-right corner

3. Click "Load unpacked" button

4. Select the project directory containing the extension files

5. The extension should now appear in your extensions list

### Step 3: Verify Installation

1. You should see the AWS Skill Builder Content Extractor icon in your Chrome toolbar

2. Click the icon to open the popup and verify the extension is loaded

3. Navigate to any page on `https://skillbuilder.aws`

4. The extension will automatically extract content when the page loads

## Usage

### Automatic Extraction
- Simply visit any page on `skillbuilder.aws`
- The extension automatically detects the `page-wrap` div
- Content is extracted and saved automatically
- You'll receive a notification when the save is complete

### What Gets Saved
- **Text File**: Contains the page title, URL, timestamp, and all text content
- **Images**: All images within the content area are saved separately
- **Filename Format**: Based on the page title, with invalid characters replaced
- **Duplicate Handling**: Numbered suffixes added (e.g., `title_1.txt`, `title_2.txt`)

### Download Location
- Files are saved to your default Chrome download directory
- Check Chrome's download settings (`chrome://settings/downloads`) to change the location

### Viewing Statistics
1. Click the extension icon in the toolbar
2. View the number of files saved and images extracted
3. Click "Clear Statistics" to reset the counters

## Permissions Explained

The extension requires the following permissions:

- **activeTab**: To access the current tab's content
- **downloads**: To save extracted content as files
- **notifications**: To show success/failure notifications
- **storage**: To track saved filenames and prevent duplicates
- **host_permissions (skillbuilder.aws)**: To only run on AWS Skill Builder pages

## Troubleshooting

### Content Not Extracting
- Verify the page has a `<div class="page-wrap" id="page-wrap">` element
- Check the browser console for error messages
- Ensure the extension is enabled in `chrome://extensions/`

### Downloads Not Working
- Check Chrome's download permissions
- Verify you're not blocking automatic downloads
- Check your disk space

### Notifications Not Showing
- Check Chrome's notification settings
- Ensure notifications are enabled for Chrome in your OS settings

## Privacy & Security
- This extension only runs on `skillbuilder.aws` domain
- No data is sent to external servers
- All processing happens locally in your browser
- Extracted content is saved directly to your computer

## Uninstallation
1. Go to `chrome://extensions/`
2. Find "AWS Skill Builder Content Extractor"
3. Click "Remove"
4. Confirm the removal

## Technical Notes
- The extension waits 1 second after page load before extracting content
- It monitors for dynamic content changes using MutationObserver
- It prevents duplicate extractions on the same page
- Filenames are sanitized to remove invalid characters
- Maximum filename length is 200 characters

## Support
If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify the page structure matches the expected format
3. Ensure you're running a recent version of Chrome
4. Try disabling other extensions that might conflict
