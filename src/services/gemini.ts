import { getGeminiModel } from '@/config/gemini';

export interface ExamplePair {
  korean: string;
  english: string;
}

export interface TermExplanation {
  term: string;
  translation: string; // short, comma-separated
  definition: string;
  hanja?: string;
  examples: ExamplePair[];
  notes?: string;
}

function stripMarkdownCodeBlock(text: string): string {
  // Remove triple backticks and optional language specifier
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function getTermExplanation(term: string): Promise<TermExplanation> {
  const model = getGeminiModel();
  
  const prompt = `Please provide a detailed explanation for the Korean term "${term}". Include:
1. A short, comma-separated English translation (e.g., 'insight, discernment, taste')
2. A clear, detailed definition
3. Hanja breakdown (if available)
4. 2-3 example sentences, each with both Korean and English translation
5. Any important notes about usage, context, or cultural significance

Format the response as JSON with the following structure:
{
  "term": "${term}",
  "translation": "short translation here",
  "definition": "definition here",
  "hanja": "hanja breakdown here (or empty string if not available)",
  "examples": [
    { "korean": "example sentence in Korean", "english": "English translation" },
    { "korean": "...", "english": "..." }
  ],
  "notes": "additional notes here (optional)"
}`;

  try {
    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini:', result);
    
    const response = result.response;
    const text = response.text();
    console.log('Raw response text:', text);
    
    // Strip markdown code block if present
    const cleanText = stripMarkdownCodeBlock(text);
    console.log('Cleaned response text:', cleanText);
    
    // Parse the JSON response
    const explanation = JSON.parse(cleanText) as TermExplanation;
    console.log('Successfully parsed explanation:', explanation);
    
    return explanation;
  } catch (error) {
    console.error('Detailed error in getTermExplanation:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error('Failed to get term explanation');
  }
} 