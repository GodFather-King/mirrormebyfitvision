import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircleQuestion, Send, X, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Message = { role: 'user' | 'assistant'; content: string };

const SUPPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const quickQuestions = [
  "How do I create an avatar?",
  "How do I try on clothes?",
  "I can't log in",
];

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! 👋 I'm your MirrorMe support assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const streamResponse = useCallback(async (allMessages: Message[]) => {
    const resp = await fetch(SUPPORT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (resp.status === 429) throw new Error('Rate limit exceeded. Please wait and try again.');
    if (resp.status === 402) throw new Error('AI credits needed.');
    if (!resp.ok || !resp.body) throw new Error('Failed to connect to support');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf('\n')) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || !line.trim() || !line.startsWith('data: ')) continue;

        const json = line.slice(6).trim();
        if (json === '[DONE]') break;

        try {
          const delta = JSON.parse(json).choices?.[0]?.delta?.content as string | undefined;
          if (delta) {
            content += delta;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant' && prev.length > 1) {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
              }
              return [...prev, { role: 'assistant', content }];
            });
          }
        } catch {
          buf = line + '\n' + buf;
          break;
        }
      }
    }
  }, []);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: 'user', content: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      await streamResponse(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Support error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open support chat"
        >
          <MessageCircleQuestion className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[340px] max-h-[480px] flex flex-col rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/40">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Support</p>
              <p className="text-[10px] text-muted-foreground">Ask us anything</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0" style={{ maxHeight: 320 }}>
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted/60 text-foreground rounded-bl-sm'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border/50 hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-border/50">
            <div className="flex gap-1.5">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Describe your issue…"
                className="flex-1 h-9 text-xs bg-muted/30 border-border/40"
                disabled={loading}
              />
              <Button onClick={() => send()} disabled={!input.trim() || loading} size="icon" className="h-9 w-9 shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
