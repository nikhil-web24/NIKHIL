import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mic, 
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
  Calendar
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

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
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

  const startTest = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setSkippedIndices([]);
    setCurrentAnswer('');
    setView('test');
  };

  const processAnswer = async (skipped = false) => {
    const question = QUESTIONS[currentIndex];
    
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

    const isCorrect = currentAnswer.toLowerCase().includes(question.correct.toLowerCase());
    setIsAnalyzing(true);
    
    let aiFeedback = "";
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Evaluate this interview answer. 
        Question: ${question.q}
        Expected Keyword: ${question.correct}
        User Answer: ${currentAnswer}
        Language: ${language}
        If the answer is wrong, clearly state "MISTAKE DETECTED" and explain why. 
        Provide a very brief (1 sentence) feedback or improvement suggestion.`,
      });
      aiFeedback = response.text || question.explain;
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
    if (nextIdx >= QUESTIONS.length) {
      const firstSkipped = QUESTIONS.findIndex((_, i) => 
        !answers.find(a => a.questionId === QUESTIONS[i].id && !a.isSkipped)
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
      total: QUESTIONS.length,
      language
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
    const percentage = Math.round((correctCount / QUESTIONS.length) * 100);
    let message = t.needsImprovement;
    if (percentage > 80) message = t.excellent;
    else if (percentage > 50) message = t.good;
    
    return { correctCount, percentage, message };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer" onClick={() => setView('home')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="hidden sm:inline">InterviewHub</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
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
            <button onClick={() => setView('history')} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <History className="w-5 h-5" />
            </button>
          )}

          {user ? (
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => setView('login')} className="btn-secondary py-2 px-4 text-sm">
              {t.login}
            </button>
          )}
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
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter leading-tight">
                {t.title.split(' ').map((word, i) => i === 3 ? <span key={i} className="text-indigo-500">{word} </span> : word + ' ')}
              </h1>
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
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">{t.dashboard}</h2>
                <div className="flex gap-2">
                  <div className="glass-card px-4 py-2 text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>Level {Math.floor(history.length / 3) + 1}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-indigo-500/50 transition-all cursor-pointer" onClick={startTest}>
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
                
                <div className="glass-card p-6 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-500/20 rounded-xl flex items-center justify-center text-slate-500">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Behavioral Mock</h3>
                      <p className="text-slate-400">Coming Soon</p>
                    </div>
                  </div>
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
                      <p className="text-sm text-slate-400">Technical Interview Module</p>
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
                  <span className="text-sm font-mono text-indigo-400">QUESTION {currentIndex + 1} OF {QUESTIONS.length}</span>
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
                    style={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {QUESTIONS[currentIndex].q}
                </h3>
                {isVoiceAssistEnabled && (
                  <button onClick={() => speak(QUESTIONS[currentIndex].q)} className="text-xs text-indigo-400 flex items-center gap-1 hover:underline">
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
                        {currentIndex === QUESTIONS.length - 1 && skippedIndices.length === 0 ? t.finish : t.next} 
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
              className="glass-card p-12 text-center space-y-8"
            >
              <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                <Trophy className="w-12 h-12" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-4xl font-bold">{calculateScore().message}</h2>
                <p className="text-slate-400 text-lg">
                  You scored <span className="text-white font-bold">{calculateScore().correctCount}</span> out of {QUESTIONS.length}
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
                <h2 className="text-3xl font-bold">Review Feedback</h2>
                <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5" /> {t.dashboard}
                </button>
              </div>

              <div className="space-y-4">
                {answers.map((answer, i) => {
                  const question = QUESTIONS.find(q => q.id === answer.questionId);
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

      <footer className="mt-auto py-8 text-slate-500 text-sm">
        &copy; 2026 AI Interview Practice Hub • Built with Gemini
      </footer>
    </div>
  );
}
