import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MessageSquare, Instagram, FileText, BarChart3, Upload, Loader } from 'lucide-react';
import { analyzeSentiment } from '../lib/gemini';
import { processInstagramComments, processCSVFile } from '../lib/dataProcessing';
import { motion } from "framer-motion";


interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  keywords: string[];
  summary: string;
  source?: string;
}

export default function Dashboard() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<SentimentResult[]>(
    JSON.parse(localStorage.getItem('sentimentResults') || '[]')
  );
  const [loadingState, setLoadingState] = useState({ text: false, instagram: false, file: false });
  const [instagramUrl, setInstagramUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sentimentResults', JSON.stringify(results));
  }, [results]);

  const handleAnalyze = async () => {
    try {
      setLoadingState(prev => ({ ...prev, text: true }));
      const result = await analyzeSentiment(text);
      setResults(prev => [...prev, { ...result, source: 'Direct Input' }]);
      setText('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingState(prev => ({ ...prev, text: false }));
      scrollToBottom();
    }
  };

  const handleInstagramAnalysis = async () => {
    try {
      setLoadingState(prev => ({ ...prev, instagram: true }));
      const comments = await processInstagramComments(instagramUrl);
      const results = await Promise.all(comments.map(comment => analyzeSentiment(comment)));
      setResults(prev => [...prev, ...results.map(result => ({ ...result, source: 'Instagram' }))]);
      setInstagramUrl('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingState(prev => ({ ...prev, instagram: false }));
      scrollToBottom();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoadingState(prev => ({ ...prev, file: true }));
      const texts = await processCSVFile(file);
      const results = await Promise.all(texts.map(text => analyzeSentiment(text)));
      setResults(prev => [...prev, ...results.map(result => ({ ...result, source: 'CSV File' }))]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingState(prev => ({ ...prev, file: false }));
      scrollToBottom();
    }
  };

  const chartData = results.map((result, index) => ({
    name: `Analysis ${index + 1}`,
    score: result.score,
    source: result.source
  }));

  function scrollToBottom() {
    window.scrollTo({
      top: document.body.scrollHeight + 100,
      behavior: "smooth",
    });
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center justify-center w-full">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold">Sentiment Analysis by <strong>SkillBuilders</strong></span>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 p-6">
          {/* Text Analysis */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-36 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Paste your text here"
            />
            <button
              onClick={handleAnalyze}
              disabled={loadingState.text || !text}
              className="mt-4 w-full px-5 py-3 rounded-xl font-semibold text-white transition-all bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
            >
              {loadingState.text ? <Loader className="animate-spin" size={20} /> : "Analyze Text"}
            </button>
          </div>

          {/* Instagram Analysis */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Instagram Post URL"
            />
            <button
              onClick={handleInstagramAnalysis}
              // disabled={loadingState.instagram || !instagramUrl}
              disabled={true}
              className="mt-4 w-full px-5 py-3 rounded-xl font-semibold text-white transition-all bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 flex items-center justify-center"
            >
              {loadingState.instagram ? <Loader className="animate-spin" size={20} /> : "Analyze Instagram"}
            </button>

            <motion.div
              className="text-4xl font-bold text-blue-600 text-center w-full mt-4"
              initial={{ opacity: 0.5, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            >
              Upcoming...
            </motion.div>
          </div>

          {/* CSV Feedback Upload */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <button
              disabled={loadingState.file}
              className="mt-4 w-full px-5 py-3 rounded-xl font-semibold text-white transition-all bg-green-600 hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center"
            >
              {loadingState.file ? <Loader className="animate-spin" size={20} /> : "Upload CSV Feedback"}
            </button>
            <div className="flex items-center justify-center py-4">
              <a
                href="./dummy.csv"
                target="_mayank"
                className="px-2 py-2 text-xs bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
              >
                📥 Download CSV Format
              </a>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Analysis Results</h2>
            <div className="mb-8 overflow-x-auto">
              <LineChart width={800} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[-1, 1]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#4F46E5" />
              </LineChart>
            </div>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">Analysis {index + 1}</span>
                      <span className="ml-2 text-sm text-gray-500">({result.source})</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${result.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                      result.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {result.sentiment}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-600">{result.summary}</p>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Keywords: </span>
                    {result.keywords.map((keyword, i) => (
                      <span key={i} className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm mr-2 mt-2">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
