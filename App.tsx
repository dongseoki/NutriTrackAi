import React, { useState, useMemo } from 'react';
import { MealType, MealRecord, FoodItem, DailySummary, DAILY_GOALS } from './types';
import Dashboard from './components/Dashboard';
import MealInput from './components/MealInput';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'input'>('dashboard');
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  
  const [mealRecords, setMealRecords] = useState<Record<string, MealRecord>>({
    [MealType.MORNING_SNACK]: { type: MealType.MORNING_SNACK, items: [] },
    [MealType.BREAKFAST]: { type: MealType.BREAKFAST, items: [] },
    [MealType.LATE_MORNING_SNACK]: { type: MealType.LATE_MORNING_SNACK, items: [] },
    [MealType.LUNCH]: { type: MealType.LUNCH, items: [] },
    [MealType.AFTERNOON_SNACK]: { type: MealType.AFTERNOON_SNACK, items: [] },
    [MealType.DINNER]: { type: MealType.DINNER, items: [] },
    [MealType.EVENING_SNACK]: { type: MealType.EVENING_SNACK, items: [] },
  });

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

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-xl min-h-screen flex flex-col relative overflow-hidden">
        {currentView === 'dashboard' ? (
          <Dashboard 
            summary={dailySummary} 
            mealRecords={mealRecords} 
            onMealClick={handleMealClick} 
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
      </div>
    </div>
  );
};

export default App;