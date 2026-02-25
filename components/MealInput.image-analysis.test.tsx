import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealInput from './MealInput';
import { MealType } from '../types';
import { analyzeFoodImage } from '../services/geminiService';
import { compressBase64Image, shouldCompressImage } from '../utils/imageCompression';

vi.mock('../services/geminiService', () => ({
  analyzeFoodImage: vi.fn().mockResolvedValue([])
}));

vi.mock('../utils/imageCompression', () => ({
  compressBase64Image: vi.fn(),
  shouldCompressImage: vi.fn()
}));

describe('MealInput AI image analysis optimization', () => {
  const mockOnSave = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compresses and analyzes compressed image when image size is over 500KB', async () => {
    const originalImage = 'data:image/jpeg;base64,very-large-image';
    const compressedImage = 'data:image/jpeg;base64,compressed-image';

    vi.mocked(shouldCompressImage).mockReturnValue(true);
    vi.mocked(compressBase64Image).mockResolvedValue(compressedImage);

    render(
      <MealInput
        mealType={MealType.BREAKFAST}
        initialRecord={{ type: MealType.BREAKFAST, items: [], image: originalImage }}
        onSave={mockOnSave}
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /이미지 AI 분석으로 음식 추가하기/i }));

    await waitFor(() => {
      expect(shouldCompressImage).toHaveBeenCalledWith(originalImage, 500 * 1024);
      expect(compressBase64Image).toHaveBeenCalledWith(originalImage);
      expect(analyzeFoodImage).toHaveBeenCalledWith(compressedImage);
    });
  });

  it('analyzes original image without compression when image size is 500KB or less', async () => {
    const originalImage = 'data:image/jpeg;base64,small-image';

    vi.mocked(shouldCompressImage).mockReturnValue(false);

    render(
      <MealInput
        mealType={MealType.LUNCH}
        initialRecord={{ type: MealType.LUNCH, items: [], image: originalImage }}
        onSave={mockOnSave}
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /이미지 AI 분석으로 음식 추가하기/i }));

    await waitFor(() => {
      expect(shouldCompressImage).toHaveBeenCalledWith(originalImage, 500 * 1024);
      expect(compressBase64Image).not.toHaveBeenCalled();
      expect(analyzeFoodImage).toHaveBeenCalledWith(originalImage);
    });
  });

  it('shows sugar, sodium, and cholesterol values in AI analysis modal', async () => {
    const originalImage = 'data:image/jpeg;base64,small-image';

    vi.mocked(shouldCompressImage).mockReturnValue(false);
    vi.mocked(analyzeFoodImage).mockResolvedValue([
      {
        name: '김밥',
        calories: 420,
        carbs: 58,
        protein: 14,
        fat: 12,
        sugar: 6.5,
        sodium: 780,
        cholesterol: 35
      }
    ]);

    render(
      <MealInput
        mealType={MealType.DINNER}
        initialRecord={{ type: MealType.DINNER, items: [], image: originalImage }}
        onSave={mockOnSave}
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /이미지 AI 분석으로 음식 추가하기/i }));

    await waitFor(() => {
      expect(screen.getByText('AI 분석 결과')).toBeTruthy();
      expect(screen.getByText('당류')).toBeTruthy();
      expect(screen.getByText('나트륨')).toBeTruthy();
      expect(screen.getByText('콜레스테롤')).toBeTruthy();
      expect(screen.getByText('6.5g')).toBeTruthy();
      expect(screen.getByText('780mg')).toBeTruthy();
      expect(screen.getByText('35mg')).toBeTruthy();
    });
  });
});
