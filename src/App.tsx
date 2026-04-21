/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Command } from 'lucide-react';

// --- Types ---
interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionResultItem;
  length: number;
}

interface SpeechRecognitionResultItem {
  readonly [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResult;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// --- Components ---

const Waveform = ({ isRecording }: { isRecording: boolean }) => {
  const bars = Array.from({ length: 24 });
  
  return (
    <div className="flex items-center gap-0.5 h-8">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white rounded-full"
          animate={{
            height: isRecording 
              ? [8, Math.random() * 24 + 4, 8] 
              : 2,
            opacity: isRecording ? 1 : 0.3
          }}
          transition={{
            duration: 0.4 + Math.random() * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05
          }}
        />
      ))}
    </div>
  );
};

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setTranscript(prev => prev + " " + final);
          setInterimTranscript("");
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecording) {
             try { recognition.start(); } catch (e) { console.error(e); }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      setInterimTranscript("");
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Could not start recognition:", e);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30 overflow-hidden font-sans">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center">
        {/* The "Small and Efficient" Widget */}
        <motion.button
          id="transcription-widget"
          onClick={toggleRecording}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative group outline-none"
        >
          {/* Outer Glow */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-[-40px] bg-cyan-500/10 blur-[60px] rounded-full z-0"
              />
            )}
          </AnimatePresence>

          <div className="relative z-10 w-fit px-8 py-5 bg-[#0f1117] border border-white/10 rounded-[2rem] flex items-center gap-6 shadow-2xl backdrop-blur-xl">
            <div className={`p-2 rounded-full transition-all duration-500 ${isRecording ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)]' : 'bg-white/5 text-white/40'}`}>
              {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
            </div>
            
            <div className="flex flex-col items-start min-w-[200px]">
              <Waveform isRecording={isRecording} />
            </div>

            <div className="p-2 text-white/20 border border-white/5 rounded-lg bg-white/[0.02]">
              <Command size={14} />
            </div>
          </div>
        </motion.button>

        {/* Minimal Transcription Feedback (Floating below the widget) */}
        <AnimatePresence>
          {(transcript || interimTranscript) && isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 px-4 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm max-w-md text-center"
            >
              <p className="text-[11px] text-white/50 truncate tracking-wide">
                {transcript.slice(-50)} <span className="text-cyan-400/70">{interimTranscript}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        
        :root {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </main>
  );
}
