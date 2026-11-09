import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Terminal,
  Copy, Check, CornerDownLeft, Radio, Square, Trash2, Wifi, WifiOff,
} from 'lucide-react';
import type {
  AgentState, ChatMessage, ConnectionState, HermesTransport, InputMode,
} from '../types';
import { playBlip } from '../utils/audioSynth';

interface VoiceAndTextInputProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, mode?: InputMode) => void;
  onStopStreaming?: () => void;
  onClearConversation?: () => void;
  agentState: AgentState;
  isStreaming: boolean;
  isJarvisMode: boolean;
  connectionState: ConnectionState;
  transport: HermesTransport;
  onAudioLevelChange?: (level: number) => void;
}

export const VoiceAndTextInput: React.FC<VoiceAndTextInputProps> = ({
  messages,
  onSendMessage,
  onStopStreaming,
  onClearConversation,
  agentState,
  isStreaming,
  isJarvisMode,
  connectionState,
  transport,
  onAudioLevelChange,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastInputWasVoiceRef = useRef(false);
  const lastSpokenIdRef = useRef<string | null>(
    messages[messages.length - 1]?.role === 'assistant'
      ? messages[messages.length - 1].id
      : null,
  );

  const quickChips = [
    { label: '⚡ Estado del agente', prompt: 'Reporta tu estado operativo y el transporte activo.' },
    { label: '🧠 Capacidades', prompt: 'Muéstrame tus capacidades y comandos disponibles.' },
    { label: '🕶️ Activar HUD', prompt: 'Activa el modo HUD táctico.' },
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onstart = () => {
      setIsRecording(true);
      playBlip(750, 0.05);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        lastInputWasVoiceRef.current = true;
        setInputText(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors when recognition has not started.
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      lastInputWasVoiceRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Text-To-Speech for assistant responses
  const speakText = (text: string) => {
    if (!speechSynthesisEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((voice) => voice.lang.startsWith('es') || voice.lang.includes('Spanish'));
    if (esVoice) utterance.voice = esVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Speak only new, complete assistant responses.
  useEffect(() => {
    if (isStreaming || messages.length === 0) return;

    const last = messages[messages.length - 1];
    if (
      last.role === 'assistant' &&
      last.status === 'complete' &&
      lastSpokenIdRef.current !== last.id
    ) {
      lastSpokenIdRef.current = last.id;
      speakText(last.content);
    }
  }, [isStreaming, messages]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isActive = isRecording || isStreaming || agentState === 'speaking' || agentState === 'processing';
      const amplitude = isActive ? (isRecording ? 28 : isStreaming ? 22 : 16) : 4;
      const barCount = 48;
      const barWidth = canvas.width / barCount;

      onAudioLevelChange?.(isActive ? Math.min(1, amplitude / 25) : 0.05);

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;
        const normalized = Math.sin((i / barCount) * Math.PI);
        const wave = Math.sin(phase + i * 0.28) * Math.cos(phase * 0.7 + i * 0.15);
        const dynamicHeight = Math.max(
          3,
          Math.abs(wave) * amplitude * normalized + (isActive ? Math.random() * 6 : 2),
        );
        const y = canvas.height / 2 - dynamicHeight / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + dynamicHeight);
        if (isJarvisMode) {
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.5, '#38bdf8');
          gradient.addColorStop(1, '#0284c7');
        } else if (isRecording) {
          gradient.addColorStop(0, '#f43f5e');
          gradient.addColorStop(1, '#be123c');
        } else {
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(0.5, '#818cf8');
          gradient.addColorStop(1, '#c084fc');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, dynamicHeight);

        if (isJarvisMode && isActive && i % 3 === 0) {
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(x + 1, y - 2, barWidth - 2, 2);
        }
      }

      phase += isActive ? 0.15 : 0.03;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isStreaming, agentState, isJarvisMode, onAudioLevelChange]);

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!inputText.trim() || isStreaming) return;

    playBlip(1000, 0.05);
    onSendMessage(inputText.trim(), lastInputWasVoiceRef.current ? 'voice' : 'text');
    lastInputWasVoiceRef.current = false;
    setInputText('');
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const connectionLabel =
    connectionState === 'online'
      ? 'ENLAZADO'
      : connectionState === 'offline'
        ? 'SIN ENLACE'
        : 'CONECTANDO';

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#090d18]/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <h2 className="text-sm font-hud font-bold tracking-wider text-slate-200 uppercase truncate">
            Canal de mando directo
          </h2>
          <span className="hidden sm:inline-block text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-500/30">
            HERMES • TEXTO / VOZ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`hidden sm:flex items-center gap-1.5 text-[10px] font-mono-code px-2 py-1 rounded-lg border ${
              connectionState === 'online'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : connectionState === 'offline'
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
            }`}
          >
            {connectionState === 'offline' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            <span>{connectionLabel}</span>
            <span className="text-slate-500">•</span>
            <span className="uppercase">{transport}</span>
          </div>

          {/* TTS Audio Voice Switch */}
          <button
            type="button"
            onClick={() => {
              setSpeechSynthesisEnabled(!speechSynthesisEnabled);
              playBlip(900, 0.04);
            }}
            title={speechSynthesisEnabled ? 'Voz sintética activa' : 'Voz sintética silenciada'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              speechSynthesisEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {speechSynthesisEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline font-mono-code text-[11px]">
              {speechSynthesisEnabled ? 'Voz ON' : 'Voz Mute'}
            </span>
          </button>

          {onClearConversation && (
            <button
              type="button"
              onClick={onClearConversation}
              title="Limpiar conversación"
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Audio Waveform Section */}
      <div className="relative px-4 py-2 bg-gradient-to-b from-slate-950/60 to-transparent border-b border-slate-800/40">
        <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 mb-1 gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio className={`w-3.5 h-3.5 shrink-0 ${isRecording || isStreaming ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`} />
            <span className="truncate">
              {isRecording
                ? 'Capturando audio del operador...'
                : isStreaming
                  ? 'Hermes Agent transmitiendo respuesta...'
                  : 'Canal acústico en standby'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 shrink-0">SSE • 44.1 kHz</span>
        </div>
        <div className="w-full h-12 bg-black/40 rounded-lg border border-slate-800/80 overflow-hidden relative flex items-center justify-center">
          <canvas ref={canvasRef} width={600} height={48} className="w-full h-full object-cover" />
          {isJarvisMode && <div className="absolute inset-0 pointer-events-none jarvis-scanline opacity-30" />}
        </div>
      </div>

      {/* Chat Messages Stream Log */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isError = msg.status === 'error';

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}>
              <div className="flex items-center gap-2 mb-1 text-[11px] font-mono-code text-slate-400">
                <span className={isUser ? 'text-amber-400 font-semibold' : 'text-cyan-400 font-semibold'}>
                  {isUser ? 'OPERADOR' : 'HERMES AGENT'}
                </span>
                {isUser && msg.mode === 'voice' && <Mic className="w-3 h-3 text-amber-400/80" />}
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] md:max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative ${
                  isUser
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-100 border border-amber-500/30 rounded-tr-none'
                    : isError
                      ? 'bg-rose-950/40 text-rose-100 border border-rose-500/40 rounded-tl-none'
                      : isJarvisMode
                        ? 'bg-cyan-950/40 text-cyan-100 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-tl-none font-sans'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap select-text">
                  {msg.content}
                  {msg.status === 'streaming' && (
                    <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                  )}
                </div>

                {!isUser && msg.status !== 'streaming' && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 text-[11px] text-slate-400 font-mono-code">
                    <span className="text-[10px] text-slate-500 uppercase">
                      Hermes Agent • {transport}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakText(msg.content)}
                        title="Escuchar respuesta"
                        className="p-1 hover:text-cyan-400 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        title="Copiar texto"
                        className="p-1 hover:text-cyan-400 transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-mono-code text-slate-500 shrink-0 flex items-center gap-1">
          <Terminal className="w-3 h-3 text-cyan-400" /> Atajos:
        </span>
        {quickChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={isStreaming}
            onClick={() => {
              playBlip(800, 0.04);
              onSendMessage(chip.prompt, 'text');
            }}
            className="shrink-0 px-2.5 py-1 rounded-full text-xs font-mono-code bg-slate-900 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center gap-1 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input controls form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-[#060a14]">
        <div className="relative flex items-center gap-2">
          {/* Voice Microphone Toggle Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-xl transition-all flex items-center justify-center shrink-0 ${
              isRecording
                ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50'
            }`}
            title={isRecording ? 'Detener grabación de voz' : 'Hablar por micrófono (Voz a texto)'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input Field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={
                isRecording
                  ? 'Escuchando tu voz...'
                  : isStreaming
                    ? 'Hermes está respondiendo...'
                    : 'Escribe una instrucción para Hermes Agent...'
              }
              disabled={isStreaming}
              className={`w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm px-4 py-3 rounded-xl border transition-all focus:outline-none disabled:opacity-60 ${
                isJarvisMode
                  ? 'border-cyan-500/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono-code'
                  : 'border-slate-700 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50'
              }`}
            />
            {inputText && !isStreaming && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-mono-code"
              >
                ✕
              </button>
            )}
          </div>

          {/* Submit / stop button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="px-4 py-3 rounded-xl font-hud text-xs tracking-wider uppercase font-bold transition-all flex items-center gap-2 shrink-0 bg-rose-500/90 hover:bg-rose-400 text-white border border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
            >
              <span>Detener</span>
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`px-4 py-3 rounded-xl font-hud text-xs tracking-wider uppercase font-bold transition-all flex items-center gap-2 shrink-0 ${
                !inputText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                  : isJarvisMode
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
              }`}
            >
              <span>Enviar</span>
              <CornerDownLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
