# PWA Assets

## Icons

The app requires two icon sizes for PWA functionality:
- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

### Current Status

Placeholder files have been created. To generate proper PNG icons:

1. **Using the HTML generator**: Open `generate-icons.html` in a browser to automatically download PNG icons
2. **Using SVG files**: Convert `icon-192.svg` and `icon-512.svg` to PNG using:
   - Online tools: https://cloudconvert.com/svg-to-png
   - Command line: `convert icon-192.svg icon-192.png` (requires ImageMagick)
3. **Using design tools**: Create icons in Figma, Photoshop, or similar tools

### Icon Design

The icons should:
- Use the app's theme color: `#4f46e5` (indigo)
- Include a food/meal related symbol (🍽️ emoji or custom design)
- Include the text "식단관리" or app logo
- Have a white foreground on the indigo background
