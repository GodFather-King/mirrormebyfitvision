import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowLeft, User, Image, Share2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  updated_at: string;
  other_user: Profile;
  last_message?: string;
  unread_count?: number;
};

type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type SavedAvatar = {
  id: string;
  name: string;
  front_view_url: string | null;
};

const DirectMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [newConvoDialogOpen, setNewConvoDialogOpen] = useState(false);
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatar[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      const { data: convos, error } = await supabase
        .from('direct_conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setIsLoading(false);
        return;
      }

      // Get all participant IDs
      const participantIds = new Set<string>();
      convos?.forEach(c => {
        participantIds.add(c.participant_1);
        participantIds.add(c.participant_2);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(participantIds));

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Map conversations with other user info
      const conversationsWithUsers: Conversation[] = (convos || []).map(c => {
        const otherUserId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
        return {
          ...c,
          other_user: profilesMap.get(otherUserId) || { user_id: otherUserId, display_name: null, avatar_url: null }
        };
      });

      setConversations(conversationsWithUsers);
      setIsLoading(false);
    };

    fetchConversations();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`dm_${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as DirectMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  // Fetch all users for starting new conversations
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id);

      if (data) {
        setAllUsers(data);
      }
    };

    fetchUsers();
  }, [user]);

  // Fetch saved avatars for sharing
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
  }, [messages]);

  const startConversation = async (otherUser: Profile) => {
    if (!user) return;

    // Check if conversation already exists
    const existing = conversations.find(
      c => c.other_user.user_id === otherUser.user_id
    );

    if (existing) {
      setSelectedConversation(existing);
      setNewConvoDialogOpen(false);
      return;
    }

    // Create new conversation (order IDs consistently)
    const [p1, p2] = [user.id, otherUser.user_id].sort();
    
    const { data, error } = await supabase
      .from('direct_conversations')
      .insert({
        participant_1: p1,
        participant_2: p2,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
      return;
    }

    const newConvo: Conversation = {
      ...data,
      other_user: otherUser
    };

    setConversations(prev => [newConvo, ...prev]);
    setSelectedConversation(newConvo);
    setNewConvoDialogOpen(false);
  };

  const sendMessage = async (content?: string) => {
    if (!user || !selectedConversation) return;
    
    const text = content || messageInput.trim();
    if (!text) return;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: text,
        });

      if (error) throw error;
      
      setMessageInput('');
      setShareDialogOpen(false);

      // Update conversation timestamp
      await supabase
        .from('direct_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
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
    await sendMessage(`📸 Check out my avatar: ${avatar.front_view_url}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Sign in to send direct messages</p>
          <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
        </div>
      </div>
    );
  }

  // Conversation view
  if (selectedConversation) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Conversation Header */}
        <div className="px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            {selectedConversation.other_user.avatar_url ? (
              <img 
                src={selectedConversation.other_user.avatar_url} 
                alt="" 
                className="w-8 h-8 rounded-full object-cover" 
              />
            ) : (
              <span className="text-xs font-medium">
                {selectedConversation.other_user.display_name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <span className="font-medium text-sm">
            {selectedConversation.other_user.display_name || 'Anonymous'}
          </span>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No messages yet. Say hi! 👋</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user.id;
                const isAvatarShare = msg.content.startsWith('📸 Check out my avatar:');
                const avatarUrl = isAvatarShare ? msg.content.split(': ')[1] : null;
                
                return (
                  <div
                    key={msg.id}
                    className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
                  >
                    <div className={cn("max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "glass-card rounded-bl-md"
                        )}
                      >
                        {isAvatarShare ? '📸 Shared an avatar!' : msg.content}
                      </div>
                      {avatarUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-border/50">
                          <img 
                            src={avatarUrl} 
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

        {/* Input */}
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
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-muted/50 border-border/50"
              disabled={isSending}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!messageInput.trim() || isSending}
              size="icon"
              className="shrink-0"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between">
        <h2 className="font-semibold text-sm">Direct Messages</h2>
        <Dialog open={newConvoDialogOpen} onOpenChange={setNewConvoDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Conversation</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[300px]">
              <div className="grid gap-2">
                {allUsers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No other users found
                  </p>
                ) : (
                  allUsers.map((profile) => (
                    <button
                      key={profile.user_id}
                      onClick={() => startConversation(profile)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium">
                            {profile.display_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-sm">{profile.display_name || 'Anonymous'}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new conversation with someone!</p>
            </div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {convo.other_user.avatar_url ? (
                    <img src={convo.other_user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-medium">
                      {convo.other_user.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {convo.other_user.display_name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tap to open chat
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DirectMessages;
