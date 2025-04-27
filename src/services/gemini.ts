import { getGeminiModel } from '@/config/gemini';

export interface TermExplanation {
  term: string;
  definition: string;
  examples: string[];
  notes: string;
}

function stripMarkdownCodeBlock(text: string): string {
  // Remove triple backticks and optional language specifier
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function getTermExplanation(term: string): Promise<TermExplanation> {
  const model = getGeminiModel();
  
  const prompt = `Please provide a detailed explanation for the Korean term "${term}". Include:
1. A clear definition
2. 2-3 example sentences
3. Any important notes about usage, context, or cultural significance

Format the response as JSON with the following structure:
{
  "term": "${term}",
  "definition": "definition here",
  "examples": ["example1", "example2"],
  "notes": "additional notes here"
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