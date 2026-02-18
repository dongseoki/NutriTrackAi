
import React, { useState, useRef } from 'react';
import { MealType, FoodItem, MealRecord } from '../types';
import { analyzeFoodImage } from '../services/geminiService';

interface MealInputProps {
  mealType: MealType;
  initialRecord: MealRecord;
  onSave: (record: MealRecord) => void;
  onBack: () => void;
}

const MealInput: React.FC<MealInputProps> = ({ mealType, initialRecord, onSave, onBack }) => {
  const [items, setItems] = useState<FoodItem[]>(initialRecord.items);
  const [image, setImage] = useState<string | undefined>(initialRecord.image);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDetectedItems, setAiDetectedItems] = useState<FoodItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatValue = (val: number) => {
    // Round to 2 decimal places to avoid floating point errors like 35.300000000000004
    return Number(Math.round(Number(val + "e+2")) + "e-2");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const results = await analyzeFoodImage(image);
      const mappedResults: FoodItem[] = results.map((item: any, idx: number) => ({
        ...item,
        id: `ai-${Date.now()}-${idx}`
      }));
      setAiDetectedItems(mappedResults);
      setShowAiModal(true);
    } catch (err) {
      alert("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddItem = (newItem: FoodItem) => {
    setItems(prev => [...prev, newItem]);
  };

  const handleManualAdd = () => {
    const newItem: FoodItem = {
      id: `manual-${Date.now()}`,
      name: '',
      carbs: 0,
      protein: 0,
      fat: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof FoodItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totals = items.reduce((acc, curr) => ({
    carbs: acc.carbs + (Number(curr.carbs) || 0),
    protein: acc.protein + (Number(curr.protein) || 0),
    fat: acc.fat + (Number(curr.fat) || 0),
    sugar: acc.sugar + (Number(curr.sugar) || 0),
    sodium: acc.sodium + (Number(curr.sodium) || 0),
    cholesterol: acc.cholesterol + (Number(curr.cholesterol) || 0),
  }), { carbs: 0, protein: 0, fat: 0, sugar: 0, sodium: 0, cholesterol: 0 });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white px-4 py-4 flex items-center border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="flex-1 text-center font-bold text-lg mr-8">{mealType} 입력</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        <div className="space-y-3 px-2">
          <p className="text-sm font-bold text-slate-700">{mealType} 사진</p>
          <div className="relative group">
            {image ? (
              <div className="relative rounded-3xl overflow-hidden shadow-md aspect-video bg-slate-200">
                <img src={image} alt="Food" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImage(undefined)}
                  className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-slate-400"
              >
                <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">사진 업로드하기</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange}
            />
          </div>
          
          <button 
            disabled={!image || isAnalyzing}
            onClick={handleAiAnalysis}
            className={`w-full py-4 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm ${
              !image 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : isAnalyzing
                  ? 'bg-indigo-400 text-white animate-pulse'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? (
              <>AI 분석 중...</>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                이미지 AI 분석으로 음식 추가하기
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3 font-bold text-slate-500 min-w-[100px]">음식명</th>
                  <th className="p-1 font-bold text-slate-500 text-center">탄(g)</th>
                  <th className="p-1 font-bold text-slate-500 text-center">단(g)</th>
                  <th className="p-1 font-bold text-slate-500 text-center">지(g)</th>
                  <th className="p-1 font-bold text-slate-500 text-center">당(g)</th>
                  <th className="p-1 font-bold text-slate-500 text-center">나(mg)</th>
                  <th className="p-1 font-bold text-slate-500 text-center">콜(mg)</th>
                  <th className="p-3 text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                      음식을 추가해주세요
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="음식 이름"
                          className="w-full bg-transparent font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded px-1"
                        />
                      </td>
                      <td className="p-1">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.carbs} 
                          onChange={(e) => handleUpdateItem(item.id, 'carbs', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                        />
                      </td>
                      <td className="p-1">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.protein} 
                          onChange={(e) => handleUpdateItem(item.id, 'protein', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                        />
                      </td>
                      <td className="p-1">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.fat} 
                          onChange={(e) => handleUpdateItem(item.id, 'fat', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                        />
                      </td>
                      <td className="p-1">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.sugar} 
                          onChange={(e) => handleUpdateItem(item.id, 'sugar', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                        />
                      </td>
                      <td className="p-1">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.sodium} 
                          onChange={(e) => handleUpdateItem(item.id, 'sodium', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                        />
                      </td>
                      <td className="p-1">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.cholesterol} 
                          onChange={(e) => handleUpdateItem(item.id, 'cholesterol', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-center text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteItem(item.id)} className="text-rose-400 hover:text-rose-600 p-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {items.length > 0 && (
                  <tr className="bg-indigo-50 font-bold border-t border-indigo-100">
                    <td className="p-3 text-indigo-700">총계</td>
                    <td className="p-1 text-center text-indigo-700">{formatValue(totals.carbs)}</td>
                    <td className="p-1 text-center text-indigo-700">{formatValue(totals.protein)}</td>
                    <td className="p-1 text-center text-indigo-700">{formatValue(totals.fat)}</td>
                    <td className="p-1 text-center text-indigo-700">{formatValue(totals.sugar)}</td>
                    <td className="p-1 text-center text-indigo-700">{formatValue(totals.sodium)}</td>
                    <td className="p-1 text-center text-indigo-700">{formatValue(totals.cholesterol)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button 
            onClick={handleManualAdd}
            className="w-full p-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 border-t border-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            음식 추가하기
          </button>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100 flex gap-3 fixed bottom-0 left-0 right-0 w-full max-w-[480px] mx-auto z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={onBack}
          className="flex-1 py-4 px-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
        >
          뒤로가기
        </button>
        <button 
          onClick={() => onSave({ type: mealType, items, image })}
          className="flex-[2] py-4 px-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98]"
        >
          저장하기
        </button>
      </div>

      {showAiModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 bg-indigo-600 text-white text-center">
              <h3 className="text-xl font-bold">AI 분석 결과</h3>
              <p className="text-indigo-100 text-sm opacity-80 mt-1">이미지에서 다음 음식들을 발견했습니다</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {aiDetectedItems.map(item => (
                  <div key={item.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-lg">{item.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="block opacity-60">탄수화물</span>
                        <span className="font-bold text-slate-700">{formatValue(item.carbs)}g</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="block opacity-60">단백질</span>
                        <span className="font-bold text-slate-700">{formatValue(item.protein)}g</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="block opacity-60">지방</span>
                        <span className="font-bold text-slate-700">{formatValue(item.fat)}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowAiModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={() => {
                  aiDetectedItems.forEach(item => handleAddItem(item));
                  setShowAiModal(false);
                }}
                className="flex-[2] py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                모두 추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealInput;
