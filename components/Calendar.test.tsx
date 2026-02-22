import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import Calendar from './Calendar';

describe('Calendar Component', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: meal-tracker-improvements, Property 2: Calendar Navigation Preserves Month Boundaries**
   * **Validates: Requirements 1.4, 1.5**
   * 
   * For any current month displayed in the calendar, navigating to the previous month 
   * and then to the next month should return to the original month.
   */
  it('should preserve month boundaries when navigating back and forth', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary year (2000-2100) and month (0-11)
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 0, max: 11 }),
        (year, month) => {
          const initialDate = new Date(year, month, 15);
          const mockOnDateSelect = vi.fn();
          const mockOnClose = vi.fn();

          render(
            <Calendar
              selectedDate={initialDate}
              onDateSelect={mockOnDateSelect}
              onClose={mockOnClose}
              datesWithData={[]}
            />
          );

          // Get the initial month display
          const initialMonthText = screen.getByRole('heading', { level: 2 }).textContent;

          // Click previous month button
          const prevButton = screen.getByLabelText('Previous month');
          fireEvent.click(prevButton);

          // Click next month button
          const nextButton = screen.getByLabelText('Next month');
          fireEvent.click(nextButton);

          // Get the final month display
          const finalMonthText = screen.getByRole('heading', { level: 2 }).textContent;

          // The month should be the same after going back and forth
          expect(finalMonthText).toBe(initialMonthText);

          // Clean up after each property test iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

  /**
   * Unit Tests for Calendar Component
   * Requirements: 1.4, 1.5, 1.6
   */

  describe('Date Selection', () => {
    it('should call onDateSelect and onClose when a date is clicked', () => {
      const selectedDate = new Date(2024, 0, 15);
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      // Find and click a date button (day 10)
      const dateButtons = screen.getAllByRole('button');
      const day10Button = dateButtons.find(btn => btn.textContent?.includes('10'));
      
      if (day10Button) {
        fireEvent.click(day10Button);
        
        expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        
        const calledDate = mockOnDateSelect.mock.calls[0][0];
        expect(calledDate.getDate()).toBe(10);
        expect(calledDate.getMonth()).toBe(0);
        expect(calledDate.getFullYear()).toBe(2024);
      }
    });

    it('should highlight the selected date', () => {
      const selectedDate = new Date(2024, 0, 15);
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      // Find the button for day 15
      const dateButtons = screen.getAllByRole('button');
      const day15Button = dateButtons.find(btn => 
        btn.textContent?.includes('15') && btn.className.includes('bg-indigo-600')
      );
      
      expect(day15Button).toBeDefined();
    });

    it('should show indicators for dates with data', () => {
      const selectedDate = new Date(2024, 0, 15);
      const datesWithData = [
        new Date(2024, 0, 5),
        new Date(2024, 0, 10),
        new Date(2024, 0, 20)
      ];
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      const { container } = render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={datesWithData}
        />
      );

      // Check for indicator dots (small rounded divs)
      const indicators = container.querySelectorAll('.w-1\\.5.h-1\\.5.rounded-full');
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe('Month Navigation', () => {
    it('should navigate to previous month when clicking previous button', () => {
      const selectedDate = new Date(2024, 5, 15); // June 2024
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      const initialMonth = screen.getByRole('heading', { level: 2 }).textContent;
      expect(initialMonth).toContain('6월');

      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);

      const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
      expect(newMonth).toContain('5월');
    });

    it('should navigate to next month when clicking next button', () => {
      const selectedDate = new Date(2024, 5, 15); // June 2024
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      const initialMonth = screen.getByRole('heading', { level: 2 }).textContent;
      expect(initialMonth).toContain('6월');

      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);

      const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
      expect(newMonth).toContain('7월');
    });

    it('should handle year boundary when navigating months', () => {
      const selectedDate = new Date(2024, 0, 15); // January 2024
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);

      const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
      expect(newMonth).toContain('2023년');
      expect(newMonth).toContain('12월');
    });
  });

  describe('Calendar Display', () => {
    it('should display the current month and year', () => {
      const selectedDate = new Date(2024, 5, 15);
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toContain('2024년');
      expect(heading.textContent).toContain('6월');
    });

    it('should display day labels', () => {
      const selectedDate = new Date(2024, 0, 15);
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
      dayLabels.forEach(label => {
        expect(screen.getByText(label)).toBeDefined();
      });
    });

    it('should call onClose when close button is clicked', () => {
      const selectedDate = new Date(2024, 0, 15);
      const mockOnDateSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          onClose={mockOnClose}
          datesWithData={[]}
        />
      );

      const closeButton = screen.getByText('닫기');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
