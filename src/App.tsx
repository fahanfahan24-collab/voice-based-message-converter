import { useState, useRef } from 'react';
import { Mic, Square, RefreshCw, Volume2, Copy, Check, Sparkles, Languages, MessageSquare, Briefcase, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { transcribeAudio, convertMessage, generateSpeech } from './services/gemini';

type ConversionStyle = 'Professional' | 'Casual' | 'Concise' | 'Formal' | 'Spanish' | 'French' | 'German' | 'Japanese';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [convertedText, setConvertedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleTranscription(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please enable it in your browser settings and refresh.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Could not access microphone. Please check your browser permissions.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const text = await transcribeAudio(base64Audio, 'audio/webm');
        setTranscription(text || '');
        setConvertedText(text || '');
      };
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConversion = async (style: ConversionStyle) => {
    if (!transcription) return;
    setIsConverting(true);
    try {
      const result = await convertMessage(transcription, style);
      setConvertedText(result || '');
    } catch (err) {
      console.error('Conversion error:', err);
      setError('Failed to convert message.');
    } finally {
      setIsConverting(false);
    }
  };

  const playSpeech = async () => {
    if (!convertedText || isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await generateSpeech(convertedText);
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const buffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsPlaying(false);
        source.start();
      }
    } catch (err) {
      console.error('Speech generation error:', err);
      setIsPlaying(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(convertedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles: { label: ConversionStyle; icon: any }[] = [
    { label: 'Professional', icon: Briefcase },
    { label: 'Casual', icon: MessageSquare },
    { label: 'Concise', icon: Sparkles },
    { label: 'Formal', icon: Send },
    { label: 'Spanish', icon: Languages },
    { label: 'French', icon: Languages },
    { label: 'German', icon: Languages },
    { label: 'Japanese', icon: Languages },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#E6E6E6]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCFB]/80 backdrop-blur-md border-b border-[#1A1A1A]/5">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-lg">VoiceConvert</span>
          </div>
          <div className="text-[11px] uppercase tracking-widest font-medium opacity-40">
            AI Powered Message Studio
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* Left Column: Recording & Input */}
          <div className="md:col-span-5 space-y-8">
            <section className="space-y-4">
              <h2 className="text-4xl font-light tracking-tight leading-tight">
                Speak your <br />
                <span className="italic font-serif">thoughts.</span>
              </h2>
              <p className="text-[#1A1A1A]/60 text-sm leading-relaxed max-w-xs">
                Record your voice and let AI transform it into perfectly crafted messages for any occasion.
              </p>
            </section>

            <div className="relative group">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-500 shadow-2xl shadow-black/5 ${
                  isRecording 
                    ? 'bg-[#FF4B2B] text-white' 
                    : 'bg-white border border-[#1A1A1A]/5 hover:border-[#1A1A1A]/20'
                }`}
              >
                <div className={`p-6 rounded-full ${isRecording ? 'bg-white/20 animate-pulse' : 'bg-[#1A1A1A]/5'}`}>
                  {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest">
                  {isRecording ? 'Recording...' : 'Tap to Record'}
                </span>
              </motion.button>

              {isRecording && (
                <div className="absolute -inset-4 bg-[#FF4B2B]/10 rounded-[40px] -z-10 animate-pulse" />
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-red-50 border border-red-100 rounded-2xl space-y-3"
              >
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Access Error</span>
                </div>
                <p className="text-red-800 text-sm leading-relaxed">
                  {error}
                </p>
                <div className="pt-2 border-t border-red-200/50">
                  <p className="text-[10px] text-red-600/60 uppercase tracking-widest font-bold">
                    How to fix:
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-red-700/80 list-disc list-inside">
                    <li>Check your browser's address bar for a blocked icon</li>
                    <li>Ensure your system settings allow microphone access</li>
                    <li>Refresh the page after granting permission</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results & Conversion */}
          <div className="md:col-span-7 space-y-8">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-64 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-[#1A1A1A]/5"
                >
                  <RefreshCw className="w-6 h-6 animate-spin opacity-20" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Transcribing Audio</span>
                </motion.div>
              ) : transcription ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Output Card */}
                  <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Converted Message</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={playSpeech}
                          disabled={isPlaying}
                          className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors disabled:opacity-30"
                        >
                          <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
                        </button>
                        <button 
                          onClick={copyToClipboard}
                          className="p-2 hover:bg-[#1A1A1A]/5 rounded-full transition-colors relative"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="min-h-[120px] text-lg leading-relaxed font-light">
                      {isConverting ? (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-4 bg-[#1A1A1A]/5 rounded w-full" />
                          <div className="h-4 bg-[#1A1A1A]/5 rounded w-5/6" />
                          <div className="h-4 bg-[#1A1A1A]/5 rounded w-4/6" />
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{convertedText}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Style Selectors */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {styles.map((style) => (
                      <button
                        key={style.label}
                        onClick={() => handleConversion(style.label)}
                        disabled={isConverting}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[#1A1A1A]/5 hover:border-[#1A1A1A]/20 hover:bg-white transition-all group"
                      >
                        <style.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div key="empty" className="h-64 flex flex-col items-center justify-center gap-4 bg-[#1A1A1A]/[0.02] rounded-3xl border border-dashed border-[#1A1A1A]/10">
                  <MessageSquare className="w-8 h-8 opacity-10" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-20">Your message will appear here</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-6 px-6 bg-gradient-to-t from-[#FDFCFB] to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto flex justify-between items-center pointer-events-auto">
          <div className="text-[9px] uppercase tracking-widest font-bold opacity-20">
            © 2026 VoiceConvert Studio
          </div>
          <div className="flex gap-4">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[9px] uppercase tracking-widest font-bold opacity-40">System Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

