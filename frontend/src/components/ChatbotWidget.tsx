import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, User as UserIcon } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

export const ChatbotWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: `¡Hola ${user?.nombres || ''}! Soy tu Asistente Virtual de Salud Cerebral. Puedo informarte sobre tus avances semanales, días pendientes y cómo van tus factores cardiometabólicos. ¿Qué deseas consultar?`,
      time: 'Ahora',
    },
  ]);

  const chips = [
    '¿Cuál es mi puntaje cerebral?',
    '¿Cómo voy en actividad física?',
    '¿Tengo días pendientes?',
    '¿Qué controles me faltan?',
  ];

  const handleSend = async (texto: string) => {
    if (!texto.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: texto,
      time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chatbot/preguntar', { mensaje: texto });
      if (res.data.success) {
        const botMsg: Message = {
          sender: 'bot',
          text: res.data.data.respuesta,
          time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Disculpa, ocurrió un inconveniente al consultar tus métricas. Por favor intenta de nuevo en unos segundos.',
          time: 'Ahora',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botón Flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-health-petroleo text-white rounded-full shadow-modal hover:bg-teal-900 transition-all hover:scale-105 group focus:outline-none"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-emerald-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wide">Asistente Virtual</span>
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] bg-white rounded-3xl shadow-modal border border-health-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-health-petroleo px-4 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold leading-tight">Asistente de Salud Cerebral</h4>
                <p className="text-[10px] text-teal-200 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Métricas clínicas en vivo • Trujillo
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-health-petroleo mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-health-petroleo text-white rounded-br-none'
                      : 'bg-white text-slate-800 shadow-sm border border-slate-200/80 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span className={`text-[9px] block mt-1 text-right ${m.sender === 'user' ? 'text-teal-200' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600 mt-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <Bot className="w-4 h-4 animate-spin text-health-petroleo" />
                <span>Consultando tus datos clínicos...</span>
              </div>
            )}
          </div>

          {/* Chips Sugeridos */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {chips.map((c, i) => (
              <button
                key={i}
                onClick={() => handleSend(c)}
                className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-health-petroleo text-slate-600 px-2.5 py-1 rounded-full transition-colors shrink-0 border border-slate-200/60"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Haz una consulta sobre tus hábitos..."
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-health-petroleo focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-health-petroleo text-white hover:bg-teal-900 disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
