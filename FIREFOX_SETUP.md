# Firefox Extension Setup

This extension is now compatible with Firefox (version 109+).

## Installation for Firefox

### Option 1: Temporary Installation (for testing)
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Navigate to the extension directory and select `manifest.json`
5. The extension will be loaded temporarily (until Firefox restarts)

### Option 2: Permanent Installation (unsigned)
1. Open Firefox and navigate to `about:config`
2. Search for `xpinstall.signatures.required` and set it to `false`
3. Package the extension as a .zip file (rename to .xpi)
4. Drag and drop the .xpi file into Firefox

### Option 3: Sign and Publish
1. Create an account at https://addons.mozilla.org
2. Submit your extension for review
3. Once approved, it can be installed normally

## Key Differences from Chrome

The manifest has been updated with:
- `browser_specific_settings` for Firefox compatibility
- `background.scripts` instead of `service_worker` (Firefox MV3 style)
- Extension ID for proper Firefox identification

## Testing

Visit https://skillbuilder.aws and the extension will automatically extract content from pages.

## Notes

- The extension uses the `chrome` API which Firefox supports for compatibility
- All Chrome extension APIs used in this extension are supported by Firefox
- Minimum Firefox version: 109.0 (for Manifest V3 support)
