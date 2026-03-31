import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mic, 
  Search,
  MicOff, 
  ChevronRight, 
  Trophy, 
  AlertCircle, 
  ArrowLeft, 
  LayoutDashboard, 
  LogOut,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  History,
  Languages,
  Volume2,
  Play,
  SkipForward,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Question, Answer, View, Language, TRANSLATIONS, PracticeHistory } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const QUESTIONS: Question[] = [
  { id: 1, q: "What is HTML?", correct: "markup language", explain: "HTML is used to structure web pages." },
  { id: 2, q: "What is CSS?", correct: "styling", explain: "CSS is used to style web pages." },
  { id: 3, q: "What is JavaScript?", correct: "programming", explain: "JavaScript adds interactivity." },
  { id: 4, q: "What is API?", correct: "communication", explain: "API allows communication between systems." },
  { id: 5, q: "What is database?", correct: "data storage", explain: "Database stores data." }
];

const BEHAVIORAL_QUESTIONS: Question[] = [
  { id: 101, q: "Tell me about a time you had a conflict with a teammate. How did you resolve it?", correct: "conflict resolution", explain: "Focus on communication and compromise." },
  { id: 102, q: "Describe a situation where you had to work under a tight deadline.", correct: "time management", explain: "Show how you prioritize and stay organized." },
  { id: 103, q: "Give an example of a time you failed. What did you learn?", correct: "resilience", explain: "Be honest about the failure and emphasize the learning." },
  { id: 104, q: "Tell me about a project you are most proud of.", correct: "achievement", explain: "Highlight your specific contribution and the impact." },
  { id: 105, q: "How do you handle critical feedback?", correct: "growth mindset", explain: "Show that you are open to feedback and use it to improve." },
  { id: 106, q: "Tell me about a time you had to learn a new technology quickly.", correct: "adaptability", explain: "Explain your learning process and how you applied it." },
  { id: 107, q: "Describe a situation where you had to persuade someone to see your point of view.", correct: "persuasion", explain: "Focus on data, empathy, and clear communication." },
  { id: 108, q: "Tell me about a time you showed leadership, even if you weren't in a formal leadership role.", correct: "leadership", explain: "Show initiative and how you motivated others." },
  { id: 109, q: "How do you prioritize your tasks when you have multiple competing deadlines?", correct: "prioritization", explain: "Mention tools or methods like Eisenhower Matrix or simple lists." },
  { id: 110, q: "Give an example of a time you had to deal with a difficult client or stakeholder.", correct: "stakeholder management", explain: "Focus on active listening and finding common ground." }
];

