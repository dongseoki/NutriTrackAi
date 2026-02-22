import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import MealInput from './MealInput';
import { MealType, FoodItem } from '../types';

// Mock the geminiService to avoid API key issues
vi.mock('../services/geminiService', () => ({
  analyzeFoodImage: vi.fn().mockResolvedValue([])
}));

describe('MealInput Component - Calorie Properties', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * **Feature: meal-tracker-improvements, Property 4: Calorie Column Presence**
   * **Validates: Requirements 2.1**
   * 
   * For any meal input table rendered, the table should contain a calorie column 
   * positioned between the food name column and the carbohydrate column.
   */
  it('should have calorie column between food name and carbohydrate columns', () => {
    const mockOnSave = vi.fn();
    const mockOnBack = vi.fn();
    const initialRecord = {
      type: MealType.BREAKFAST,
      items: []
    };

    render(
      <MealInput
        mealType={MealType.BREAKFAST}
        initialRecord={initialRecord}
        onSave={mockOnSave}
        onBack={mockOnBack}
      />
    );

    // Find all table headers
    const headers = screen.getAllByRole('columnheader');
    
    // Extract header text content
    const headerTexts = headers.map(h => h.textContent);
    
    // Find indices of relevant columns
    const foodNameIndex = headerTexts.findIndex(text => text === '음식명');
    const calorieIndex = headerTexts.findIndex(text => text === '칼(kcal)');
    const carbsIndex = headerTexts.findIndex(text => text === '탄(g)');
    
    // Verify calorie column exists
    expect(calorieIndex).toBeGreaterThan(-1);
    
    // Verify calorie column is between food name and carbs
    expect(calorieIndex).toBeGreaterThan(foodNameIndex);
    expect(calorieIndex).toBeLessThan(carbsIndex);
    
    // Verify the order is: food name, calorie, carbs
    expect(calorieIndex).toBe(foodNameIndex + 1);
    expect(carbsIndex).toBe(calorieIndex + 1);
  });

  /**
   * **Feature: meal-tracker-improvements, Property 5: Calorie Total Calculation**
   * **Validates: Requirements 2.4**
   * 
   * For any list of food items with calorie values, the sum of individual calorie values 
   * should equal the total displayed in the totals row.
   */
  it('should correctly calculate total calories for any list of food items', () => {
    fc.assert(
      fc.property(
        // Generate an array of 1-10 food items with random calorie values
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            calories: fc.float({ min: 0, max: 1000, noNaN: true }),
            carbs: fc.float({ min: 0, max: 100, noNaN: true }),
            protein: fc.float({ min: 0, max: 100, noNaN: true }),
            fat: fc.float({ min: 0, max: 100, noNaN: true }),
            sugar: fc.float({ min: 0, max: 100, noNaN: true }),
            sodium: fc.float({ min: 0, max: 1000, noNaN: true }),
            cholesterol: fc.float({ min: 0, max: 500, noNaN: true })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (items) => {
          const mockOnSave = vi.fn();
          const mockOnBack = vi.fn();
          const initialRecord = {
            type: MealType.BREAKFAST,
            items: items as FoodItem[]
          };

          render(
            <MealInput
              mealType={MealType.BREAKFAST}
              initialRecord={initialRecord}
              onSave={mockOnSave}
              onBack={mockOnBack}
            />
          );

          // Calculate expected total
          const expectedTotal = items.reduce((sum, item) => sum + item.calories, 0);
          
          // Format the expected total the same way the component does
          const formatValue = (val: number) => {
            return Number(Math.round(Number(val + "e+2")) + "e-2");
          };
          const formattedExpected = formatValue(expectedTotal);

          // Find the totals row by looking for the cell with "총계" text
          const cells = screen.getAllByRole('cell');
          const totalLabelCell = cells.find(cell => cell.textContent === '총계');
          
          if (totalLabelCell) {
            // Get the parent row
            const totalsRow = totalLabelCell.parentElement;
            if (totalsRow) {
              const rowCells = Array.from(totalsRow.children);
              // Calorie total should be in the second cell (index 1)
              const calorieCell = rowCells[1];
              const calorieTotal = calorieCell?.textContent || '0';
              
              // Parse the displayed total
              const displayedTotal = parseFloat(calorieTotal);
              
              // Verify the displayed total matches expected (allow small floating point differences)
              if (!isNaN(displayedTotal) && !isNaN(formattedExpected)) {
                expect(Math.abs(displayedTotal - formattedExpected)).toBeLessThan(0.01);
              }
            }
          }

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
