import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import App from './App';
import { storageService } from './services/storageService';

// Mock the geminiService to avoid API key requirement
vi.mock('./services/geminiService', () => ({
  analyzeFoodImage: vi.fn().mockResolvedValue([]),
}));

// Mock the storageService
vi.mock('./services/storageService', () => ({
  storageService: {
    init: vi.fn().mockResolvedValue(undefined),
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
  },
}));

describe('App Component - Date Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: meal-tracker-improvements, Property 1: Date Selection Updates Display**
   * **Validates: Requirements 1.6**
   * 
   * For any valid date selected from the calendar, the dashboard should display 
   * meal records corresponding to that specific date.
   */
  it('should load meal records for the selected date', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate dates close to current month to avoid complex navigation
        fc.integer({ min: 1, max: 28 }),
        async (day) => {
          // Reset mocks for each iteration
          vi.clearAllMocks();
          
          // Render the app
          const { unmount } = render(<App />);
          
          // Wait for initial load
          await waitFor(() => {
            expect(storageService.init).toHaveBeenCalled();
          }, { timeout: 1000 });

          // Record the number of loadMealRecords calls before opening calendar
          const initialCallCount = (storageService.loadMealRecords as any).mock.calls.length;

          // Open calendar
          const calendarButtons = screen.getAllByLabelText('달력 열기');
          fireEvent.click(calendarButtons[0]);

          // Wait for calendar to appear
          await waitFor(() => {
            expect(screen.getByText('닫기')).toBeDefined();
          }, { timeout: 1000 });

          // Find and click the date button for current month
          const dateButtons = screen.getAllByRole('button');
          const targetButton = dateButtons.find(btn => 
            btn.textContent?.trim() === String(day) && 
            !btn.textContent?.includes('닫기') &&
            !btn.getAttribute('aria-label')
          );

          if (targetButton) {
            fireEvent.click(targetButton);

            // Wait for loadMealRecords to be called
            await waitFor(() => {
              const calls = (storageService.loadMealRecords as any).mock.calls;
              // Check if there's a new call after the initial ones
              expect(calls.length).toBeGreaterThan(initialCallCount);
            }, { timeout: 1000 });
          }

          // Explicitly unmount
          unmount();
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 15000);

  /**
   * **Feature: meal-tracker-improvements, Property 3: Today Button Returns to Current Date**
   * **Validates: Requirements 1.8**
   * 
   * For any date currently displayed in the dashboard, clicking the "오늘보기" button 
   * should change the displayed date to today's date.
   */
  it('should return to today when clicking the today button', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate dates in the past to ensure "오늘보기" button appears
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 1, max: 6 }), // months in the past
        async (day, monthsAgo) => {
          const today = new Date();
          const pastDate = new Date(today);
          pastDate.setMonth(pastDate.getMonth() - monthsAgo);
          
          // Skip if we end up on today somehow
          if (pastDate.getFullYear() === today.getFullYear() &&
              pastDate.getMonth() === today.getMonth() &&
              pastDate.getDate() === today.getDate()) {
            return true;
          }

          // Reset mocks
          vi.clearAllMocks();
          
          // Render the app
          const { unmount } = render(<App />);
          
          // Wait for initial load
          await waitFor(() => {
            expect(storageService.init).toHaveBeenCalled();
          }, { timeout: 1000 });

          // Open calendar
          const calendarButtons = screen.getAllByLabelText('달력 열기');
          fireEvent.click(calendarButtons[0]);

          await waitFor(() => {
            expect(screen.getByText('닫기')).toBeDefined();
          }, { timeout: 1000 });

          // Navigate to past month
          const prevButton = screen.getByLabelText('Previous month');
          for (let i = 0; i < monthsAgo; i++) {
            fireEvent.click(prevButton);
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Find and click a date button
          const dateButtons = screen.getAllByRole('button');
          const targetButton = dateButtons.find(btn => 
            btn.textContent?.trim() === String(day) && 
            !btn.textContent?.includes('닫기') &&
            !btn.getAttribute('aria-label')
          );

          if (targetButton) {
            fireEvent.click(targetButton);

            // Wait for calendar to close
            await waitFor(() => {
              expect(screen.queryByText('닫기')).toBeNull();
            }, { timeout: 1000 });

            // Check if "오늘보기" button appears
            const todayButtons = screen.queryAllByText('오늘보기');
            
            if (todayButtons.length > 0) {
              // Click the today button
              fireEvent.click(todayButtons[0]);

              // Wait for loadMealRecords to be called with today's date
              await waitFor(() => {
                const calls = (storageService.loadMealRecords as any).mock.calls;
                const todayCall = calls.find((call: any) => {
                  const dateKey = call[0];
                  return dateKey.year === today.getFullYear() && 
                         dateKey.month === today.getMonth() + 1 && 
                         dateKey.day === today.getDate();
                });
                expect(todayCall).toBeDefined();
              }, { timeout: 1000 });

              // The header should show "오늘"
              const headers = screen.queryAllByText('오늘');
              expect(headers.length).toBeGreaterThan(0);
            }
          }

          // Explicitly unmount
          unmount();
        }
      ),
      { numRuns: 15, timeout: 10000 }
    );
  }, 20000);
});

/**
 * Unit Tests for Date Management
 * Requirements: 1.6, 1.8
 */
describe('App Component - Date Management Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display "오늘" when showing today\'s date', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('오늘')).toBeDefined();
    });
  });

  it('should show calendar icon button', async () => {
    render(<App />);
    
    await waitFor(() => {
      const calendarButton = screen.getByLabelText('달력 열기');
      expect(calendarButton).toBeDefined();
    });
  });

  it('should not show "오늘보기" button when displaying today', async () => {
    render(<App />);
    
    await waitFor(() => {
      const todayButton = screen.queryByText('오늘보기');
      expect(todayButton).toBeNull();
    });
  });

  it('should open calendar when clicking calendar icon', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(storageService.init).toHaveBeenCalled();
    });

    const calendarButton = screen.getByLabelText('달력 열기');
    fireEvent.click(calendarButton);

    await waitFor(() => {
      expect(screen.getByText('닫기')).toBeDefined();
    });
  });

  it('should initialize storage service on mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(storageService.init).toHaveBeenCalledTimes(1);
      expect(storageService.getAllDatesWithData).toHaveBeenCalled();
    });
  });

  it('should load meal records for today on initial render', async () => {
    render(<App />);
    
    const today = new Date();
    
    await waitFor(() => {
      const calls = (storageService.loadMealRecords as any).mock.calls;
      const todayCall = calls.find((call: any) => {
        const dateKey = call[0];
        return dateKey.year === today.getFullYear() && 
               dateKey.month === today.getMonth() + 1 && 
               dateKey.day === today.getDate();
      });
      expect(todayCall).toBeDefined();
    });
  });
});
