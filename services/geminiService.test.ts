import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

describe('Gemini Service - Calorie Properties', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /**
   * **Feature: meal-tracker-improvements, Property 6: AI Analysis Includes Calories**
   * **Validates: Requirements 2.5**
   * 
   * For any food image analyzed by AI, each returned food item should include a calorie value.
   */
  it('should include calories field in all AI analysis results', async () => {
    // Mock the GoogleGenAI module before importing geminiService
    vi.doMock('@google/genai', () => ({
      GoogleGenAI: class MockGoogleGenAI {
        models = {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify([
              {
                name: '밥',
                calories: 300,
                carbs: 65,
                protein: 5,
                fat: 1,
                sugar: 0,
                sodium: 5,
                cholesterol: 0
              },
              {
                name: '김치',
                calories: 15,
                carbs: 2,
                protein: 1,
                fat: 0.5,
                sugar: 1,
                sodium: 500,
                cholesterol: 0
              }
            ])
          })
        };
      },
      Type: {
        ARRAY: 'array',
        OBJECT: 'object',
        STRING: 'string',
        NUMBER: 'number'
      }
    }));

    const { analyzeFoodImage } = await import('./geminiService');
    const result = await analyzeFoodImage('data:image/jpeg;base64,dummydata');

    // Verify that all returned items have a calories field
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach((item: any) => {
      expect(item).toHaveProperty('calories');
      expect(typeof item.calories).toBe('number');
      expect(item.calories).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Property-based test: Verify response schema structure
   * Validates that the geminiService is configured to request calories in the schema
   */
  it('should have calories field in the response schema configuration', async () => {
    // Read the actual geminiService source code to verify schema
    const fs = await import('fs');
    const path = await import('path');
    
    const serviceCode = fs.readFileSync(
      path.join(process.cwd(), 'services/geminiService.ts'),
      'utf-8'
    );

    // Verify that the schema includes calories field
    expect(serviceCode).toContain('calories');
    expect(serviceCode).toContain('type: Type.NUMBER');
    expect(serviceCode).toContain('description: "칼로리 (kcal)"');
    
    // Verify calories is in the required array
    expect(serviceCode).toMatch(/required:.*\[.*"calories".*\]/s);
  });

  /**
   * Property-based test: Verify all AI responses include calories
   * Tests with various mock responses
   */
  it('should ensure all food items in any AI response include calories', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arrays of food items with various calorie values
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            calories: fc.float({ min: 0, max: 2000, noNaN: true }),
            carbs: fc.float({ min: 0, max: 200, noNaN: true }),
            protein: fc.float({ min: 0, max: 200, noNaN: true }),
            fat: fc.float({ min: 0, max: 200, noNaN: true }),
            sugar: fc.float({ min: 0, max: 100, noNaN: true }),
            sodium: fc.float({ min: 0, max: 5000, noNaN: true }),
            cholesterol: fc.float({ min: 0, max: 1000, noNaN: true })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (mockFoodItems) => {
          vi.resetModules();
          
          // Mock GoogleGenAI for this iteration
          vi.doMock('@google/genai', () => ({
            GoogleGenAI: class MockGoogleGenAI {
              models = {
                generateContent: vi.fn().mockResolvedValue({
                  text: JSON.stringify(mockFoodItems)
                })
              };
            },
            Type: {
              ARRAY: 'array',
              OBJECT: 'object',
              STRING: 'string',
              NUMBER: 'number'
            }
          }));

          const { analyzeFoodImage } = await import('./geminiService');
          const result = await analyzeFoodImage('data:image/jpeg;base64,test');

          // Verify all items have calories
          expect(result.length).toBe(mockFoodItems.length);
          
          result.forEach((item: any, index: number) => {
            expect(item).toHaveProperty('calories');
            expect(typeof item.calories).toBe('number');
            // Verify the calorie value matches what we mocked
            expect(item.calories).toBe(mockFoodItems[index].calories);
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});
