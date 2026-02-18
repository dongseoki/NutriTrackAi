
export enum MealType {
  MORNING_SNACK = '아침전 간식',
  BREAKFAST = '아침',
  LATE_MORNING_SNACK = '아침-점심 사이 간식',
  LUNCH = '점심',
  AFTERNOON_SNACK = '점심-저녁 사이 간식',
  DINNER = '저녁',
  EVENING_SNACK = '저녁 간식'
}

export interface FoodItem {
  id: string;
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface MealRecord {
  type: MealType;
  items: FoodItem[];
  image?: string;
}

export interface NutrientGoal {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export const DAILY_GOALS: NutrientGoal = {
  calories: 2500,
  carbs: 330,
  protein: 78,
  fat: 73,
  sugar: 50,
  sodium: 2000,
  cholesterol: 300,
};

export interface DailySummary {
  totalCalories: number;
  goals: NutrientGoal;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}
