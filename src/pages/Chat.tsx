import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, MessageSquare } from 'lucide-react';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import DirectMessages from '@/components/DirectMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/style-chat`;

const suggestedPrompts = [
  "What colors go well with navy blue?",
  "Help me style a casual weekend look",
  "What's trending this season?",
  "How do I accessorize a simple dress?",
];

const Chat = () => {
  const [activeTab, setActiveTab] = useState('dm');
  const [navTab, setNavTab] = useState('chat');
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: "Hey there! 👋 I'm your MirrorMe style companion. Ask me anything about outfits, colors, or styling tips. Let's create some amazing looks together! ✨"
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // AI Chat functions
  const streamChat = async (userMessages: AIMessage[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (resp.status === 429) {
      throw new Error("Rate limit exceeded. Please wait and try again.");
    }
    if (resp.status === 402) {
      throw new Error("AI credits needed. Please add funds.");
    }
    if (!resp.ok || !resp.body) {
      throw new Error("Failed to connect to style assistant");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setAiMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleAiSend = async (message?: string) => {
    const text = message || aiInput.trim();
    if (!text || isAiLoading) return;

    const userMsg: AIMessage = { role: 'user', content: text };
    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    setAiInput('');
    setIsAiLoading(true);

    try {
      await streamChat(updatedMessages.filter(m => m.role === 'user' || (m.role === 'assistant' && updatedMessages.indexOf(m) > 0)));
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial)' }} />
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Header />

      <main className="relative flex-1 pt-16 pb-20 flex flex-col max-w-md md:max-w-4xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 grid grid-cols-2">
            <TabsTrigger value="dm" className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              DMs
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5 text-xs">
              <Bot className="w-3.5 h-3.5" />
              Style AI
            </TabsTrigger>
          </TabsList>

          {/* Direct Messages Tab */}
          <TabsContent value="dm" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            <DirectMessages />
          </TabsContent>

          {/* AI Chat Tab */}
          <TabsContent value="ai" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Style Companion</h2>
                  <p className="text-xs text-muted-foreground">Your AI fashion advisor</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              <div className="py-4 space-y-4">
                {aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "glass-card rounded-bl-md"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isAiLoading && aiMessages[aiMessages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="glass-card rounded-2xl rounded-bl-md px-4 py-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested prompts */}
              {aiMessages.length === 1 && (
                <div className="pb-4">
                  <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAiSend(prompt)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* AI Input */}
            <div className="px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-sm">
              <div className="flex gap-2">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about styles, outfits, colors..."
                  className="flex-1 bg-muted/50 border-border/50"
                  disabled={isAiLoading}
                />
                <Button
                  onClick={() => handleAiSend()}
                  disabled={!aiInput.trim() || isAiLoading}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation activeTab={navTab} onTabChange={setNavTab} />
    </div>
  );
};

export default Chat;
