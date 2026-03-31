export interface Question {
  id: number;
  q: string;
  correct: string;
  explain: string;
}

export interface Answer {
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  isSkipped: boolean;
  aiFeedback?: string;
}

export interface PracticeHistory {
  id: string;
  date: string;
  score: number;
  total: number;
  language: string;
  mode?: 'technical' | 'behavioral';
}

export type View = 'home' | 'login' | 'dashboard' | 'test' | 'result' | 'mistakes' | 'demo' | 'history';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'hi';

export const TRANSLATIONS = {
  en: {
    title: "Master Your Interviews with AI",
    subtitle: "Practice technical questions, get real-time feedback, and improve your communication skills.",
    start: "Start Practice",
    demo: "View Demo",
    dashboard: "Dashboard",
    history: "History",
    login: "Login",
    logout: "Logout",
    next: "Next Question",
    skip: "Skip for Now",
    finish: "Finish Test",
    analyzing: "Analyzing...",
    excellent: "Excellent!",
    good: "Good Job!",
    needsImprovement: "Needs Improvement",
    backHome: "Back to home",
    reviewMistakes: "Review Mistakes",
    backDashboard: "Back to Dashboard",
    voiceAssist: "Voice Assistant",
    micPermission: "Microphone Permission Required",
    allowMic: "Please allow microphone access to use voice features.",
    grant: "Grant Permission"
  },
  es: {
    title: "Domina tus entrevistas con IA",
    subtitle: "Practica preguntas técnicas, obtén comentarios en tiempo real y mejora tus habilidades de comunicación.",
    start: "Empezar práctica",
    demo: "Ver demostración",
    dashboard: "Panel",
    history: "Historial",
    login: "Iniciar sesión",
    logout: "Cerrar sesión",
    next: "Siguiente pregunta",
    skip: "Saltar por ahora",
    finish: "Terminar prueba",
    analyzing: "Analizando...",
    excellent: "¡Excelente!",
    good: "¡Buen trabajo!",
    needsImprovement: "Necesita mejorar",
    backHome: "Volver al inicio",
    reviewMistakes: "Revisar errores",
    backDashboard: "Volver al panel",
    voiceAssist: "Asistente de voz",
    micPermission: "Se requiere permiso del micrófono",
    allowMic: "Permita el acceso al micrófono para usar las funciones de voz.",
    grant: "Conceder permiso"
  },
  hi: {
    title: "AI के साथ अपने इंटरव्यू में महारत हासिल करें",
    subtitle: "तकनीकी प्रश्नों का अभ्यास करें, रीयल-टाइम फीडबैक प्राप्त करें और अपने संचार कौशल में सुधार करें।",
    start: "अभ्यास शुरू करें",
    demo: "डेमो देखें",
    dashboard: "डैशबोर्ड",
    history: "इतिहास",
    login: "लॉगिन",
    logout: "लॉगआउट",
    next: "अगला प्रश्न",
    skip: "अभी छोड़ें",
    finish: "टेस्ट समाप्त करें",
    analyzing: "विश्लेषण कर रहा है...",
    excellent: "उत्कृष्ट!",
    good: "अच्छा काम!",
    needsImprovement: "सुधार की आवश्यकता है",
    backHome: "होम पर वापस जाएं",
    reviewMistakes: "गलतियों की समीक्षा करें",
    backDashboard: "डैशबोर्ड पर वापस जाएं",
    voiceAssist: "वॉयस असिस्टेंट",
    micPermission: "माइक्रोफ़ोन अनुमति आवश्यक है",
    allowMic: "वॉयस सुविधाओं का उपयोग करने के लिए कृपया माइक्रोफ़ोन एक्सेस की अनुमति दें।",
    grant: "अनुमति दें"
  },
  fr: {
    title: "Maîtrisez vos entretiens avec l'IA",
    subtitle: "Pratiquez des questions techniques, obtenez des commentaires en temps réel et améliorez vos compétences en communication.",
    start: "Commencer la pratique",
    demo: "Voir la démo",
    dashboard: "Tableau de bord",
    history: "Historique",
    login: "Connexion",
    logout: "Déconnexion",
    next: "Question suivante",
    skip: "Passer pour l'instant",
    finish: "Terminer le test",
    analyzing: "Analyse en cours...",
    excellent: "Excellent !",
    good: "Bon travail !",
    needsImprovement: "Besoin d'amélioration",
    backHome: "Retour à l'accueil",
    reviewMistakes: "Revoir les erreurs",
    backDashboard: "Retour au tableau de bord",
    voiceAssist: "Assistant vocal",
    micPermission: "Permission du microphone requise",
    allowMic: "Veuillez autoriser l'accès au microphone pour utiliser les fonctions vocales.",
    grant: "Accorder la permission"
  },
  de: {
    title: "Meistern Sie Ihre Vorstellungsgespräche mit KI",
    subtitle: "Üben Sie technische Fragen, erhalten Sie Echtzeit-Feedback und verbessern Sie Ihre Kommunikationsfähigkeiten.",
    start: "Übung starten",
    demo: "Demo ansehen",
    dashboard: "Dashboard",
    history: "Verlauf",
    login: "Anmelden",
    logout: "Abmelden",
    next: "Nächste Frage",
    skip: "Vorerst überspringen",
    finish: "Test beenden",
    analyzing: "Analysieren...",
    excellent: "Exzellent!",
    good: "Gute Arbeit!",
    needsImprovement: "Verbesserungsbedarf",
    backHome: "Zurück zur Startseite",
    reviewMistakes: "Fehler überprüfen",
    backDashboard: "Zurück zum Dashboard",
    voiceAssist: "Sprachassistent",
    micPermission: "Mikrofonberechtigung erforderlich",
    allowMic: "Bitte erlauben Sie den Mikrofonzugriff, um die Sprachfunktionen zu nutzen.",
    grant: "Berechtigung erteilen"
  }
};
