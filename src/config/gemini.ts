import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
 
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-preview-04-17' });
}; 