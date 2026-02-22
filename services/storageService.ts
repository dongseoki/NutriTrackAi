import { DateKey, MealRecord, DailyMealData, MealType } from '../types';

/**
 * StorageService handles all IndexedDB operations for meal tracking data.
 * Provides methods to save, load, and delete meal records by date.
 */
class StorageService {
  private dbName: string = 'MealTrackerDB';
  private storeName: string = 'mealRecords';
  private version: number = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database connection.
   * Creates the database and object store if they don't exist.
   * Validates: Requirements 4.1, 4.2
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        this.handleError(request.error);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store with date key if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'dateKey' });
        }
      };
    });
  }

  /**
   * Save meal records for a specific date.
   * Stores the data with date as key and supports image data.
   * Validates: Requirements 4.3, 4.9
   */
  async saveMealRecords(date: DateKey, meals: Record<string, MealRecord>): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const data: DailyMealData & { dateKey: string } = {
          dateKey: this.dateToKey(date),
          date,
          meals: meals as Record<MealType, MealRecord>,
          lastModified: Date.now()
        };

        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          this.handleError(request.error);
          reject(new Error('Failed to save meal records'));
        };
      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * Load meal records for a specific date.
   * Returns empty MealRecord object when no data exists.
   * Validates: Requirements 4.4, 4.8
   */
  async loadMealRecords(date: DateKey): Promise<Record<string, MealRecord>> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(this.dateToKey(date));

        request.onsuccess = () => {
          const result = request.result;
          
          // Return empty meal records if no data exists (Requirement 4.8)
          if (!result) {
            const emptyMeals: Record<string, MealRecord> = {};
            Object.values(MealType).forEach(mealType => {
              emptyMeals[mealType] = {
                type: mealType,
                items: []
              };
            });
            resolve(emptyMeals);
          } else {
            resolve(result.meals);
          }
        };

        request.onerror = () => {
          this.handleError(request.error);
          reject(new Error('Failed to load meal records'));
        };
      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * Delete meal records for a specific date.
   * Validates: Requirement 4.6
   */
  async deleteMealRecords(date: DateKey): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(this.dateToKey(date));

        request.onsuccess = () => resolve();
        request.onerror = () => {
          this.handleError(request.error);
          reject(new Error('Failed to delete meal records'));
        };
      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * Get all dates that have meal records stored.
   * Validates: Requirement 4.7
   */
  async getAllDatesWithData(): Promise<DateKey[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          const keys = request.result as string[];
          const dates: DateKey[] = keys.map(key => {
            const [year, month, day] = key.split('-').map(Number);
            return { year, month, day };
          });
          resolve(dates);
        };

        request.onerror = () => {
          this.handleError(request.error);
          reject(new Error('Failed to get all dates'));
        };
      } catch (error) {
        this.handleError(error);
        reject(error);
      }
    });
  }

  /**
   * Private helper to convert DateKey to string key for IndexedDB.
   */
  private dateToKey(date: DateKey): string {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  /**
   * Private helper to handle errors gracefully.
   * Validates: Requirement 4.7
   */
  private handleError(error: any): void {
    console.error('StorageService Error:', error);
    // In a production app, this could notify the user or send to error tracking
  }
}

export const storageService = new StorageService();
