import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import { storageService } from './services/storageService';

vi.mock('./services/geminiService', () => ({
  analyzeFoodImage: vi.fn().mockResolvedValue([]),
}));

vi.mock('./services/storageService', () => ({
  storageService: {
    init: vi.fn().mockResolvedValue(undefined),
    setErrorCallback: vi.fn(),
    loadMealRecords: vi.fn().mockResolvedValue({
      '아침전 간식': { type: '아침전 간식', items: [] },
      '아침': { type: '아침', items: [] },
      '아침-점심 사이 간식': { type: '아침-점심 사이 간식', items: [] },
      '점심': { type: '점심', items: [] },
      '점심-저녁 사이 간식': { type: '점심-저녁 사이 간식', items: [] },
      '저녁': { type: '저녁', items: [] },
      '저녁 간식': { type: '저녁 간식', items: [] },
    }),
    saveMealRecords: vi.fn().mockResolvedValue(undefined),
    getAllDatesWithData: vi.fn().mockResolvedValue([]),
    getAllMealData: vi.fn().mockResolvedValue([
      {
        date: { year: 2026, month: 2, day: 25 },
        meals: {
          '아침전 간식': { type: '아침전 간식', items: [] },
          '아침': {
            type: '아침',
            items: [
              {
                id: '1',
                name: '사과',
                calories: 95,
                carbs: 25,
                protein: 0.5,
                fat: 0.3,
                sugar: 19,
                sodium: 2,
                cholesterol: 0
              }
            ]
          },
          '아침-점심 사이 간식': { type: '아침-점심 사이 간식', items: [] },
          '점심': { type: '점심', items: [] },
          '점심-저녁 사이 간식': { type: '점심-저녁 사이 간식', items: [] },
          '저녁': { type: '저녁', items: [] },
          '저녁 간식': { type: '저녁 간식', items: [] }
        },
        lastModified: 1700000000000
      }
    ]),
  },
}));

describe('Email Export E2E', () => {
  const originalNavigator = navigator;
  const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy.mockReturnValue('blob:test-mail-export');
    revokeObjectURLSpy.mockImplementation(() => undefined);

    const share = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, share, canShare },
      configurable: true
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true
    });
  });

  it('should fallback to mailto with target recipient when share permission is denied', async () => {
    render(<App />);

    await waitFor(() => {
      expect(storageService.init).toHaveBeenCalled();
    });

    const button = screen.getByLabelText('이메일로 JSON 내보내기');
    fireEvent.click(button);

    await waitFor(() => {
      expect(storageService.getAllMealData).toHaveBeenCalledTimes(1);
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledTimes(1);
    });

    const [mailtoUrl, target] = openSpy.mock.calls[0];
    expect(target).toBe('_self');
    expect(String(mailtoUrl)).toContain('mailto:dongseok.lee.log@gmail.com');
  });
});
