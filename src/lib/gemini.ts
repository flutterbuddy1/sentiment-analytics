import { GoogleGenerativeAI } from '@google/generative-ai';
import Papa from "papaparse";
// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeSentiment(text: string) {
  try {
    // https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze the sentiment of the following text and provide a response in JSON format with the following fields:
    - sentiment: (positive, negative, or neutral)
    - score: (number between -1 and 1)
    - keywords: (array of important words/phrases)
    - summary: (brief analysis)

    Text to analyze: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanedResponse = response.text().replace(/`/g, "").replace("json", "");
    console.log(cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
}


interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  keywords: string[];
  summary: string;
}

async function analyzeSentimentBulk(texts: string[]): Promise<SentimentResult[] | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Analyze the sentiment of the following texts and provide a response in JSON format as an array, where each element has:
    - sentiment: (positive, negative, or neutral)
    - score: (number between -1 and 1)
    - keywords: (array of important words/phrases)
    - summary: (brief analysis)

    Texts to analyze: ${JSON.stringify(texts)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanedResponse = response.text().replace(/`/g, "").replace("json", "");
    return JSON.parse(cleanedResponse) as SentimentResult[];
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return null;
  }
}

interface CSVRow {
  feedback: string;
}

interface AnalysisResult {
  results: Array<CSVRow & SentimentResult>;
  overallSentiment: {
    score: number;
    sentiment: "positive" | "negative" | "neutral";
  };
}

export async function analyzeSentimentFromCSV(file: File): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) {
        reject("Failed to read file");
        return;
      }

      const csvData = event.target.result as string;
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows: string[] = results.data.map((row: CSVRow) => row.feedback);
          const sentimentResults = await analyzeSentimentBulk(rows);

          if (!sentimentResults) {
            reject("Failed to analyze sentiments");
            return;
          }

          let totalScore = 0;
          const analyzedResults = rows.map((feedback, index) => {
            const sentimentData = sentimentResults[index] || { sentiment: "neutral", score: 0, keywords: [], summary: "" };
            totalScore += sentimentData.score;
            return { feedback, ...sentimentData };
          });

          const overallSentimentScore = totalScore / analyzedResults.length;
          let sentimentLabel: "positive" | "negative" | "neutral" = "neutral";
          if (overallSentimentScore > 0.2) sentimentLabel = "positive";
          else if (overallSentimentScore < -0.2) sentimentLabel = "negative";

          resolve({
            results: analyzedResults,
            overallSentiment: {
              score: overallSentimentScore,
              sentiment: sentimentLabel,
            },
          });
        },
        error: (error) => reject(error),
      });
    };
    reader.readAsText(file);
  });
}