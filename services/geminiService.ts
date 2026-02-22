
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFoodImage = async (base64Image: string) => {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1],
          },
        },
        {
          text: "이 이미지에 포함된 음식들을 분석하고 각각의 영양성분을 JSON 형식으로 알려줘. (탄수화물, 단백질, 지방, 당류, 나트륨, 콜레스테롤) 양은 일반적인 1인분 기준으로 추정해줘. 결과는 한국어로 제공해줘."
        }
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "음식 명칭" },
            calories: { type: Type.NUMBER, description: "칼로리 (kcal)" },
            carbs: { type: Type.NUMBER, description: "탄수화물 (g)" },
            protein: { type: Type.NUMBER, description: "단백질 (g)" },
            fat: { type: Type.NUMBER, description: "지방 (g)" },
            sugar: { type: Type.NUMBER, description: "당류 (g)" },
            sodium: { type: Type.NUMBER, description: "나트륨 (mg)" },
            cholesterol: { type: Type.NUMBER, description: "콜레스테롤 (mg)" },
          },
          required: ["name", "calories", "carbs", "protein", "fat", "sugar", "sodium", "cholesterol"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
};
