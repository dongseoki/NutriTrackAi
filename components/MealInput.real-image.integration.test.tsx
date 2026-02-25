import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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

const COMPRESSED_IMAGE_BASE64 = 'data:image/jpeg;base64,REAL_IMAGE_COMPRESSED';

describe('MealInput integration - provided real image file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the provided 3.7MB image fixture and sends optimized image to AI', async () => {
    vi.mocked(compressImageFile).mockResolvedValue(COMPRESSED_IMAGE_BASE64);
    vi.mocked(shouldCompressImage).mockReturnValue(false);

    const fixturePath = path.join(process.cwd(), 'test-fixtures/real-meal-3_7mb.jpeg');
    const fixtureBuffer = readFileSync(fixturePath);
    const realImageFile = new File([fixtureBuffer], 'real-meal-3_7mb.jpeg', { type: 'image/jpeg' });

    expect(realImageFile.size).toBeGreaterThan(3 * 1024 * 1024);

    const { container } = render(
      <MealInput
        mealType={MealType.LUNCH}
        initialRecord={{ type: MealType.LUNCH, items: [] }}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [realImageFile] } });

    await waitFor(() => {
      expect(compressImageFile).toHaveBeenCalledWith(realImageFile, 960, 960, 0.65);
    });

    fireEvent.click(screen.getByRole('button', { name: /이미지 AI 분석으로 음식 추가하기/i }));

    await waitFor(() => {
      expect(analyzeFoodImage).toHaveBeenCalledWith(COMPRESSED_IMAGE_BASE64);
    });
  });
});
