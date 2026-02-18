# Design Document

## Overview

이 설계 문서는 식단 관리 앱의 4가지 주요 개선 사항에 대한 기술적 설계를 제공합니다:
1. 날짜별 식사 기록 조회 기능
2. 칼로리 정보 표시
3. PWA(Progressive Web App) 지원
4. IndexedDB를 사용한 로컬 데이터 영구 저장

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React App                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  MealInput   │  │  Calendar    │      │
│  │  Component   │  │  Component   │  │  Component   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │   App State     │                        │
│                   │  (selectedDate, │                        │
│                   │   mealRecords)  │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │ Storage Service │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   IndexedDB     │
                    │ (MealTrackerDB) │
                    └─────────────────┘
```

### Service Worker Architecture (PWA)

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser                                 │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  React App   │◄────────┤Service Worker│                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
│                          ┌────────▼────────┐                │
│                          │  Cache Storage  │                │
│                          │  (App Shell,    │                │
│                          │   Static Assets)│                │
│                          └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Storage Service

새로운 서비스 모듈을 생성하여 IndexedDB 작업을 캡슐화합니다.

**File:** `services/storageService.ts`

```typescript
interface DateKey {
  year: number;
  month: number;
  day: number;
}

interface DailyMealData {
  date: DateKey;
  meals: Record<string, MealRecord>;
  lastModified: number;
}

class StorageService {
  private dbName: string = 'MealTrackerDB';
  private version: number = 1;
  private db: IDBDatabase | null = null;

  // Initialize database connection
  async init(): Promise<void>

  // Save meal records for a specific date
  async saveMealRecords(date: DateKey, meals: Record<string, MealRecord>): Promise<void>

  // Load meal records for a specific date
  async loadMealRecords(date: DateKey): Promise<Record<string, MealRecord>>

  // Delete meal records for a specific date
  async deleteMealRecords(date: DateKey): Promise<void>

  // Get all dates that have meal records
  async getAllDatesWithData(): Promise<DateKey[]>

  // Private helper to convert DateKey to string key
  private dateToKey(date: DateKey): string

  // Private helper to handle errors
  private handleError(error: any): void
}

export const storageService = new StorageService();
```

### 2. Calendar Component

새로운 컴포넌트를 생성하여 날짜 선택 기능을 제공합니다.

**File:** `components/Calendar.tsx`

```typescript
interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  datesWithData: Date[];
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onDateSelect,
  onClose,
  datesWithData
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);

  const goToPreviousMonth = () => { /* ... */ };
  const goToNextMonth = () => { /* ... */ };
  const handleDateClick = (date: Date) => { /* ... */ };

  return (
    // Calendar UI with month navigation and date grid
  );
};
```

### 3. Updated App Component

App 컴포넌트를 수정하여 날짜 상태와 저장소 통합을 추가합니다.

```typescript
const App: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [mealRecords, setMealRecords] = useState<Record<string, MealRecord>>({...});
  const [datesWithData, setDatesWithData] = useState<Date[]>([]);

  // Load data from IndexedDB on mount and when date changes
  useEffect(() => {
    loadMealRecordsForDate(selectedDate);
  }, [selectedDate]);

  // Save data to IndexedDB when meal records change
  useEffect(() => {
    saveMealRecordsForDate(selectedDate, mealRecords);
  }, [mealRecords]);

  const loadMealRecordsForDate = async (date: Date) => { /* ... */ };
  const saveMealRecordsForDate = async (date: Date, records: Record<string, MealRecord>) => { /* ... */ };

  // ... rest of component
};
```

### 4. Updated MealInput Component

MealInput 컴포넌트를 수정하여 칼로리 필드를 추가합니다.

```typescript
// Add calorie field to FoodItem type
interface FoodItem {
  id: string;
  name: string;
  calories: number;  // NEW
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

// Update table to include calorie column
<th className="p-1 font-bold text-slate-500 text-center">칼(kcal)</th>

// Add calorie input field
<input 
  type="number" 
  step="0.01"
  value={item.calories} 
  onChange={(e) => handleUpdateItem(item.id, 'calories', parseFloat(e.target.value) || 0)}
  className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
/>
```

### 5. Updated Gemini Service

AI 분석 결과에 칼로리 정보를 포함하도록 수정합니다.

```typescript
responseSchema: {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "음식 명칭" },
      calories: { type: Type.NUMBER, description: "칼로리 (kcal)" },  // NEW
      carbs: { type: Type.NUMBER, description: "탄수화물 (g)" },
      // ... rest of properties
    },
    required: ["name", "calories", "carbs", "protein", "fat", "sugar", "sodium", "cholesterol"],
  },
}
```

### 6. PWA Configuration Files

**File:** `public/manifest.json`

```json
{
  "name": "식단 관리 앱",
  "short_name": "식단관리",
  "description": "AI 기반 식단 영양 관리 애플리케이션",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**File:** `public/service-worker.js`

```javascript
const CACHE_NAME = 'meal-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  // Add other static assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

## Data Models

### Updated FoodItem

```typescript
export interface FoodItem {
  id: string;
  name: string;
  calories: number;      // NEW - 칼로리 (kcal)
  carbs: number;         // 탄수화물 (g)
  protein: number;       // 단백질 (g)
  fat: number;           // 지방 (g)
  sugar: number;         // 당류 (g)
  sodium: number;        // 나트륨 (mg)
  cholesterol: number;   // 콜레스테롤 (mg)
}
```

### DateKey

```typescript
export interface DateKey {
  year: number;
  month: number;
  day: number;
}

export const dateToKey = (date: Date): DateKey => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate()
});

