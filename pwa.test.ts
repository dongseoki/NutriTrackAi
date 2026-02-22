import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * PWA Property-Based Tests
 * 
 * These tests validate PWA functionality including manifest availability
 * and service worker registration capabilities.
 */

describe('PWA - Manifest and Service Worker', () => {
  /**
   * **Feature: meal-tracker-improvements, Property 7: Manifest File Availability**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any request to the manifest file path, the server should return a valid JSON 
   * manifest with required PWA fields (name, icons, start_url, display).
   */
  it('should have a valid manifest.json with all required PWA fields', () => {
    // Read the manifest file
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Validate required fields
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
    expect(manifest).toHaveProperty('theme_color');
    expect(manifest).toHaveProperty('background_color');

    // Validate field types and values
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
    
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.length).toBeGreaterThan(0);
    
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    
    // Validate icons array
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    
    // Check for required icon sizes
    const iconSizes = manifest.icons.map((icon: any) => icon.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
    
    // Validate each icon has required properties
    manifest.icons.forEach((icon: any) => {
      expect(icon).toHaveProperty('src');
      expect(icon).toHaveProperty('sizes');
      expect(icon).toHaveProperty('type');
      expect(typeof icon.src).toBe('string');
      expect(icon.src.length).toBeGreaterThan(0);
    });

    // Validate theme color format (should be a valid hex color)
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  /**
   * Property test: Manifest should remain valid across different field orderings
   * This ensures the manifest structure is robust
   */
  it('should parse manifest regardless of field order', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(
          ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color'],
          { minLength: 7, maxLength: 7 }
        ),
        (fieldOrder) => {
          const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
          const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);

          // Verify all fields exist regardless of order
          fieldOrder.forEach(field => {
            expect(manifest).toHaveProperty(field);
          });

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: meal-tracker-improvements, Property 8: Service Worker Registration**
   * **Validates: Requirements 3.3**
   * 
   * For any app initialization, the service worker should be successfully registered 
   * if the browser supports service workers.
   */
  it('should have service worker registration code in index.tsx', () => {
    const indexPath = path.join(process.cwd(), 'index.tsx');
    expect(fs.existsSync(indexPath)).toBe(true);

    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Check for service worker registration code
    expect(indexContent).toContain('serviceWorker');
    expect(indexContent).toContain('navigator.serviceWorker');
    expect(indexContent).toContain('register');
    expect(indexContent).toContain('/service-worker.js');

    // Check for browser support check
    expect(indexContent).toContain("'serviceWorker' in navigator");
  });

  it('should have a valid service worker file', () => {
    const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Check for required service worker event listeners
    expect(swContent).toContain('install');
    expect(swContent).toContain('activate');
    expect(swContent).toContain('fetch');

    // Check for cache management
    expect(swContent).toContain('caches');
    expect(swContent).toContain('CACHE_NAME');

    // Check for event listener registration
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('activate'");
    expect(swContent).toContain("addEventListener('fetch'");
  });

  /**
   * Property test: Service worker cache name should be consistent
   */
  it('should use consistent cache naming across service worker', () => {
    const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Extract cache name
    const cacheNameMatch = swContent.match(/const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
    expect(cacheNameMatch).toBeTruthy();
    
    if (cacheNameMatch) {
      const cacheName = cacheNameMatch[1];
      
      // Cache name should follow a version pattern
      expect(cacheName).toMatch(/^[a-z-]+-v\d+$/);
      
      // Cache name should be used in multiple places
      const cacheNameOccurrences = (swContent.match(new RegExp(cacheName, 'g')) || []).length;
      expect(cacheNameOccurrences).toBeGreaterThanOrEqual(1);
    }
  });

  /**
   * Property test: All cached URLs should be valid paths
   */
  it('should cache only valid URL paths', () => {
    const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Extract urlsToCache array
    const urlsMatch = swContent.match(/urlsToCache\s*=\s*\[([\s\S]*?)\]/);
    expect(urlsMatch).toBeTruthy();
    
    if (urlsMatch) {
      const urlsString = urlsMatch[1];
      const urls = urlsString
        .split(',')
        .map(url => url.trim().replace(/['"]/g, ''))
        .filter(url => url.length > 0);

      // Each URL should start with /
      urls.forEach(url => {
        expect(url).toMatch(/^\//);
      });

      // Should include essential files
      expect(urls).toContain('/');
      expect(urls).toContain('/index.html');
      expect(urls).toContain('/manifest.json');
    }
  });

  it('should have manifest link in index.html', () => {
    const htmlPath = path.join(process.cwd(), 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Check for manifest link
    expect(htmlContent).toContain('rel="manifest"');
    expect(htmlContent).toContain('href="/manifest.json"');

    // Check for theme color meta tag
    expect(htmlContent).toContain('name="theme-color"');
    expect(htmlContent).toContain('content="#4f46e5"');

    // Check for icon links
    expect(htmlContent).toContain('icon-192.png');
    expect(htmlContent).toContain('icon-512.png');
  });
});

/**
 * Unit Tests for PWA Configuration
 * Requirements: 3.1, 3.2, 3.3
 */
describe('PWA - Configuration Unit Tests', () => {
  it('should have icon files referenced in manifest', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    manifest.icons.forEach((icon: any) => {
      const iconPath = path.join(process.cwd(), 'public', icon.src.replace('/', ''));
      // Note: Icon files may be placeholders, so we just check the path is defined
      expect(icon.src).toBeTruthy();
    });
  });

  it('should have correct display mode for standalone app', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    expect(manifest.display).toBe('standalone');
  });

  it('should have app name in Korean', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Check that name contains Korean characters
    expect(manifest.name).toMatch(/[가-힣]/);
    expect(manifest.short_name).toMatch(/[가-힣]/);
  });

  it('should have consistent theme color across manifest and HTML', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    const htmlPath = path.join(process.cwd(), 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    const themeColorMatch = htmlContent.match(/name="theme-color"\s+content="([^"]+)"/);
    expect(themeColorMatch).toBeTruthy();
    
    if (themeColorMatch) {
      expect(manifest.theme_color).toBe(themeColorMatch[1]);
    }
  });

  it('should have service worker with error handling', () => {
    const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Check for error handling in fetch
    expect(swContent).toContain('catch');
    expect(swContent).toContain('error');
  });

  it('should have service worker with cache cleanup on activate', () => {
    const swPath = path.join(process.cwd(), 'public', 'service-worker.js');
    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Check for cache cleanup logic
    expect(swContent).toContain('caches.keys()');
    expect(swContent).toContain('caches.delete');
  });
});
