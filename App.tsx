import React, { useState, useMemo, useEffect } from 'react';
import { MealType, MealRecord, FoodItem, DailySummary, DAILY_GOALS, dateToKey } from './types';
import Dashboard from './components/Dashboard';
import MealInput from './components/MealInput';
import Calendar from './components/Calendar';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'input'>('dashboard');
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  
  // Date management states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [datesWithData, setDatesWithData] = useState<Date[]>([]);
  
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
        await storageService.init();
        // Load dates with data
        const dates = await storageService.getAllDatesWithData();
        setDatesWithData(dates.map(key => new Date(key.year, key.month - 1, key.day)));
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };
    initStorage();
  }, []);

  // Load meal records when selected date changes
  useEffect(() => {
    loadMealRecordsForDate(selectedDate);
  }, [selectedDate]);

  // Save meal records when they change
  useEffect(() => {
    saveMealRecordsForDate(selectedDate, mealRecords);
  }, [mealRecords, selectedDate]);

  const loadMealRecordsForDate = async (date: Date) => {
    try {
      const dateKey = dateToKey(date);
      const records = await storageService.loadMealRecords(dateKey);
      setMealRecords(records);
    } catch (error) {
      console.error('Failed to load meal records:', error);
    }
  };

  const saveMealRecordsForDate = async (date: Date, records: Record<string, MealRecord>) => {
    try {
      const dateKey = dateToKey(date);
      await storageService.saveMealRecords(dateKey, records);
      
      // Update dates with data
      const dates = await storageService.getAllDatesWithData();
      setDatesWithData(dates.map(key => new Date(key.year, key.month - 1, key.day)));
    } catch (error) {
      console.error('Failed to save meal records:', error);
    }
  };

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
        summary.totalCalories += (item.carbs * 4) + (item.protein * 4) + (item.fat * 9);
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

  const handleMealClick = (type: MealType) => {
    setActiveMealType(type);
    setCurrentView('input');
  };

  const handleSaveMeal = (record: MealRecord) => {
    setMealRecords(prev => ({
      ...prev,
      [record.type]: record
    }));
    setCurrentView('dashboard');
  };

  const handleBack = () => {
    setCurrentView('dashboard');
  };

  const handleCalendarClick = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const handleCloseCalendar = () => {
    setShowCalendar(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-xl min-h-screen flex flex-col relative overflow-hidden">
        {currentView === 'dashboard' ? (
          <Dashboard 
            summary={dailySummary} 
            mealRecords={mealRecords} 
            onMealClick={handleMealClick}
            selectedDate={selectedDate}
            onCalendarClick={handleCalendarClick}
            onTodayClick={handleTodayClick}
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