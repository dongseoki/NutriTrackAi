import { DateKey, MealRecord, DailyMealData, MealType } from '../types';

/**
 * Error types for storage operations
 */
export enum StorageErrorType {
  DB_OPEN_FAILED = 'DB_OPEN_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    public type: StorageErrorType,
    public userMessage: string,
    public originalError?: any
  ) {
    super(userMessage);
    this.name = 'StorageError';
  }
}

/**
 * StorageService handles all IndexedDB operations for meal tracking data.
 * Provides methods to save, load, and delete meal records by date.
 * Includes fallback to in-memory storage when IndexedDB is unavailable.
 */
class StorageService {
  private dbName: string = 'MealTrackerDB';
  private storeName: string = 'mealRecords';
  private version: number = 1;
  private db: IDBDatabase | null = null;
  private useFallback: boolean = false;
  private fallbackStorage: Map<string, DailyMealData> = new Map();
  private errorCallback?: (error: StorageError) => void;

  /**
   * Set error callback for user notifications
   */
  setErrorCallback(callback: (error: StorageError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Check if IndexedDB is supported
   */
  private isIndexedDBSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Initialize the IndexedDB database connection.
   * Creates the database and object store if they don't exist.
   * Falls back to in-memory storage if IndexedDB is unavailable.
   * Validates: Requirements 4.1, 4.2, 4.7
   */
  async init(): Promise<void> {
    // Check if IndexedDB is supported
    if (!this.isIndexedDBSupported()) {
      this.useFallback = true;
      const error = new StorageError(
        StorageErrorType.NOT_SUPPORTED,
        '브라우저가 데이터 저장을 지원하지 않습니다. 임시 저장소를 사용합니다.'
      );
      this.notifyError(error);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          this.useFallback = true;
          const error = new StorageError(
            StorageErrorType.DB_OPEN_FAILED,
            '데이터베이스를 열 수 없습니다. 임시 저장소를 사용합니다.',
            request.error
          );
          this.notifyError(error);
          resolve(); // Resolve instead of reject to allow fallback
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.useFallback = false;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object store with date key if it doesn't exist
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'dateKey' });
          }
        };
      } catch (error) {
        this.useFallback = true;
        const storageError = new StorageError(
          StorageErrorType.DB_OPEN_FAILED,
          '데이터베이스 초기화 중 오류가 발생했습니다. 임시 저장소를 사용합니다.',
          error
        );
        this.notifyError(storageError);
        resolve(); // Resolve to allow fallback
      }
    });
  }

  /**
   * Check whether a single meal record contains user-entered data.
   */
  private hasMealData(record: MealRecord | undefined): boolean {
    if (!record) return false;
    return record.items.length > 0 || Boolean(record.image);
  }

  /**
   * Check whether any meal record for a day contains user-entered data.
   */
  private hasAnyMealData(meals: Record<string, MealRecord>): boolean {
    return Object.values(meals).some(record => this.hasMealData(record));
  }

  /**
   * Save meal records for a specific date.
   * Stores the data with date as key and supports image data.
   * Uses fallback storage if IndexedDB is unavailable.
   * Optimized with single transaction for better performance.
   * Validates: Requirements 4.3, 4.7, 4.9
   */
  async saveMealRecords(date: DateKey, meals: Record<string, MealRecord>): Promise<void> {
    // Do not persist empty days; keep calendar indicators aligned with real entries only.
    if (!this.hasAnyMealData(meals)) {
      await this.deleteMealRecords(date);
      return;
    }

    const dateKey = this.dateToKey(date);
    const data: DailyMealData = {
      date,
      meals: meals as Record<MealType, MealRecord>,
      lastModified: Date.now()
    };

    // Use fallback storage if IndexedDB is not available
    if (this.useFallback) {
      this.fallbackStorage.set(dateKey, data);
      return;
    }

    if (!this.db) {
      await this.init();
      // If still no db after init, use fallback
      if (!this.db) {
        this.fallbackStorage.set(dateKey, data);
        return;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        // Use single transaction for better performance
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const dataWithKey = { ...data, dateKey };
        const request = store.put(dataWithKey);

        // Handle transaction completion instead of individual request
        transaction.oncomplete = () => resolve();
        
        transaction.onerror = () => {
          // Check for quota exceeded error
          if (transaction.error?.name === 'QuotaExceededError') {
            const error = new StorageError(
              StorageErrorType.QUOTA_EXCEEDED,
              '저장 공간이 부족합니다. 오래된 데이터를 삭제해주세요.',
              transaction.error
            );
            this.notifyError(error);
            reject(error);
          } else {
            const error = new StorageError(
              StorageErrorType.SAVE_FAILED,
              '데이터 저장에 실패했습니다. 다시 시도해주세요.',
              transaction.error
            );
            this.notifyError(error);
            reject(error);
          }
        };
      } catch (error) {
        const storageError = new StorageError(
          StorageErrorType.SAVE_FAILED,
          '데이터 저장 중 오류가 발생했습니다.',
          error
        );
        this.notifyError(storageError);
        reject(storageError);
      }
    });
  }

  /**
   * Load meal records for a specific date.
   * Returns empty MealRecord object when no data exists.
   * Uses fallback storage if IndexedDB is unavailable.
   * Validates: Requirements 4.4, 4.7, 4.8
   */
  async loadMealRecords(date: DateKey): Promise<Record<string, MealRecord>> {
    const dateKey = this.dateToKey(date);
    
    // Use fallback storage if IndexedDB is not available
    if (this.useFallback) {
      const data = this.fallbackStorage.get(dateKey);
      return data ? data.meals : this.getEmptyMealRecords();
    }

    if (!this.db) {
      await this.init();
      // If still no db after init, use fallback
      if (!this.db) {
        const data = this.fallbackStorage.get(dateKey);
        return data ? data.meals : this.getEmptyMealRecords();
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(dateKey);

        request.onsuccess = () => {
          const result = request.result;
          
          // Return empty meal records if no data exists (Requirement 4.8)
          if (!result) {
            resolve(this.getEmptyMealRecords());
          } else {
            resolve(result.meals);
          }
        };

        request.onerror = () => {
          const error = new StorageError(
            StorageErrorType.LOAD_FAILED,
            '데이터 불러오기에 실패했습니다.',
            request.error
          );
          this.notifyError(error);
          // Return empty records instead of rejecting
          resolve(this.getEmptyMealRecords());
        };
      } catch (error) {
        const storageError = new StorageError(
          StorageErrorType.LOAD_FAILED,
          '데이터 불러오기 중 오류가 발생했습니다.',
          error
        );
        this.notifyError(storageError);
        // Return empty records instead of rejecting
        resolve(this.getEmptyMealRecords());
      }
    });
  }

  /**
   * Helper to create empty meal records
   */
  private getEmptyMealRecords(): Record<string, MealRecord> {
    const emptyMeals: Record<string, MealRecord> = {};
    Object.values(MealType).forEach(mealType => {
      emptyMeals[mealType] = {
        type: mealType,
        items: []
      };
    });
    return emptyMeals;
  }

  /**
   * Delete meal records for a specific date.
   * Uses fallback storage if IndexedDB is unavailable.
   * Validates: Requirements 4.6, 4.7
   */
  async deleteMealRecords(date: DateKey): Promise<void> {
    const dateKey = this.dateToKey(date);
    
    // Use fallback storage if IndexedDB is not available
    if (this.useFallback) {
      this.fallbackStorage.delete(dateKey);
      return;
    }

    if (!this.db) {
      await this.init();
      // If still no db after init, use fallback
      if (!this.db) {
        this.fallbackStorage.delete(dateKey);
        return;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(dateKey);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          const error = new StorageError(
            StorageErrorType.DELETE_FAILED,
            '데이터 삭제에 실패했습니다.',
            request.error
          );
          this.notifyError(error);
          reject(error);
        };
      } catch (error) {
        const storageError = new StorageError(
          StorageErrorType.DELETE_FAILED,
          '데이터 삭제 중 오류가 발생했습니다.',
          error
        );
        this.notifyError(storageError);
        reject(storageError);
      }
    });
  }

  /**
   * Get all dates that have meal records stored.
   * Uses fallback storage if IndexedDB is unavailable.
   * Validates: Requirements 4.7
   */
  async getAllDatesWithData(): Promise<DateKey[]> {
    // Use fallback storage if IndexedDB is not available
    if (this.useFallback) {
      const dates: DateKey[] = [];
      this.fallbackStorage.forEach((value) => {
        if (this.hasAnyMealData(value.meals as Record<string, MealRecord>)) {
          dates.push(value.date);
        }
      });
      return dates;
    }

    if (!this.db) {
      await this.init();
      // If still no db after init, use fallback
      if (!this.db) {
        const dates: DateKey[] = [];
        this.fallbackStorage.forEach((value) => {
          if (this.hasAnyMealData(value.meals as Record<string, MealRecord>)) {
            dates.push(value.date);
          }
        });
        return dates;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const rows = request.result as Array<{ date: DateKey; meals: Record<string, MealRecord> }>;
          const dates: DateKey[] = rows
            .filter(row => this.hasAnyMealData(row.meals))
            .map(row => row.date);
          resolve(dates);
        };

        request.onerror = () => {
          const error = new StorageError(
            StorageErrorType.LOAD_FAILED,
            '날짜 목록을 불러오는데 실패했습니다.',
            request.error
          );
          this.notifyError(error);
          // Return empty array instead of rejecting
          resolve([]);
        };
      } catch (error) {
        const storageError = new StorageError(
          StorageErrorType.LOAD_FAILED,
          '날짜 목록을 불러오는 중 오류가 발생했습니다.',
          error
        );
        this.notifyError(storageError);
        // Return empty array instead of rejecting
        resolve([]);
      }
    });
  }

  /**
   * Get all stored meal data that contains user-entered content.
   * Uses fallback storage if IndexedDB is unavailable.
   */
  async getAllMealData(): Promise<DailyMealData[]> {
    const sortByDateAsc = (rows: DailyMealData[]) =>
      rows.sort((a, b) => {
        const aKey = this.dateToKey(a.date);
        const bKey = this.dateToKey(b.date);
        return aKey.localeCompare(bKey);
      });

    if (this.useFallback) {
      const rows: DailyMealData[] = [];
      this.fallbackStorage.forEach((value) => {
        if (this.hasAnyMealData(value.meals as Record<string, MealRecord>)) {
          rows.push(value);
        }
      });
      return sortByDateAsc(rows);
    }

    if (!this.db) {
      await this.init();
      if (!this.db) {
        const rows: DailyMealData[] = [];
        this.fallbackStorage.forEach((value) => {
          if (this.hasAnyMealData(value.meals as Record<string, MealRecord>)) {
            rows.push(value);
          }
        });
        return sortByDateAsc(rows);
      }
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const rows = request.result as Array<DailyMealData>;
          const data = rows.filter(row =>
            this.hasAnyMealData(row.meals as Record<string, MealRecord>)
          );
          resolve(sortByDateAsc(data));
        };

        request.onerror = () => {
          const error = new StorageError(
            StorageErrorType.LOAD_FAILED,
            '전체 식단 데이터를 불러오는데 실패했습니다.',
            request.error
          );
          this.notifyError(error);
          resolve([]);
        };
      } catch (error) {
        const storageError = new StorageError(
          StorageErrorType.LOAD_FAILED,
          '전체 식단 데이터 조회 중 오류가 발생했습니다.',
          error
        );
        this.notifyError(storageError);
        resolve([]);
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
   * Private helper to notify errors to the callback.
   * Validates: Requirement 4.7
   */
  private notifyError(error: StorageError): void {
    console.error('StorageService Error:', error);
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}

export const storageService = new StorageService();