export const keyToDate = (key: DateKey): Date => 
  new Date(key.year, key.month - 1, key.day);
```

### DailyMealData

```typescript
export interface DailyMealData {
  date: DateKey;
  meals: Record<string, MealRecord>;
  lastModified: number;  // timestamp
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Date Selection Updates Display

*For any* valid date selected from the calendar, the dashboard should display meal records corresponding to that specific date.

**Validates: Requirements 1.6**

### Property 2: Calendar Navigation Preserves Month Boundaries

*For any* current month displayed in the calendar, navigating to the previous month and then to the next month should return to the original month.

**Validates: Requirements 1.4, 1.5**

### Property 3: Today Button Returns to Current Date

*For any* date currently displayed in the dashboard, clicking the "오늘보기" button should change the displayed date to today's date.

**Validates: Requirements 1.8**

### Property 4: Calorie Column Presence

*For any* meal input table rendered, the table should contain a calorie column positioned between the food name column and the carbohydrate column.

**Validates: Requirements 2.1**

### Property 5: Calorie Total Calculation

*For any* list of food items with calorie values, the sum of individual calorie values should equal the total displayed in the totals row.

**Validates: Requirements 2.4**

### Property 6: AI Analysis Includes Calories

*For any* food image analyzed by AI, each returned food item should include a calorie value.

**Validates: Requirements 2.5**

### Property 7: Manifest File Availability

*For any* request to the manifest file path, the server should return a valid JSON manifest with required PWA fields (name, icons, start_url, display).

**Validates: Requirements 3.1, 3.2**

### Property 8: Service Worker Registration

*For any* app initialization, the service worker should be successfully registered if the browser supports service workers.

**Validates: Requirements 3.3**

### Property 9: Storage Round-Trip Consistency

*For any* meal record saved to IndexedDB with a specific date key, retrieving the record using the same date key should return an equivalent meal record.

**Validates: Requirements 4.3, 4.4**

### Property 10: Date Key Uniqueness

*For any* two different dates, their corresponding date keys should be different, ensuring no data collision.

**Validates: Requirements 4.2**

### Property 11: Empty State Initialization

*For any* date that has no stored meal records, loading meal records for that date should return an empty meal records object with all meal types initialized to empty arrays.

**Validates: Requirements 4.8**

### Property 12: Image Data Persistence

*For any* meal record containing a base64 image string, storing and then retrieving the record should preserve the image data exactly.

**Validates: Requirements 4.9**

## Error Handling

### IndexedDB Errors

1. **Database Open Failure**: If IndexedDB cannot be opened, display an error message and fall back to in-memory storage
2. **Transaction Errors**: Wrap all IndexedDB transactions in try-catch blocks and log errors
3. **Quota Exceeded**: Detect quota exceeded errors and notify the user to clear old data
4. **Browser Compatibility**: Check for IndexedDB support and provide graceful degradation

### Calendar Errors

1. **Invalid Date Selection**: Validate date selections and prevent selection of invalid dates
2. **Navigation Errors**: Ensure month navigation doesn't produce invalid dates

### PWA Errors

1. **Service Worker Registration Failure**: Log errors but don't block app functionality
2. **Cache Errors**: Handle cache failures gracefully and fall back to network requests
3. **Manifest Errors**: Ensure manifest is valid JSON and contains required fields

### AI Analysis Errors

1. **Missing Calorie Data**: If AI doesn't return calorie data, default to 0 and allow manual input
2. **Invalid Numeric Values**: Validate and sanitize all numeric inputs from AI

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

- Date key conversion functions (dateToKey, keyToDate)
- Calendar month navigation logic
- Calorie calculation functions
- Error handling for invalid inputs
- Manifest file structure validation

### Property-Based Tests

Property-based tests will verify universal properties across all inputs using a PBT library (e.g., fast-check for TypeScript):

- Each property test will run a minimum of 100 iterations
- Tests will be tagged with format: **Feature: meal-tracker-improvements, Property {number}: {property_text}**
- Each correctness property listed above will be implemented as a property-based test

### Integration Tests

- Test IndexedDB storage and retrieval with various meal record combinations
- Test calendar component with different date ranges
- Test PWA installation flow in supported browsers
- Test offline functionality with service worker

### Manual Testing

- Verify PWA installation on mobile devices (iOS Safari, Android Chrome)
- Test offline functionality by disabling network
- Verify calendar UI on different screen sizes
- Test date navigation across month and year boundaries
