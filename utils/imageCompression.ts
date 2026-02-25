/**
 * Image compression utilities for optimizing storage
 * Validates: Requirement 4.9
 */

/**
 * Compress a base64 image string
 * @param base64String - The base64 image string (with or without data URI prefix)
 * @param maxWidth - Maximum width in pixels (default: 1024)
 * @param maxHeight - Maximum height in pixels (default: 1024)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed base64 image string
 */
export async function compressBase64Image(
  base64String: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create an image element
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Set image source
      img.src = base64String;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compress an image file directly without base64 pre-conversion.
 * This avoids extra base64 encode/decode work on large uploads.
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<string> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try {
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', quality);
    } finally {
      bitmap.close();
    }
  }

  const base64String = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  return compressBase64Image(base64String, maxWidth, maxHeight, quality);
}

/**
 * Get the size of a base64 string in bytes
 * @param base64String - The base64 string
 * @returns Size in bytes
 */
export function getBase64Size(base64String: string): number {
  // Remove data URI prefix if present
  const base64Data = base64String.split(',')[1] || base64String;
  
  // Calculate size: base64 encoding increases size by ~33%
  // Actual size = (base64 length * 3) / 4
  const padding = (base64Data.match(/=/g) || []).length;
  return (base64Data.length * 3) / 4 - padding;
}

/**
 * Check if an image should be compressed based on size threshold
 * @param base64String - The base64 image string
 * @param thresholdBytes - Size threshold in bytes (default: 500KB)
 * @returns True if image should be compressed
 */
export function shouldCompressImage(
  base64String: string,
  thresholdBytes: number = 500 * 1024
): boolean {
  return getBase64Size(base64String) > thresholdBytes;
}
