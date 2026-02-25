import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MealInput from './MealInput';
import { MealType } from '../types';
import { analyzeFoodImage } from '../services/geminiService';
import { compressImageFile, shouldCompressImage } from '../utils/imageCompression';

vi.mock('../services/geminiService', () => ({
  analyzeFoodImage: vi.fn().mockResolvedValue([])
}));

vi.mock('../utils/imageCompression', () => ({
  compressBase64Image: vi.fn(),
  compressImageFile: vi.fn(),
  shouldCompressImage: vi.fn()
}));

const ORIGINAL_IMAGE_BASE64 = 'data:image/jpeg;base64,ORIGINAL_IMAGE';
const COMPRESSED_IMAGE_BASE64 = 'data:image/jpeg;base64,COMPRESSED_IMAGE';

class MockFileReader {
  result: string | ArrayBuffer | null = ORIGINAL_IMAGE_BASE64;
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsDataURL(_blob: Blob) {
    setTimeout(() => {
      this.onloadend?.call(this as unknown as FileReader, new ProgressEvent('loadend'));
    }, 0);
  }
}

describe('MealInput integration - large image upload optimization', () => {
  const originalFileReader = globalThis.FileReader;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);
  });

  afterEach(() => {
    vi.stubGlobal('FileReader', originalFileReader);
  });

  it('optimizes a 3.7MB image during upload and sends optimized image to AI analysis', async () => {
    vi.mocked(compressImageFile).mockResolvedValue(COMPRESSED_IMAGE_BASE64);
    vi.mocked(shouldCompressImage).mockReturnValue(false);

    const largeImageFile = new File([
      new Uint8Array(Math.floor(3.7 * 1024 * 1024))
    ], 'meal-3.7mb.jpg', { type: 'image/jpeg' });

    const { container } = render(
      <MealInput
        mealType={MealType.LUNCH}
        initialRecord={{ type: MealType.LUNCH, items: [] }}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [largeImageFile] } });

    await waitFor(() => {
      expect(compressImageFile).toHaveBeenCalledWith(largeImageFile, 960, 960, 0.65);
    });

    fireEvent.click(screen.getByRole('button', { name: /이미지 AI 분석으로 음식 추가하기/i }));

    await waitFor(() => {
      expect(analyzeFoodImage).toHaveBeenCalledWith(COMPRESSED_IMAGE_BASE64);
    });
  });

  it('skips upload optimization for <=500KB image and sends original image to AI analysis', async () => {
    vi.mocked(shouldCompressImage).mockReturnValue(false);

    const smallImageFile = new File([
      new Uint8Array(400 * 1024)
    ], 'meal-small.jpg', { type: 'image/jpeg' });

    const { container } = render(
      <MealInput
        mealType={MealType.DINNER}
        initialRecord={{ type: MealType.DINNER, items: [] }}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [smallImageFile] } });

    await waitFor(() => {
      expect(screen.getByAltText('Food')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /이미지 AI 분석으로 음식 추가하기/i }));

    await waitFor(() => {
      expect(compressImageFile).not.toHaveBeenCalled();
      expect(analyzeFoodImage).toHaveBeenCalledWith(ORIGINAL_IMAGE_BASE64);
    });
  });
});
