import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MealType, MealRecord, DailySummary, DAILY_GOALS, dateToKey } from './types';
import Dashboard from './components/Dashboard';
import MealInput from './components/MealInput';
import Calendar from './components/Calendar';
import { storageService, StorageError } from './services/storageService';
import { exportMealDataToEmail } from './services/emailExportService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'input'>('dashboard');
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  
  // Date management states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [datesWithData, setDatesWithData] = useState<Date[]>([]);
  
  // Error notification state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [mealRecords, setMealRecords] = useState<Record<string, MealRecord>>({
    [MealType.MORNING_SNACK]: { type: MealType.MORNING_SNACK, items: [] },
    [MealType.BREAKFAST]: { type: MealType.BREAKFAST, items: [] },
    [MealType.LATE_MORNING_SNACK]: { type: MealType.LATE_MORNING_SNACK, items: [] },
    [MealType.LUNCH]: { type: MealType.LUNCH, items: [] },
    [MealType.AFTERNOON_SNACK]: { type: MealType.AFTERNOON_SNACK, items: [] },
    [MealType.DINNER]: { type: MealType.DINNER, items: [] },
    [MealType.EVENING_SNACK]: { type: MealType.EVENING_SNACK, items: [] },
  });

  // Initialize storage service on mount
  useEffect(() => {
    const initStorage = async () => {
      try {
        // Set error callback for user notifications
        storageService.setErrorCallback((error: StorageError) => {
          setErrorMessage(error.userMessage);
          // Auto-hide error after 5 seconds
          setTimeout(() => setErrorMessage(null), 5000);
        });
        
        await storageService.init();
        // Load dates with data
        const dates = await storageService.getAllDatesWithData();
        setDatesWithData(dates.map(key => new Date(key.year, key.month - 1, key.day)));
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        setErrorMessage('저장소 초기화에 실패했습니다.');
      }
    };
    initStorage();
  }, []);

  // Load meal records when selected date changes
  useEffect(() => {
    loadMealRecordsForDate(selectedDate);
  }, [selectedDate]);

  // Save meal records when they change (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  
  useEffect(() => {
    // Skip saving if we're currently loading data
    if (isLoadingRef.current) {
      return;
    }
    
    // Debounce save operations to avoid excessive writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveMealRecordsForDate(selectedDate, mealRecords);
    }, 500); // Wait 500ms after last change before saving
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [mealRecords, selectedDate]);

  const loadMealRecordsForDate = useCallback(async (date: Date) => {
    try {
      isLoadingRef.current = true;
      const dateKey = dateToKey(date);
      const records = await storageService.loadMealRecords(dateKey);
      setMealRecords(records);
    } catch (error) {
      console.error('Failed to load meal records:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const saveMealRecordsForDate = useCallback(async (date: Date, records: Record<string, MealRecord>) => {
    try {
      const dateKey = dateToKey(date);
      await storageService.saveMealRecords(dateKey, records);
      
      // Update dates with data (only if needed)
      const dates = await storageService.getAllDatesWithData();
      setDatesWithData(dates.map(key => new Date(key.year, key.month - 1, key.day)));
    } catch (error) {
      console.error('Failed to save meal records:', error);
    }
  }, []);

  const dailySummary: DailySummary = useMemo(() => {
    const summary: DailySummary = {
      totalCalories: 0,
      goals: DAILY_GOALS,
      carbs: 0,
      protein: 0,
      fat: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    };

    // Fix: Cast Object.values(mealRecords) to MealRecord[] to resolve the 'unknown' type error during iteration
    (Object.values(mealRecords) as MealRecord[]).forEach(record => {
      record.items.forEach(item => {
        summary.totalCalories += item.calories;
        summary.carbs += item.carbs;
        summary.protein += item.protein;
        summary.fat += item.fat;
        summary.sugar += item.sugar;
        summary.sodium += item.sodium;
        summary.cholesterol += item.cholesterol;
      });
    });

    return summary;
  }, [mealRecords]);

  const handleMealClick = useCallback((type: MealType) => {
    setActiveMealType(type);
    setCurrentView('input');
  }, []);

  const handleSaveMeal = useCallback((record: MealRecord) => {
    setMealRecords(prev => ({
      ...prev,
      [record.type]: record
    }));
    setCurrentView('dashboard');
  }, []);

  const handleBack = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  const handleCalendarClick = useCallback(() => {
    setShowCalendar(true);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  }, []);

  const handleTodayClick = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleCloseCalendar = useCallback(() => {
    setShowCalendar(false);
  }, []);

  const handleEmailExport = useCallback(async () => {
    try {
      const allMealData = await storageService.getAllMealData();
      const result = await exportMealDataToEmail(allMealData);

      if (result.method === 'download-mailto' && result.mailtoUrl) {
        window.location.href = result.mailtoUrl;
      }
    } catch (error) {
      console.error('Failed to export meal data by email:', error);
      setErrorMessage('이메일 내보내기에 실패했습니다. 다시 시도해주세요.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-xl min-h-screen flex flex-col relative overflow-hidden">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage(null)}
                className="text-white hover:text-red-100 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {currentView === 'dashboard' ? (
          <Dashboard 
            summary={dailySummary} 
            mealRecords={mealRecords} 
            onMealClick={handleMealClick}
            selectedDate={selectedDate}
            onCalendarClick={handleCalendarClick}
            onTodayClick={handleTodayClick}
            onEmailExportClick={handleEmailExport}
          />
        ) : (
          activeMealType && (
            <MealInput 
              mealType={activeMealType} 
              initialRecord={mealRecords[activeMealType]} 
              onSave={handleSaveMeal} 
              onBack={handleBack} 
            />
          )
        )}
        {showCalendar && (
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onClose={handleCloseCalendar}
            datesWithData={datesWithData}
          />
        )}
      </div>
    </div>
  );
};

export default App;
