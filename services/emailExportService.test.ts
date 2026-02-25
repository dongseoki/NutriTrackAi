import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MealType, DailyMealData } from '../types';
import { createMealDataExport, exportMealDataToEmail } from './emailExportService';

const sampleRecords: DailyMealData[] = [
  {
    date: { year: 2026, month: 2, day: 10 },
    meals: {
      [MealType.MORNING_SNACK]: { type: MealType.MORNING_SNACK, items: [] },
      [MealType.BREAKFAST]: { type: MealType.BREAKFAST, items: [] },
      [MealType.LATE_MORNING_SNACK]: { type: MealType.LATE_MORNING_SNACK, items: [] },
      [MealType.LUNCH]: { type: MealType.LUNCH, items: [] },
      [MealType.AFTERNOON_SNACK]: { type: MealType.AFTERNOON_SNACK, items: [] },
      [MealType.DINNER]: { type: MealType.DINNER, items: [] },
      [MealType.EVENING_SNACK]: { type: MealType.EVENING_SNACK, items: [] }
    },
    lastModified: 1700000000000
  }
];

describe('emailExportService', () => {
  const originalNavigator = navigator;
  const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy.mockReturnValue('blob:mocked-url');
    revokeObjectURLSpy.mockImplementation(() => undefined);
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true
    });
  });

  it('should create JSON export file with metadata', () => {
    const result = createMealDataExport(sampleRecords);
    const parsed = JSON.parse(result.json);

    expect(result.fileName).toMatch(/^nutritrack-meals-\d{8}-\d{4}\.json$/);
    expect(parsed.totalDays).toBe(1);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.exportedAt).toBeDefined();
  });

  it('should use Web Share API with attached file when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, share, canShare },
      configurable: true
    });

    const result = await exportMealDataToEmail(sampleRecords);

    expect(canShare).toHaveBeenCalled();
    expect(share).toHaveBeenCalledTimes(1);
    const shareArg = share.mock.calls[0][0];
    expect(Array.isArray(shareArg.files)).toBe(true);
    expect(shareArg.files[0].name).toMatch(/\.json$/);
    expect(result.method).toBe('web-share');
  });

  it('should fallback to download + mailto when Web Share API is unavailable', async () => {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, share: undefined, canShare: undefined },
      configurable: true
    });

    const result = await exportMealDataToEmail(sampleRecords, {
      recipient: 'test@example.com'
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(result.method).toBe('download-mailto');
    expect(result.mailtoUrl).toContain('mailto:test@example.com');
    expect(result.mailtoUrl).toContain('subject=');
  });

  it('should fallback to download + mailto when share fails with NotAllowedError', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const canShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, share, canShare },
      configurable: true
    });

    const result = await exportMealDataToEmail(sampleRecords, {
      recipient: 'dongseok.lee.log@gmail.com'
    });

    expect(share).toHaveBeenCalledTimes(1);
    expect(result.method).toBe('download-mailto');
    expect(result.mailtoUrl).toContain('mailto:dongseok.lee.log@gmail.com');
  });

  it('should throw when there is no data to export', async () => {
    await expect(exportMealDataToEmail([])).rejects.toThrow('내보낼 식단 데이터가 없습니다.');
  });
});