export default function App() {
  const [view, setView] = useState<View>('home');
  const [testMode, setTestMode] = useState<'technical' | 'behavioral'>('technical');
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [history, setHistory] = useState<PracticeHistory[]>(JSON.parse(localStorage.getItem('history') || '[]'));
  const [micPermission, setMicPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);
  const [isVoiceAssistEnabled, setIsVoiceAssistEnabled] = useState(true);

  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(permissionStatus => {
        setMicPermission(permissionStatus.state);
        permissionStatus.onchange = () => setMicPermission(permissionStatus.state);
      });
    }
  }, []);

  const requestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
    } catch (err) {
      setMicPermission('denied');
      console.error("Mic permission denied:", err);
    }
  };

  const speak = useCallback((text: string) => {
    if (!isVoiceAssistEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }, [isVoiceAssistEnabled, language]);

  useEffect(() => {
    if (view === 'test' && isVoiceAssistEnabled) {
      speak(QUESTIONS[currentIndex].q);
    }
  }, [view, currentIndex, speak, isVoiceAssistEnabled]);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    localStorage.setItem('user', email);
    setUser(email);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setView('home');
  };

  const startTest = (mode: 'technical' | 'behavioral' = 'technical') => {
    setTestMode(mode);
    setCurrentIndex(0);
    setAnswers([]);
    setSkippedIndices([]);
    setCurrentAnswer('');
    setView('test');
  };

  const currentQuestions = testMode === 'technical' ? QUESTIONS : BEHAVIORAL_QUESTIONS;

  const processAnswer = async (skipped = false) => {
    const question = currentQuestions[currentIndex];
    
    if (skipped) {
      setSkippedIndices(prev => [...prev, currentIndex]);
      const skipAnswer: Answer = {
        questionId: question.id,
        userAnswer: '',
        isCorrect: false,
        isSkipped: true,
        aiFeedback: "Skipped. You can answer this later."
      };
      setAnswers(prev => [...prev, skipAnswer]);
      moveToNext();
      return;
    }

    let aiFeedback = "";
    let isCorrect = testMode === 'technical' 
      ? currentAnswer.toLowerCase().includes(question.correct.toLowerCase())
      : false;

    setIsAnalyzing(true);
    
    try {
      const ai = getAI();
      const prompt = testMode === 'technical' 
        ? `Evaluate this technical interview answer. 
        Question: ${question.q}
        Expected Keyword: ${question.correct}
        User Answer: ${currentAnswer}
        Language: ${language}
        If the answer is wrong, clearly state "MISTAKE DETECTED" and explain why. 
        Provide a very brief (1 sentence) feedback or improvement suggestion.`
        : `Evaluate this behavioral interview answer using the STAR method (Situation, Task, Action, Result).
        Question: ${question.q}
        User Answer: ${currentAnswer}
        Language: ${language}
        Start your response with [PASS] if the answer is good and follows STAR method, or [FAIL] if it's too brief or missing key STAR components.
        Then provide a very brief (1-2 sentences) feedback on how they can improve their response.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      aiFeedback = response.text || question.explain;
      
      if (testMode === 'behavioral') {
        isCorrect = aiFeedback.includes('[PASS]');
        aiFeedback = aiFeedback.replace('[PASS]', '').replace('[FAIL]', '').trim();
      }
    } catch (error) {
      aiFeedback = question.explain;
    } finally {
      setIsAnalyzing(false);
    }

    const newAnswer: Answer = {
      questionId: question.id,
      userAnswer: currentAnswer,
      isCorrect,
      isSkipped: false,
      aiFeedback
    };

    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === question.id);
      if (existing !== -1) {
        const copy = [...prev];
        copy[existing] = newAnswer;
        return copy;
      }
      return [...prev, newAnswer];
    });
    
    setCurrentAnswer('');
    moveToNext();
  };

  const moveToNext = () => {
    // Find next unanswered or skipped question
    let nextIdx = currentIndex + 1;
    
    // If we reached the end, check if there are skipped questions
    if (nextIdx >= currentQuestions.length) {
      const firstSkipped = currentQuestions.findIndex((_, i) => 
        !answers.find(a => a.questionId === currentQuestions[i].id && !a.isSkipped)
      );
      
      if (firstSkipped !== -1 && firstSkipped !== currentIndex) {
        setCurrentIndex(firstSkipped);
      } else {
        finishTest();
      }
    } else {
      setCurrentIndex(nextIdx);
    }
  };

  const finishTest = () => {
    const score = answers.filter(a => a.isCorrect).length;
    const newHistory: PracticeHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      score,
      total: currentQuestions.length,
      language,
      mode: testMode
    };
    const updatedHistory = [newHistory, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('history', JSON.stringify(updatedHistory));
    setView('result');
  };

  const startVoice = () => {
    if (micPermission !== 'granted') {
      requestMicPermission();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCurrentAnswer(transcript);
    };
    recognition.start();
  };

  const calculateScore = () => {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctCount / currentQuestions.length) * 100);
    let message = t.needsImprovement;
    if (percentage > 80) message = t.excellent;
    else if (percentage > 50) message = t.good;
    
    return { correctCount, percentage, message };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 backdrop-blur-md transition-colors duration-500",
        theme === 'dark' ? "bg-slate-950/50" : "bg-white/50 border-b border-slate-200"
      )}>
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline">InterviewHub</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={cn(
            "flex items-center gap-1 rounded-lg p-1 transition-colors duration-500",
            theme === 'dark' ? "bg-white/5" : "bg-black/5"
          )}>
            {(['en', 'es', 'hi'] as Language[]).map(lang => (
              <button 
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-all",
                  language === lang ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {user && (
            <button 
              onClick={() => setView('history')} 
              className={cn(
                "p-2 rounded-lg transition-colors",
                theme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-black/5 text-slate-600 hover:text-black"
              )}
            >
              <History className="w-5 h-5" />
            </button>
          )}

          {user ? (
            <button 
              onClick={handleLogout} 
              className={cn(
                "p-2 rounded-lg transition-colors",
                theme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-black/5 text-slate-600 hover:text-black"
              )}
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => setView('login')} className="btn-secondary py-2 px-4 text-sm">
              {t.login}
            </button>
          )}

          <motion.button 
            key={theme}
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-lg transition-all",
              theme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-black/5 text-slate-600 hover:text-black"
            )}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </motion.button>
        </div>
      </nav>

      <main className="w-full max-w-2xl mt-24 mb-12">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <motion.h1 
                className="text-5xl sm:text-7xl font-bold tracking-tighter leading-tight"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  duration: 0.8, 
                  ease: "easeOut" 
                }}
              >
                {t.title.split(' ').map((word, i) => i === 3 ? <span key={i} className="text-indigo-500">{word} </span> : word + ' ')}
              </motion.h1>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="relative max-w-md mx-auto"
              >
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for modules, tips, or help..."
                    className={cn(
                      "w-full pl-12 pr-4 py-4 rounded-2xl border transition-all outline-none text-lg shadow-xl",
                      theme === 'dark' 
                        ? "bg-white/5 border-white/10 focus:border-indigo-500/50 focus:bg-white/10" 
                        : "bg-black/5 border-black/10 focus:border-indigo-500/50 focus:bg-black/10"
                    )}
                  />
                </div>
              </motion.div>
              <p className="text-xl text-slate-400 max-w-lg mx-auto">
                {t.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setView(user ? 'dashboard' : 'login')} className="btn-primary flex items-center justify-center gap-2">
                  {t.start} <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={() => setView('demo')} className="btn-secondary flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> {t.demo}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'demo' && (
            <motion.div 
              key="demo"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 hover:bg-white/10 rounded-lg">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold">Platform Demo</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card overflow-hidden group">
                  <img 
                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800&h=600" 
                    alt="Professional interview session" 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-4">
                    <h4 className="font-bold">Live Mock Interview</h4>
                    <p className="text-sm text-slate-400">Simulating a real-world technical discussion with AI.</p>
                  </div>
                </div>
                <div className="glass-card overflow-hidden group">
                  <img 
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800&h=600" 
                    alt="AI Feedback Dashboard" 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-4">
                    <h4 className="font-bold">Real-time Analysis</h4>
                    <p className="text-sm text-slate-400">Get instant feedback on your tone and technical accuracy.</p>
                  </div>
                </div>
                <div className="glass-card overflow-hidden group">
                  <img 
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800&h=600" 
                    alt="Student practicing" 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-4">
                    <h4 className="font-bold">Collaborative Learning</h4>
                    <p className="text-sm text-slate-400">Share your progress and learn from community benchmarks.</p>
                  </div>
                </div>
                <div className="glass-card overflow-hidden group">
                  <img 
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800&h=600" 
                    alt="Technical assessment" 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-4">
                    <h4 className="font-bold">Skill Tracking</h4>
                    <p className="text-sm text-slate-400">Monitor your growth across different technical domains.</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 text-center space-y-4">
                <h3 className="text-2xl font-bold">Ready to start your own?</h3>
                <button onClick={() => setView(user ? 'dashboard' : 'login')} className="btn-primary">
                  Get Started Now
                </button>
              </div>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 max-w-md mx-auto"
            >
              <h2 className="text-2xl font-bold mb-6">Welcome Back</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  <input name="email" type="email" required placeholder="name@example.com" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input name="password" type="password" required placeholder="••••••••" className="input-field" />
                </div>
                <button type="submit" className="btn-primary w-full">Sign In</button>
              </form>
              <button onClick={() => setView('home')} className="mt-4 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1 mx-auto">
                <ArrowLeft className="w-4 h-4" /> {t.backHome}
              </button>
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('home')} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Back to Home">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold">{t.dashboard}</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => startTest('technical')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Technical Interview Prep</h3>
                      <p className="text-slate-400">5 Questions • Web Development Basics</p>
                    </div>
                  </div>
                  <button className="btn-primary group-hover:translate-x-1 transition-transform">
                    {t.start}
                  </button>
                </div>
                
                <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => startTest('behavioral')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Behavioural Mock</h3>
                      <p className="text-slate-400">10 Questions • Soft Skills & STAR Method</p>
                    </div>
                  </div>
                  <button className="btn-primary group-hover:translate-x-1 transition-transform">
                    {t.start}
                  </button>
                </div>
              </div>

              {history.length > 0 && (
                <div className="mt-12 space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" /> Recent Activity
                  </h3>
                  <div className="space-y-2">
                    {history.slice(0, 3).map(item => (
                      <div key={item.id} className="glass-card p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">{item.date}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs uppercase bg-white/5 px-2 py-1 rounded">{item.language}</span>
                          <span className="font-bold text-indigo-400">{item.score}/{item.total}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setView('history')} className="w-full text-center text-sm text-slate-400 hover:text-white py-2">
                      View All History
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('dashboard')} className="p-2 hover:bg-white/10 rounded-lg">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-3xl font-bold">{t.history}</h2>
                </div>
                <div className="text-slate-400 text-sm">
                  {history.length} Practices Total
                </div>
              </div>

              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="glass-card p-6 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold">{item.date}</span>
                      </div>
                      <p className="text-sm text-slate-400">{item.mode === 'behavioral' ? 'Behavioural Mock' : 'Technical Interview Module'}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-2xl font-black text-indigo-500">{Math.round((item.score/item.total)*100)}%</div>
                      <div className="text-xs text-slate-500 uppercase tracking-widest">{item.score}/{item.total} Correct</div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-12 glass-card">
                    <p className="text-slate-400">No practice history yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'test' && (
            <motion.div 
              key="test"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('dashboard')} 
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <span className="text-sm font-mono text-indigo-400 uppercase tracking-wider">Question {currentIndex + 1} of {currentQuestions.length}</span>
                  <button 
                    onClick={() => setIsVoiceAssistEnabled(!isVoiceAssistEnabled)}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      isVoiceAssistEnabled ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-500"
                    )}
                    title={t.voiceAssist}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {currentQuestions[currentIndex].q}
                </h3>
                {isVoiceAssistEnabled && (
                  <button onClick={() => speak(currentQuestions[currentIndex].q)} className="text-xs text-indigo-400 flex items-center gap-1 hover:underline">
                    <Play className="w-3 h-3" /> Repeat Question
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <textarea 
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here or use the microphone..."
                    className="input-field min-h-[150px] resize-none pt-4"
                  />
                  <button 
                    onClick={startVoice}
                    className={cn(
                      "absolute bottom-4 right-4 p-3 rounded-full transition-all",
                      isListening ? "bg-red-500 animate-pulse" : "bg-indigo-600 hover:bg-indigo-500"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>
                
                {micPermission === 'denied' && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-sm text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Microphone access denied. Please enable it in browser settings.</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={() => processAnswer(true)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <SkipForward className="w-4 h-4" /> {t.skip}
                  </button>
                  <button 
                    onClick={() => processAnswer(false)}
                    disabled={!currentAnswer.trim() || isAnalyzing}
                    className="btn-primary flex-[2] flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> {t.analyzing}
                      </>
                    ) : (
                      <>
                        {currentIndex === currentQuestions.length - 1 && skippedIndices.length === 0 ? t.finish : t.next} 
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center space-y-8 relative"
            >
              <button 
                onClick={() => setView('dashboard')} 
                className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              
              <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                <Trophy className="w-12 h-12" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-4xl font-bold">{calculateScore().message}</h2>
                <p className="text-slate-400 text-lg">
                  You scored <span className="text-white font-bold">{calculateScore().correctCount}</span> out of {currentQuestions.length}
                </p>
              </div>

              <div className="text-6xl font-black text-indigo-500">
                {calculateScore().percentage}%
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setView('mistakes')} className="btn-primary flex-1">
                  {t.reviewMistakes}
                </button>
                <button onClick={() => setView('dashboard')} className="btn-secondary flex-1">
                  {t.backDashboard}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'mistakes' && (
            <motion.div 
              key="mistakes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('result')} className="p-2 hover:bg-white/10 rounded-lg" title="Back to Results">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-3xl font-bold">Review Feedback</h2>
                </div>
                <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5" /> {t.dashboard}
                </button>
              </div>

              <div className="space-y-4">
                {answers.map((answer, i) => {
                  const question = currentQuestions.find(q => q.id === answer.questionId);
                  const isMistake = !answer.isCorrect && !answer.isSkipped;
                  return (
                    <div key={i} className={cn(
                      "glass-card p-6 space-y-4",
                      isMistake && "border-rose-500/30 bg-rose-500/5"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-mono text-slate-500 uppercase">Question {i + 1}</span>
                          <h4 className="text-lg font-bold">{question?.q}</h4>
                        </div>
                        {answer.isSkipped ? (
                          <SkipForward className="w-6 h-6 text-slate-500 shrink-0" />
                        ) : answer.isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block mb-1">Your Answer</span>
                          <p className={cn(
                            answer.isSkipped ? "text-slate-400 italic" : 
                            answer.isCorrect ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {answer.isSkipped ? "Skipped" : (answer.userAnswer || "(No answer)") }
                          </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block mb-1">Correct Keyword</span>
                          <p className="text-indigo-400 font-medium">{question?.correct}</p>
                        </div>
                      </div>

                      <div className={cn(
                        "p-4 rounded-xl border flex gap-3",
                        isMistake ? "bg-rose-500/10 border-rose-500/20" : "bg-indigo-500/10 border-indigo-500/20"
                      )}>
                        {isMistake ? (
                          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            isMistake ? "text-rose-400" : "text-indigo-400"
                          )}>
                            {isMistake ? "Mistake Detected" : "AI Feedback"}
                          </span>
                          <p className="text-slate-300 text-sm mt-1">{answer.aiFeedback}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setView('dashboard')} className="btn-primary w-full">
                {t.backDashboard}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className={cn(
        "mt-auto py-8 text-sm transition-colors duration-500",
        theme === 'dark' ? "text-slate-500" : "text-slate-400"
      )}>
        &copy; 2026 AI Interview Practice Hub • Built with Gemini
      </footer>
    </div>
  );
}
