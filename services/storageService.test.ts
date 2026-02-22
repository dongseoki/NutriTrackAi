import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { storageService } from './storageService';
import { DateKey, MealRecord, MealType, FoodItem } from '../types';

// Mock IndexedDB for testing
class MockIDBDatabase {
  private stores: Map<string, Map<string, any>> = new Map();
  objectStoreNames = { contains: (name: string) => this.stores.has(name) };

  createObjectStore(name: string) {
    this.stores.set(name, new Map());
    return {
      createIndex: () => {}
    };
  }

  transaction(storeNames: string[], mode: string) {
    const storeName = storeNames[0];
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }
    const store = this.stores.get(storeName)!;
    
    const transaction: any = {
      objectStore: () => ({
        put: (data: any) => {
          const request: any = {
            onsuccess: null,
            onerror: null
          };
          setTimeout(() => {
            store.set(data.dateKey, data);
            if (request.onsuccess) request.onsuccess();
            if (transaction.oncomplete) transaction.oncomplete();
          }, 0);
          return request;
        },
        get: (key: string) => {
          const request: any = {
            onsuccess: null,
            onerror: null,
            result: undefined
          };
          setTimeout(() => {
            request.result = store.get(key);
            if (request.onsuccess) request.onsuccess();
          }, 0);
          return request;
        },
        delete: (key: string) => {
          const request: any = {
            onsuccess: null,
            onerror: null
          };
          setTimeout(() => {
            store.delete(key);
            if (request.onsuccess) request.onsuccess();
          }, 0);
          return request;
        },
        getAllKeys: () => {
          const request: any = {
            onsuccess: null,
            onerror: null,
            result: []
          };
          setTimeout(() => {
            request.result = Array.from(store.keys());
            if (request.onsuccess) request.onsuccess();
          }, 0);
          return request;
        }
      }),
      oncomplete: null,
      onerror: null
    };
    
    return transaction;
  }
}

describe('StorageService Property-Based Tests', () => {
  let mockDB: MockIDBDatabase;

  beforeEach(() => {
    mockDB = new MockIDBDatabase();
    
    // Mock indexedDB.open
    (global as any).indexedDB = {
      open: (name: string, version: number) => {
        const request: any = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        };
        setTimeout(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: { result: mockDB } });
          }
          request.result = mockDB;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      }
    };
  });

  afterEach(() => {
    // Clean up
    (storageService as any).db = null;
  });

  /**
   * Property 9: Storage Round-Trip Consistency
   * **Validates: Requirements 4.3, 4.4**
   * 
   * For any meal record saved to IndexedDB with a specific date key,
   * retrieving the record using the same date key should return an equivalent meal record.
   */
  it('Property 9: Storage Round-Trip Consistency', async () => {
    // Arbitraries for generating test data
    const dateKeyArb = fc.record({
      year: fc.integer({ min: 2020, max: 2030 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }) // Use 28 to avoid invalid dates
    });

    const foodItemArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      calories: fc.float({ min: 0, max: 1000, noNaN: true }),
      carbs: fc.float({ min: 0, max: 200, noNaN: true }),
      protein: fc.float({ min: 0, max: 100, noNaN: true }),
      fat: fc.float({ min: 0, max: 100, noNaN: true }),
      sugar: fc.float({ min: 0, max: 100, noNaN: true }),
      sodium: fc.float({ min: 0, max: 5000, noNaN: true }),
      cholesterol: fc.float({ min: 0, max: 500, noNaN: true })
    });

    const mealRecordArb = fc.record({
      type: fc.constantFrom(...Object.values(MealType)),
      items: fc.array(foodItemArb, { minLength: 0, maxLength: 10 }),
      image: fc.option(fc.string(), { nil: undefined })
    });

    const mealsArb = fc.dictionary(
      fc.constantFrom(...Object.values(MealType)),
      mealRecordArb
    );

    await fc.assert(
      fc.asyncProperty(dateKeyArb, mealsArb, async (date, meals) => {
        // Initialize storage before each test
        await storageService.init();
        
        // Save the meal records
        await storageService.saveMealRecords(date, meals);

        // Load the meal records back
        const loadedMeals = await storageService.loadMealRecords(date);

        // Verify that all saved meals are present in loaded meals
        for (const [mealType, mealRecord] of Object.entries(meals)) {
          const loadedMeal = loadedMeals[mealType];
          
          expect(loadedMeal).toBeDefined();
          expect(loadedMeal.type).toBe(mealRecord.type);
          expect(loadedMeal.items.length).toBe(mealRecord.items.length);
          
          // Verify each food item
          for (let i = 0; i < mealRecord.items.length; i++) {
            const originalItem = mealRecord.items[i];
            const loadedItem = loadedMeal.items[i];
            
            expect(loadedItem.id).toBe(originalItem.id);
            expect(loadedItem.name).toBe(originalItem.name);
            expect(loadedItem.calories).toBeCloseTo(originalItem.calories, 2);
            expect(loadedItem.carbs).toBeCloseTo(originalItem.carbs, 2);
            expect(loadedItem.protein).toBeCloseTo(originalItem.protein, 2);
            expect(loadedItem.fat).toBeCloseTo(originalItem.fat, 2);
            expect(loadedItem.sugar).toBeCloseTo(originalItem.sugar, 2);
            expect(loadedItem.sodium).toBeCloseTo(originalItem.sodium, 2);
            expect(loadedItem.cholesterol).toBeCloseTo(originalItem.cholesterol, 2);
          }
          
          // Verify image data if present
          if (mealRecord.image) {
            expect(loadedMeal.image).toBe(mealRecord.image);
          }
        }
      }),
      { numRuns: 50, timeout: 5000 }
    );
  }, 15000); // 15 second timeout for property-based test
});

