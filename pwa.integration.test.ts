import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * PWA Integration Tests
 * 
 * These tests validate PWA integration including offline functionality,
 * home screen addition capability, and standalone mode configuration.
 * 
 * Requirements: 3.5, 3.6, 3.7
 */

describe('PWA Integration Tests', () => {
  /**
   * Test: Offline Functionality
   * Requirement 3.5: When a user is offline, THE System SHALL serve cached resources 
   * to enable basic app functionality
   */
  describe('Offline Functionality', () => {
    it('should have service worker with offline cache strategy', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Verify cache-first strategy in fetch handler
      expect(swContent).toContain("addEventListener('fetch'");
      expect(swContent).toContain('caches.match');
      expect(swContent).toContain('event.respondWith');

      // Verify fallback to network when cache misses
      expect(swContent).toContain('fetch(');
      
      // Verify error handling for offline scenarios
      expect(swContent).toContain('catch');
    });

    it('should cache essential app resources', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Extract cached URLs
      const urlsMatch = swContent.match(/urlsToCache\s*=\s*\[([\s\S]*?)\]/);
      expect(urlsMatch).toBeTruthy();

      if (urlsMatch) {
        const urlsString = urlsMatch[1];
        
        // Essential resources that should be cached
        const essentialResources = [
          '/',
          '/index.html',
          '/manifest.json'
        ];

        essentialResources.forEach(resource => {
          expect(urlsString).toContain(resource);
        });
      }
    });

    it('should implement cache-first fetch strategy', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Verify the fetch event handler checks cache first
      const fetchHandlerMatch = swContent.match(/addEventListener\(['"]fetch['"],[\s\S]*?\}\s*\)/);
      expect(fetchHandlerMatch).toBeTruthy();

      if (fetchHandlerMatch) {
        const fetchHandler = fetchHandlerMatch[0];
        
        // Cache should be checked before network
        const cacheMatchIndex = fetchHandler.indexOf('caches.match');
        const fetchIndex = fetchHandler.indexOf('fetch(');
        
        expect(cacheMatchIndex).toBeGreaterThan(-1);
        expect(fetchIndex).toBeGreaterThan(-1);
        expect(cacheMatchIndex).toBeLessThan(fetchIndex);
      }
    });

    it('should handle network failures gracefully', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Should have error handling in fetch
      expect(swContent).toContain('.catch(');
      
      // Should log errors for debugging
      expect(swContent).toMatch(/console\.(error|log)/);
    });
  });

  /**
   * Test: Add to Home Screen
   * Requirement 3.6: When a user adds the app to their home screen, THE System SHALL 
   * display the app icon and name as defined in the manifest
   */
  describe('Add to Home Screen', () => {
    it('should have proper manifest configuration for home screen', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Verify name and short_name for home screen display
      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.short_name.length).toBeGreaterThan(0);
      expect(manifest.short_name.length).toBeLessThanOrEqual(12); // Recommended max length
    });

    it('should have icons suitable for home screen', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Verify icons array exists and has proper sizes
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

      // Check for required icon sizes for different devices
      const iconSizes = manifest.icons.map((icon: any) => icon.sizes);
      expect(iconSizes).toContain('192x192'); // Android
      expect(iconSizes).toContain('512x512'); // High-res devices

      // Verify icons have proper purpose for home screen
      manifest.icons.forEach((icon: any) => {
        expect(icon.type).toBe('image/png');
        expect(icon.purpose).toBeTruthy();
      });
    });

    it('should have apple-touch-icon for iOS home screen', () => {
      const htmlPath = path.join(process.cwd(), 'index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // iOS requires apple-touch-icon for home screen
      expect(htmlContent).toContain('rel="apple-touch-icon"');
      expect(htmlContent).toMatch(/apple-touch-icon.*href/);
    });

    it('should have theme color for home screen appearance', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Theme color affects home screen appearance
      expect(manifest.theme_color).toBeTruthy();
      expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Background color for splash screen
      expect(manifest.background_color).toBeTruthy();
      expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  /**
   * Test: Standalone Mode
   * Requirement 3.7: When the app is launched from the home screen, THE System SHALL 
   * open in standalone mode without browser UI
   */
  describe('Standalone Mode', () => {
    it('should have standalone display mode in manifest', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Display mode should be standalone to hide browser UI
      expect(manifest.display).toBe('standalone');
    });

    it('should have proper start_url for standalone launch', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Start URL should be defined for standalone launch
      expect(manifest.start_url).toBeTruthy();
      expect(manifest.start_url).toBe('/');
    });

    it('should have theme-color meta tag for standalone UI', () => {
      const htmlPath = path.join(process.cwd(), 'index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // Theme color affects standalone mode UI
      expect(htmlContent).toContain('name="theme-color"');
      
      const themeColorMatch = htmlContent.match(/name="theme-color"\s+content="([^"]+)"/);
      expect(themeColorMatch).toBeTruthy();
      
      if (themeColorMatch) {
        expect(themeColorMatch[1]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('should have viewport meta tag for proper standalone rendering', () => {
      const htmlPath = path.join(process.cwd(), 'index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // Viewport is crucial for standalone mode
      expect(htmlContent).toContain('name="viewport"');
      expect(htmlContent).toContain('width=device-width');
      expect(htmlContent).toContain('initial-scale=1.0');
    });

    it('should have description for app listing', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Description helps users understand the app
      expect(manifest.description).toBeTruthy();
      expect(manifest.description.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test: Service Worker Lifecycle
   */
  describe('Service Worker Lifecycle', () => {
    it('should have install event handler', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      expect(swContent).toContain("addEventListener('install'");
      expect(swContent).toContain('event.waitUntil');
      expect(swContent).toContain('caches.open');
    });

    it('should have activate event handler with cache cleanup', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain('caches.keys()');
      expect(swContent).toContain('caches.delete');
    });

    it('should skip waiting on install for immediate activation', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // skipWaiting ensures new service worker activates immediately
      expect(swContent).toContain('skipWaiting');
    });

    it('should claim clients on activate', () => {
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // clients.claim ensures service worker controls all pages immediately
      expect(swContent).toContain('clients.claim');
    });
  });

  /**
   * Test: Browser Compatibility
   */
  describe('Browser Compatibility', () => {
    it('should check for service worker support before registration', () => {
      const indexPath = path.join(process.cwd(), 'index.tsx');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Should check if service worker is supported
      expect(indexContent).toContain("'serviceWorker' in navigator");
    });

    it('should register service worker only after page load', () => {
      const indexPath = path.join(process.cwd(), 'index.tsx');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Should wait for load event to avoid blocking initial render
      expect(indexContent).toContain("addEventListener('load'");
      expect(indexContent).toContain('.register(');
    });

    it('should handle service worker registration errors', () => {
      const indexPath = path.join(process.cwd(), 'index.tsx');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Should have error handling for registration
      expect(indexContent).toContain('.catch(');
      expect(indexContent).toMatch(/registration.*error/i);
    });

    it('should log successful service worker registration', () => {
      const indexPath = path.join(process.cwd(), 'index.tsx');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Should log success for debugging
      expect(indexContent).toContain('.then(');
      expect(indexContent).toContain('Service Worker registered successfully');
    });
  });

  /**
   * Test: PWA Installability
   */
  describe('PWA Installability', () => {
    it('should meet basic PWA criteria', () => {
      // Check manifest exists
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      // Check service worker exists
      const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
      expect(fs.existsSync(swPath)).toBe(true);

      // Check HTML references manifest
      const htmlPath = path.join(process.cwd(), 'index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      expect(htmlContent).toContain('rel="manifest"');

      // Check service worker registration
      const indexPath = path.join(process.cwd(), 'index.tsx');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      expect(indexContent).toContain('serviceWorker');
    });

    it('should have HTTPS-ready configuration', () => {
      const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Start URL should be relative (works with any protocol)
      expect(manifest.start_url).toBe('/');
      
      // Icons should use relative paths
      manifest.icons.forEach((icon: any) => {
        expect(icon.src).toMatch(/^\//);
      });
    });
  });
});
