
import React from 'react';
import { DailySummary, MealRecord, MealType } from '../types';

interface DashboardProps {
  summary: DailySummary;
  mealRecords: Record<string, MealRecord>;
  onMealClick: (type: MealType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ summary, mealRecords, onMealClick }) => {
  const caloriePercent = Math.min(Math.round((summary.totalCalories / summary.goals.calories) * 100), 100);

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 pb-2">
        <h1 className="text-3xl font-bold text-slate-900">오늘</h1>
      </header>

      <div className="px-6 mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-500 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-blue-100 text-sm mb-1 font-medium">누적 섭취 칼로리</p>
              <h2 className="text-3xl font-bold">
                {Math.round(summary.totalCalories)} <span className="text-lg font-normal opacity-80">/ {summary.goals.calories} kcal</span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold">{caloriePercent}%</span>
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-2 mb-6">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${caloriePercent}%` }}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <StatItem label="탄수화물" value={summary.carbs} goal={summary.goals.carbs} unit="g" />
              <StatItem label="단백질" value={summary.protein} goal={summary.goals.protein} unit="g" />
              <StatItem label="지방" value={summary.fat} goal={summary.goals.fat} unit="g" />
              <StatItem label="당류" value={summary.sugar} goal={summary.goals.sugar} unit="g" />
              <StatItem label="나트륨" value={summary.sodium} goal={summary.goals.sodium} unit="mg" />
              <StatItem label="콜레스테롤" value={summary.cholesterol} goal={summary.goals.cholesterol} unit="mg" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">식단 관리</h3>
        <div className="space-y-3">
          {Object.values(MealType).map((type) => {
            const hasData = mealRecords[type].items.length > 0;
            return (
              <button
                key={type}
                onClick={() => onMealClick(type as MealType)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  hasData 
                    ? 'border-indigo-100 bg-indigo-50/50' 
                    : 'border-slate-100 bg-white hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasData ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <MealIcon type={type as MealType} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800">{type}</p>
                    <p className={`text-xs ${hasData ? 'text-indigo-500 font-medium' : 'text-slate-400'}`}>
                      {hasData ? `${mealRecords[type].items.length}개 항목 등록됨` : '데이터 없음'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasData && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const formatValue = (val: number) => {
  return Number(Math.round(Number(val + "e+2")) + "e-2");
};

const StatItem: React.FC<{ label: string; value: number; goal: number; unit: string }> = ({ label, value, goal, unit }) => {
  const percent = ((value / goal) * 100).toFixed(1);
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-baseline mb-0.5">
        <p className="text-[10px] text-blue-100 uppercase font-medium tracking-wider">{label}</p>
        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">{percent}%</span>
      </div>
      <p className="text-xs font-bold leading-none">
        {formatValue(value)}{unit} <span className="opacity-50 font-normal text-[10px]">/ {goal}{unit}</span>
      </p>
    </div>
  );
};

const MealIcon: React.FC<{ type: MealType }> = ({ type }) => {
  switch (type) {
    case MealType.MORNING_SNACK: return <span>🍎</span>;
    case MealType.BREAKFAST: return <span>☀️</span>;
    case MealType.LATE_MORNING_SNACK: return <span>☕</span>;
    case MealType.LUNCH: return <span>🍚</span>;
    case MealType.AFTERNOON_SNACK: return <span>🍪</span>;
    case MealType.DINNER: return <span>🥗</span>;
    case MealType.EVENING_SNACK: return <span>🍵</span>;
    default: return <span>🍽️</span>;
  }
};

export default Dashboard;