describe('StorageService Unit Tests', () => {
  let mockDB: MockIDBDatabase;

  beforeEach(() => {
    mockDB = new MockIDBDatabase();
    
    // Mock indexedDB.open
    (global as any).indexedDB = {
      open: (name: string, version: number) => {
        const request: any = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        };
        setTimeout(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: { result: mockDB } });
          }
          request.result = mockDB;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      }
    };
  });

  afterEach(() => {
    // Clean up
    (storageService as any).db = null;
  });

  /**
   * Test: Empty state initialization
   * **Validates: Requirement 4.8**
   * 
   * When loading meal records for a date with no stored data,
   * the service should return an empty meal records object with all meal types initialized.
   */
  it('should return empty meal records when no data exists', async () => {
    await storageService.init();
    
    const date: DateKey = { year: 2024, month: 1, day: 15 };
    
    const meals = await storageService.loadMealRecords(date);
    
    // Verify all meal types are present
    expect(Object.keys(meals).length).toBeGreaterThan(0);
    
    // Verify each meal type has empty items array
    for (const mealType of Object.values(MealType)) {
      const meal = meals[mealType];
      expect(meal).toBeDefined();
      expect(meal.type).toBe(mealType);
      expect(meal.items).toEqual([]);
    }
  });

  /**
   * Test: Error handling for database operations
   * **Validates: Requirement 4.7**
   * 
   * When database operations fail, the service should handle errors gracefully.
   */
  it('should handle database errors gracefully', async () => {
    // Mock a failing database
    (global as any).indexedDB = {
      open: () => {
        const request: any = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        setTimeout(() => {
          if (request.onerror) {
            request.onerror();
          }
        }, 0);
        return request;
      }
    };

    // Reset the service to use the failing mock
    (storageService as any).db = null;
    (storageService as any).useFallback = false;

    const date: DateKey = { year: 2024, month: 1, day: 15 };
    
    // Initialize should switch to fallback mode
    await storageService.init();
    
    // Should still work with fallback storage
    const meals = await storageService.loadMealRecords(date);
    expect(meals).toBeDefined();
    expect(Object.keys(meals).length).toBeGreaterThan(0);
  });

  /**
   * Test: Image data storage and retrieval
   * **Validates: Requirement 4.9**
   * 
   * When storing meal records with base64 image data,
   * the image data should be preserved exactly when retrieved.
   */
  it('should preserve image data in meal records', async () => {
    await storageService.init();
    
    const date: DateKey = { year: 2024, month: 1, day: 15 };
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const meals: Record<string, MealRecord> = {
      [MealType.BREAKFAST]: {
        type: MealType.BREAKFAST,
        items: [
          {
            id: '1',
            name: 'Test Food',
            calories: 100,
            carbs: 10,
            protein: 5,
            fat: 3,
            sugar: 2,
            sodium: 100,
            cholesterol: 10
          }
        ],
        image: base64Image
      }
    };

    await storageService.saveMealRecords(date, meals);
    const loadedMeals = await storageService.loadMealRecords(date);
    
    expect(loadedMeals[MealType.BREAKFAST].image).toBe(base64Image);
  });

  /**
   * Test: Delete meal records
   * **Validates: Requirement 4.6**
   * 
   * When deleting meal records for a date,
   * subsequent loads should return empty meal records.
   */
  it('should delete meal records successfully', async () => {
    await storageService.init();
    
    const date: DateKey = { year: 2024, month: 1, day: 15 };
    
    const meals: Record<string, MealRecord> = {
      [MealType.BREAKFAST]: {
        type: MealType.BREAKFAST,
        items: [
          {
            id: '1',
            name: 'Test Food',
            calories: 100,
            carbs: 10,
            protein: 5,
            fat: 3,
            sugar: 2,
            sodium: 100,
            cholesterol: 10
          }
        ]
      }
    };

    // Save, then delete
    await storageService.saveMealRecords(date, meals);
    await storageService.deleteMealRecords(date);
    
    // Load should return empty meals
    const loadedMeals = await storageService.loadMealRecords(date);
    expect(loadedMeals[MealType.BREAKFAST].items).toEqual([]);
  });

  /**
   * Test: Get all dates with data
   * **Validates: Requirement 4.7**
   * 
   * When querying for all dates with stored data,
   * the service should return all date keys.
   */
  it('should return all dates with stored data', async () => {
    await storageService.init();
    
    const date1: DateKey = { year: 2024, month: 1, day: 15 };
    const date2: DateKey = { year: 2024, month: 1, day: 16 };
    
    const meals: Record<string, MealRecord> = {
      [MealType.BREAKFAST]: {
        type: MealType.BREAKFAST,
        items: []
      }
    };

    await storageService.saveMealRecords(date1, meals);
    await storageService.saveMealRecords(date2, meals);
    
    const dates = await storageService.getAllDatesWithData();
    
    expect(dates.length).toBe(2);
    expect(dates).toContainEqual(date1);
    expect(dates).toContainEqual(date2);
  });
});
