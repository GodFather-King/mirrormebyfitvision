import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Users, Bot, Share2, Image } from 'lucide-react';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  shared_avatar_url: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

type SavedAvatar = {
  id: string;
  name: string;
  front_view_url: string | null;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/style-chat`;

const suggestedPrompts = [
  "What colors go well with navy blue?",
  "Help me style a casual weekend look",
  "What's trending this season?",
  "How do I accessorize a simple dress?",
];

const Chat = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('community');
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
  
  // Community Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [communityInput, setCommunityInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatar[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const communityScrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages and set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Fetch profiles for all unique user IDs
      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const messagesWithProfiles: ChatMessage[] = (messagesData || []).map(msg => ({
        ...msg,
        profiles: profilesMap.get(msg.user_id) || { display_name: null, avatar_url: null }
      }));

      setMessages(messagesWithProfiles);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .maybeSingle();

          const newMessage: ChatMessage = {
            ...(payload.new as any),
            profiles: profile || { display_name: null, avatar_url: null }
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch user's saved avatars for sharing
  useEffect(() => {
    if (!user) return;

    const fetchAvatars = async () => {
      const { data } = await supabase
        .from('saved_avatars')
        .select('id, name, front_view_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setSavedAvatars(data);
      }
    };

    fetchAvatars();
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  useEffect(() => {
    if (communityScrollRef.current) {
      communityScrollRef.current.scrollTop = communityScrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  // Community Chat functions
  const sendCommunityMessage = async (avatarUrl?: string) => {
    if (!user) {
      toast.error('Please sign in to chat');
      return;
    }

    const text = communityInput.trim();
    if (!text && !avatarUrl) return;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          content: text || '📸 Shared an avatar!',
          shared_avatar_url: avatarUrl || null,
        });

      if (error) throw error;
      setCommunityInput('');
      setShareDialogOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const shareAvatar = async (avatar: SavedAvatar) => {
    if (!avatar.front_view_url) {
      toast.error('This avatar has no image to share');
      return;
    }
    await sendCommunityMessage(avatar.front_view_url);
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'ai' | 'community') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (type === 'ai') {
        handleAiSend();
      } else {
        sendCommunityMessage();
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

      <main className="relative flex-1 pt-16 pb-20 flex flex-col max-w-md mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 grid grid-cols-2">
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Community
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Style AI
            </TabsTrigger>
          </TabsList>

          {/* Community Chat Tab */}
          <TabsContent value="community" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            {!user ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Sign in to chat with other users</p>
                  <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-4" ref={communityScrollRef}>
                  <div className="py-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No messages yet. Be the first to say hi! 👋</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.user_id === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex gap-2",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            {!isOwn && (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                {msg.profiles?.avatar_url ? (
                                  <img src={msg.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <span className="text-xs font-medium">
                                    {msg.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className={cn("max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                              {!isOwn && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {msg.profiles?.display_name || 'Anonymous'}
                                </p>
                              )}
                              <div
                                className={cn(
                                  "rounded-2xl px-3 py-2 text-sm",
                                  isOwn
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "glass-card rounded-bl-md"
                                )}
                              >
                                {msg.content}
                              </div>
                              {msg.shared_avatar_url && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-border/50">
                                  <img 
                                    src={msg.shared_avatar_url} 
                                    alt="Shared avatar" 
                                    className="w-full max-w-[200px] h-auto"
                                  />
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Community Input */}
                <div className="px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Share an Avatar</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                          {savedAvatars.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">
                              No saved avatars yet. Create one first!
                            </p>
                          ) : (
                            savedAvatars.map((avatar) => (
                              <button
                                key={avatar.id}
                                onClick={() => shareAvatar(avatar)}
                                disabled={isSending}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left"
                              >
                                {avatar.front_view_url ? (
                                  <img src={avatar.front_view_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                    <Image className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium text-sm">{avatar.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Input
                      value={communityInput}
                      onChange={(e) => setCommunityInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'community')}
                      placeholder="Say something nice..."
                      className="flex-1 bg-muted/50 border-border/50"
                      disabled={isSending}
                    />
                    <Button
                      onClick={() => sendCommunityMessage()}
                      disabled={!communityInput.trim() || isSending}
                      size="icon"
                      className="shrink-0"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
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
                  onKeyPress={(e) => handleKeyPress(e, 'ai')}
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
