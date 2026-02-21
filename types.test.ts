import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { dateToKey, keyToDate, DateKey } from './types';

describe('Date Conversion Functions', () => {
  // Unit tests for specific examples
  it('should convert a specific date to DateKey', () => {
    const date = new Date(2024, 0, 15); // January 15, 2024
    const key = dateToKey(date);
    
    expect(key).toEqual({
      year: 2024,
      month: 1,
      day: 15
    });
  });

  it('should convert a DateKey to Date', () => {
    const key: DateKey = {
      year: 2024,
      month: 1,
      day: 15
    };
    const date = keyToDate(key);
    
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // JavaScript months are 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it('should handle end of month dates', () => {
    const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
    const key = dateToKey(date);
    
    expect(key).toEqual({
      year: 2024,
      month: 2,
      day: 29
    });
  });

  it('should handle year boundaries', () => {
    const date = new Date(2023, 11, 31); // December 31, 2023
    const key = dateToKey(date);
    
    expect(key).toEqual({
      year: 2023,
      month: 12,
      day: 31
    });
  });

  // Property-based test: Round-trip consistency
  // Feature: meal-tracker-improvements, Property 10: Date Key Uniqueness
  it('should maintain round-trip consistency for any date', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('1970-01-01'),
          max: new Date('2100-12-31')
        }),
        (date) => {
          // Normalize to remove time component
          const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const key = dateToKey(normalizedDate);
          const reconstructedDate = keyToDate(key);
          
          expect(reconstructedDate.getFullYear()).toBe(normalizedDate.getFullYear());
          expect(reconstructedDate.getMonth()).toBe(normalizedDate.getMonth());
          expect(reconstructedDate.getDate()).toBe(normalizedDate.getDate());
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property-based test: DateKey uniqueness
  // Feature: meal-tracker-improvements, Property 10: Date Key Uniqueness
  it('should produce unique DateKeys for different dates', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('1970-01-01'),
          max: new Date('2100-12-31')
        }),
        fc.date({
          min: new Date('1970-01-01'),
          max: new Date('2100-12-31')
        }),
        (date1, date2) => {
          // Normalize dates to remove time component
          const normalizedDate1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
          const normalizedDate2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
          
          const key1 = dateToKey(normalizedDate1);
          const key2 = dateToKey(normalizedDate2);
          
          // If dates are different, keys should be different
          if (normalizedDate1.getTime() !== normalizedDate2.getTime()) {
            const keysAreEqual = 
              key1.year === key2.year && 
              key1.month === key2.month && 
              key1.day === key2.day;
            expect(keysAreEqual).toBe(false);
          } else {
            // If dates are the same, keys should be the same
            expect(key1).toEqual(key2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
