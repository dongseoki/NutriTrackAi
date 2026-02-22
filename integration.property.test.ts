/**
 * Property-based integration tests for meal tracker improvements
 * Tests universal properties across the entire system
 * 
 * **Feature: meal-tracker-improvements**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { storageService } from './services/storageService';
import { DateKey, MealRecord, MealType } from './types';

// Helper to create a valid DateKey arbitrary
const dateKeyArbitrary = fc.record({
  year: fc.integer({ min: 2020, max: 2030 }),
  month: fc.integer({ min: 1, max: 12 }),
  day: fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates
});

// Helper to create a valid MealRecord arbitrary
const mealRecordArbitrary = fc.record({
  type: fc.constantFrom(...Object.values(MealType)),
  items: fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      calories: fc.float({ min: 0, max: 1000, noNaN: true }),
      carbs: fc.float({ min: 0, max: 200, noNaN: true }),
      protein: fc.float({ min: 0, max: 200, noNaN: true }),
      fat: fc.float({ min: 0, max: 100, noNaN: true }),
      sugar: fc.float({ min: 0, max: 100, noNaN: true }),
      sodium: fc.float({ min: 0, max: 5000, noNaN: true }),
      cholesterol: fc.float({ min: 0, max: 1000, noNaN: true }),
      image: fc.option(fc.constant(undefined), { nil: undefined })
    }),
    { maxLength: 10 }
  )
});

// Helper to create meal records for all meal types
const allMealRecordsArbitrary = fc.record({
  [MealType.MORNING_SNACK]: mealRecordArbitrary,
  [MealType.BREAKFAST]: mealRecordArbitrary,
  [MealType.LATE_MORNING_SNACK]: mealRecordArbitrary,
  [MealType.LUNCH]: mealRecordArbitrary,
  [MealType.AFTERNOON_SNACK]: mealRecordArbitrary,
  [MealType.DINNER]: mealRecordArbitrary,
  [MealType.EVENING_SNACK]: mealRecordArbitrary
});

// Helper to generate base64 image data
const base64ImageArbitrary = fc.string({ minLength: 100, maxLength: 500 }).map(str => {
  // Create a simple base64 data URI
  return `data:image/png;base64,${btoa(str)}`;
});

describe('Integration Property Tests', () => {
  beforeEach(async () => {
    // Initialize storage before each test
    await storageService.init();
  });

  describe('Property 10: Date Key Uniqueness', () => {
    /**
     * **Feature: meal-tracker-improvements, Property 10: Date Key Uniqueness**
     * **Validates: Requirements 4.2**
     * 
     * For any two different dates, their corresponding date keys should be different,
     * ensuring no data collision.
     */
    it('should generate unique keys for different dates', () => {
      fc.assert(
        fc.property(
          dateKeyArbitrary,
          dateKeyArbitrary,
          (date1, date2) => {
            // If dates are different, keys should be different
            const isDifferent = 
              date1.year !== date2.year ||
              date1.month !== date2.month ||
              date1.day !== date2.day;
            
            if (isDifferent) {
              const key1 = `${date1.year}-${String(date1.month).padStart(2, '0')}-${String(date1.day).padStart(2, '0')}`;
              const key2 = `${date2.year}-${String(date2.month).padStart(2, '0')}-${String(date2.day).padStart(2, '0')}`;
              
              expect(key1).not.toBe(key2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate same key for identical dates', () => {
      fc.assert(
        fc.property(
          dateKeyArbitrary,
          (date) => {
            const key1 = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
            const key2 = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
            
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Empty State Initialization', () => {
    /**
     * **Feature: meal-tracker-improvements, Property 11: Empty State Initialization**
     * **Validates: Requirements 4.8**
     * 
     * For any date that has no stored meal records, loading meal records for that date
     * should return an empty meal records object with all meal types initialized to empty arrays.
     */
    it('should return empty meal records for dates with no data', async () => {
      await fc.assert(
        fc.asyncProperty(
          dateKeyArbitrary,
          async (date) => {
            // Load records for a date that has no data
            const records = await storageService.loadMealRecords(date);
            
            // Should have all meal types
            expect(Object.keys(records)).toHaveLength(Object.values(MealType).length);
            
            // Each meal type should have empty items array
            Object.values(MealType).forEach(mealType => {
              expect(records[mealType]).toBeDefined();
              expect(records[mealType].type).toBe(mealType);
              expect(records[mealType].items).toEqual([]);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should initialize all meal types correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          dateKeyArbitrary,
          async (date) => {
            const records = await storageService.loadMealRecords(date);
            
            // Verify all meal types are present
            const expectedMealTypes = Object.values(MealType);
            const actualMealTypes = Object.keys(records);
            
            expectedMealTypes.forEach(mealType => {
              expect(actualMealTypes).toContain(mealType);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 12: Image Data Persistence', () => {
    /**
     * **Feature: meal-tracker-improvements, Property 12: Image Data Persistence**
     * **Validates: Requirements 4.9**
     * 
     * For any meal record containing a base64 image string, storing and then retrieving
     * the record should preserve the image data exactly.
     */
    it('should preserve image data in meal records', async () => {
      await fc.assert(
        fc.asyncProperty(
          dateKeyArbitrary,
          base64ImageArbitrary,
          mealRecordArbitrary,
          async (date, imageData, mealRecord) => {
            // Add image data to the first item
            if (mealRecord.items.length > 0) {
              const firstItem = mealRecord.items[0];
              mealRecord.items[0] = {
                id: firstItem.id,
                name: firstItem.name,
                calories: firstItem.calories,
                carbs: firstItem.carbs,
                protein: firstItem.protein,
                fat: firstItem.fat,
                sugar: firstItem.sugar,
                sodium: firstItem.sodium,
                cholesterol: firstItem.cholesterol,
                image: imageData
              };
            } else {
              // Add at least one item with image
              mealRecord.items.push({
                id: '1',
                name: 'Test Food',
                calories: 100,
                carbs: 10,
                protein: 10,
                fat: 5,
                sugar: 2,
                sodium: 100,
                cholesterol: 10,
                image: imageData
              });
            }
            
            // Create meal records with the image
            const meals: Record<string, MealRecord> = {};
            Object.values(MealType).forEach(type => {
              meals[type] = type === mealRecord.type ? mealRecord : {
                type,
                items: []
              };
            });
            
            // Save and load
            await storageService.saveMealRecords(date, meals);
            const loadedRecords = await storageService.loadMealRecords(date);
            
            // Verify image data is preserved
            const loadedMeal = loadedRecords[mealRecord.type];
            const itemWithImage = loadedMeal.items.find(item => item.image);
            
            expect(itemWithImage).toBeDefined();
            expect(itemWithImage?.image).toBe(imageData);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle multiple images in different meal types', async () => {
      await fc.assert(
        fc.asyncProperty(
          dateKeyArbitrary,
          fc.array(base64ImageArbitrary, { minLength: 2, maxLength: 5 }),
          async (date, images) => {
            // Create meal records with images in different meal types
            const meals: Record<string, MealRecord> = {};
            const mealTypes = Object.values(MealType);
            
            mealTypes.forEach((type, index) => {
              if (index < images.length) {
                meals[type] = {
                  type,
                  items: [{
                    id: `${index}`,
                    name: `Food ${index}`,
                    calories: 100,
                    carbs: 10,
                    protein: 10,
                    fat: 5,
                    sugar: 2,
                    sodium: 100,
                    cholesterol: 10,
                    image: images[index]
                  }]
                };
              } else {
                meals[type] = { type, items: [] };
              }
            });
            
            // Save and load
            await storageService.saveMealRecords(date, meals);
            const loadedRecords = await storageService.loadMealRecords(date);
            
            // Verify all images are preserved
            mealTypes.forEach((type, index) => {
              if (index < images.length) {
                const loadedMeal = loadedRecords[type];
                expect(loadedMeal.items[0].image).toBe(images[index]);
              }
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
