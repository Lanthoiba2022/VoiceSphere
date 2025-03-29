import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Mic, MicOff, User, Users, Volume2, VolumeX, Share, MessageSquare, X, Crown, Loader2, Headphones } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import RoomControls from '@/components/RoomControls';
import PromoteUserDialog from '@/components/PromoteUserDialog';
import { useWebRTC } from '@/hooks/useWebRTC';
import { DialogDescription } from '@/components/ui/dialog';
import AudioWaveform from '@/components/AudioWaveform';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  is_speaker: boolean | null;
  is_moderator: boolean | null;
  is_muted: boolean | null;
  joined_at: string;
  user: UserProfile;
  pending_speaker_request?: boolean;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: UserProfile;
}

interface Room {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  is_active: boolean | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
  creator: UserProfile;
}

const Room = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [speakers, setSpeakers] = useState<RoomParticipant[]>([]);
  const [listeners, setListeners] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<RoomParticipant | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  const webRTC = useWebRTC({
    roomId: id || '',
    userId: user?.id || '',
    isSpeaker: isSpeaker,
    isActive: isJoined
  });
  
  useEffect(() => {
    if (webRTC.isMuted !== isMuted && currentParticipant) {
      updateParticipantMuteStatus(currentParticipant.id, webRTC.isMuted);
    }
  }, [webRTC.isMuted]);
  
  const updateParticipantMuteStatus = async (participantId: string, isMuted: boolean) => {
    try {
      const { error } = await supabase
        .from('room_participants')
        .update({ is_muted: isMuted })
        .eq('id', participantId);
        
      if (error) throw error;
      
      setIsMuted(isMuted);
    } catch (error) {
      console.error('Error updating mute status:', error);
    }
  };
  
  useEffect(() => {
    if (id) {
      fetchRoomDetails();
      
      const participantsChannel = supabase
        .channel('room-participants-' + id)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` }, 
          payload => {
            console.log('Participant change detected:', payload);
            fetchParticipants();
          }
        )
        .subscribe();
        
      const messagesChannel = supabase
        .channel('room-messages-' + id)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, 
          payload => {
            console.log('New message received:', payload);
            fetchMessages();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(participantsChannel);
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [id, user]);
  
  useEffect(() => {
    if (user && room) {
      checkUserParticipation();
      setIsCreator(user.id === room.creator?.id);
    }
  }, [user, room]);
  
  const fetchRoomDetails = async () => {
    try {
      setLoading(true);
      
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select(`
          *,
          creator:creator_id(id, username, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();
        
      if (roomError) throw roomError;
      
      if (roomData && roomData.creator && 'id' in roomData.creator) {
        setRoom(roomData as Room);
      } else {
        throw new Error('Invalid room data structure');
      }
      
      await Promise.all([
        fetchParticipants(),
        fetchMessages()
      ]);
      
    } catch (error) {
      console.error('Error fetching room details:', error);
      toast.error('Error loading room');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchParticipants = async () => {
    try {
      console.log('Fetching participants for room:', id);
      
      const { data: speakersData, error: speakersError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', id)
        .eq('is_speaker', true);
        
      if (speakersError) throw speakersError;
      
      const { data: listenersData, error: listenersError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', id)
        .eq('is_speaker', false);
        
      if (listenersError) throw listenersError;
      
      const allParticipantIds = [...(speakersData || []), ...(listenersData || [])].map(p => p.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', allParticipantIds);
        
      if (profilesError) throw profilesError;
      
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
      
      const speakersWithProfiles = (speakersData || []).map(participant => {
        const profileData = profilesMap.get(participant.user_id);
        return {
          ...participant,
          user: profileData || { 
            id: participant.user_id,
            username: 'Unknown',
            full_name: 'Unknown User',
            avatar_url: null
          }
        } as RoomParticipant;
      });
      
      const listenersWithProfiles = (listenersData || []).map(participant => {
        const profileData = profilesMap.get(participant.user_id);
        return {
          ...participant,
          user: profileData || { 
            id: participant.user_id,
            username: 'Unknown',
            full_name: 'Unknown User',
            avatar_url: null
          }
        } as RoomParticipant;
      });
      
      console.log('Speakers:', speakersWithProfiles);
      console.log('Listeners:', listenersWithProfiles);
      
      setSpeakers(speakersWithProfiles);
      setListeners(listenersWithProfiles);
      
      if (user) {
        checkUserParticipation();
      }
      
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };
  
  const fetchMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', id)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      
      const userIds = [...new Set((messagesData || []).map(m => m.user_id))];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
      
      const messagesWithProfiles = (messagesData || []).map(message => {
        const profileData = profilesMap.get(message.user_id);
        return {
          ...message,
          user: profileData || { 
            id: message.user_id,
            username: 'Unknown',
            full_name: 'Unknown User',
            avatar_url: null
          }
        } as Message;
      });
      
      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  const checkUserParticipation = async () => {
    if (!user || !room) return;
    
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setIsJoined(true);
        setIsSpeaker(data.is_speaker || false);
        setIsModerator(data.is_moderator || false);
        setIsMuted(data.is_muted || true);
        
        const userProfileObj: UserProfile = {
          id: user.id,
          username: profile?.username || 'You',
          full_name: profile?.full_name || 'Current User',
          avatar_url: profile?.avatar_url || null
        };
        
        const hasRequestedToSpeak = data.pending_speaker_request || false;
        
        setCurrentParticipant({
          ...data,
          user: userProfileObj,
          pending_speaker_request: hasRequestedToSpeak
        } as RoomParticipant);
      } else {
        setIsJoined(false);
        setIsSpeaker(false);
        setIsModerator(false);
        setIsMuted(true);
        setCurrentParticipant(null);
      }
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };
  
  const handleJoinRoom = async () => {
    if (!user) {
      toast.error('You must be logged in to join a room');
      navigate('/auth');
      return;
    }
    
    try {
      const isRoomCreator = user.id === room?.creator_id;
      
      const { data, error } = await supabase
        .from('room_participants')
        .insert({
          room_id: id,
          user_id: user.id,
          is_speaker: isRoomCreator,
          is_moderator: isRoomCreator,
          is_muted: true
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const userObj: UserProfile = {
        id: user.id,
        username: profile?.username || 'You',
        full_name: profile?.full_name || 'Current User',
        avatar_url: profile?.avatar_url || null
      };
      
      const participantWithProfile: RoomParticipant = {
        ...data,
        user: userObj
      };
      
      setIsJoined(true);
      setIsSpeaker(isRoomCreator);
      setIsModerator(isRoomCreator);
      setCurrentParticipant(participantWithProfile);
      
      if (isRoomCreator) {
        toast.success('You have joined the room as a moderator');
      } else {
        toast.success('You have joined the room');
      }
      
      fetchParticipants();
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'Error joining room');
    }
  };
  
  const handleLeaveRoom = async () => {
    if (!user || !currentParticipant) return;
    
    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('id', currentParticipant.id);
        
      if (error) throw error;
      
      setIsJoined(false);
      setIsSpeaker(false);
      setIsModerator(false);
      setIsMuted(true);
      setCurrentParticipant(null);
      toast.info('You have left the room');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      toast.error(error.message || 'Error leaving room');
    }
  };
  
  const handleToggleMute = async () => {
    if (!user || !currentParticipant) return;
    
    try {
      const newMutedState = !isMuted;
      
      const { error } = await supabase
        .from('room_participants')
        .update({ is_muted: newMutedState })
        .eq('id', currentParticipant.id);
        
      if (error) throw error;
      
      setIsMuted(newMutedState);
      webRTC.toggleMute();
      
      toast.success(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error: any) {
      console.error('Error toggling mute:', error);
      toast.error(error.message || 'Error toggling mute');
    }
  };
  
  const handleRequestToSpeak = async () => {
    if (!user || !currentParticipant) return;
    
    try {
      const { data: participant, error: fetchError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('id', currentParticipant.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_speaker: false,
          is_muted: true,
          is_moderator: participant.is_moderator,
          pending_speaker_request: true
        })
        .eq('id', currentParticipant.id);
        
      if (error) throw error;
      
      toast.success('Request to speak sent');
      
      setCurrentParticipant({
        ...currentParticipant,
        pending_speaker_request: true
      });
    } catch (error: any) {
      console.error('Error sending speaker request:', error);
      toast.error(error.message || 'Error processing request');
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: id,
          user_id: user.id,
          content: messageText
        });
        
      if (error) throw error;
      
      setMessageText('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Error sending message');
    }
  };
  
  const handleShare = () => {
    setIsShareDialogOpen(true);
  };
  
  const onCopyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${id}`);
    toast.success('Room link copied to clipboard');
    setIsShareDialogOpen(false);
  };
  
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }
  
  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Room not found</h2>
          <p className="text-muted-foreground mb-6">This room may have been deleted or doesn't exist</p>
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">{room.topic}</Badge>
            <Badge variant="destructive">LIVE</Badge>
          </div>
          <h1 className="text-2xl font-bold mt-2">{room.title}</h1>
          <p className="text-muted-foreground">{room.description}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {!isJoined ? (
            <Button onClick={handleJoinRoom}>Join Room</Button>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setShowChat(!showChat)}>
                      <MessageSquare size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="center"
                    className="bg-gray-900 text-white dark:bg-gray-800 dark:text-gray-100 text-xs px-2 py-1 rounded-md"
                  >
                    Open Chat
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setShowParticipants(!showParticipants)}>
                      <Users size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="center"
                    className="bg-gray-900 text-white dark:bg-gray-800 dark:text-gray-100 text-xs px-2 py-1 rounded-md"
                  >
                    View Participants
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleShare}>
                      <Share size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="center"
                    className="bg-gray-900 text-white dark:bg-gray-800 dark:text-gray-100 text-xs px-2 py-1 rounded-md"
                  >
                    Share Room
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="destructive" onClick={handleLeaveRoom}>Leave</Button>
              
              {isModerator && (
                <PromoteUserDialog 
                  roomId={id || ''} 
                  participants={[...speakers, ...listeners]} 
                  onParticipantsUpdate={fetchParticipants} 
                />
              )}
              
              {(isCreator || isModerator) && (
                <RoomControls 
                  roomId={id || ''} 
                  isModerator={isModerator} 
                  isCreator={isCreator} 
                />
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-8">
                <div>
                  <h3 className="font-medium mb-4">Speakers</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {speakers.map((speaker) => (
                      <div key={speaker.id} className="flex flex-col items-center text-center">
                        <div className="relative">
                          <Avatar className="h-16 w-16 border-2 border-primary/20">
                            <AvatarImage 
                              src={speaker.user?.avatar_url || `https://ui-avatars.com/api/?name=${speaker.user?.full_name || speaker.user?.username}&background=random`} 
                              alt={speaker.user?.full_name || speaker.user?.username || ''} 
                            />
                            <AvatarFallback>
                              {((speaker.user?.full_name || speaker.user?.username || 'U') as string).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {speaker.is_moderator && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white dark:text-black p-1 rounded-full">
                              <Crown size={10} />
                            </span>
                          )}
                          <span className="absolute -bottom-1 -right-1">
                            <div className={`w-5 h-5 flex items-center justify-center ${!speaker.is_muted ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-background`}>
                              {speaker.is_muted ? (
                                <MicOff className="h-3 w-3 text-white" />
                              ) : (
                                <Mic className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </span>
                        </div>
                        <span className="text-sm mt-2 font-medium">{speaker.user?.full_name || speaker.user?.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {speaker.is_moderator ? 'Moderator' : 'Speaker'}
                        </span>
                        {!speaker.is_muted && (
                          <div className="mt-1">
                            <AudioWaveform 
                              isActive={speaker.user?.id === user?.id ? webRTC.isSpeaking : !speaker.is_muted} 
                              color="#10b981" 
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isJoined && isSpeaker && !speakers.some(s => s.user?.id === user?.id) && (
                      <div className="flex flex-col items-center text-center">
                        <div className="relative">
                          <Avatar className="h-16 w-16 border-2 border-primary/20">
                            <AvatarImage 
                              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || user?.email}&background=random`} 
                              alt="You" 
                            />
                            <AvatarFallback>{(profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'Y') as string}</AvatarFallback>
                          </Avatar>
                          {isModerator && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white dark:text-black p-1 rounded-full">
                              <Crown size={10} />
                            </span>
                          )}
                          <span className="absolute -bottom-1 -right-1">
                            <div className={`w-5 h-5 flex items-center justify-center ${!isMuted ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-background`}>
                              {isMuted ? (
                                <MicOff className="h-3 w-3 text-white" />
                              ) : (
                                <Mic className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </span>
                        </div>
                        <span className="text-sm mt-2 font-medium">You</span>
                        <span className="text-xs text-muted-foreground">
                          {isModerator ? 'Moderator' : 'Speaker'}
                        </span>
                        {!isMuted && (
                          <div className="mt-1">
                            <AudioWaveform isActive={webRTC.isSpeaking} color="#10b981" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-4">
                    Listeners ({listeners.length + (isJoined && !isSpeaker ? 1 : 0)})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {listeners.map((listener) => (
                      <div key={listener.id} className="flex flex-col items-center text-center">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={listener.user?.avatar_url || `https://ui-avatars.com/api/?name=${listener.user?.full_name || listener.user?.username}&background=random`} 
                            alt={listener.user?.full_name || listener.user?.username || ''} 
                          />
                          <AvatarFallback>
                            {((listener.user?.full_name || listener.user?.username || 'U') as string).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs mt-1 line-clamp-1">
                          {listener.user?.full_name || listener.user?.username}
                        </span>
                        {listener.pending_speaker_request && (
                          <Badge variant="outline" size="sm" className="text-xs mt-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                            Request to speak
                          </Badge>
                        )}
                      </div>
                    ))}
                    
                    {isJoined && !isSpeaker && !listeners.some(l => l.user?.id === user?.id) && (
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || user?.email}&background=random`} 
                            alt="You" 
                          />
                          <AvatarFallback>{(profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'Y') as string}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs mt-1">You</span>
                        {currentParticipant?.pending_speaker_request && (
                          <Badge variant="outline" size="sm" className="text-xs mt-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                            Request to speak
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
        <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Chat</h3>
          <Badge variant="outline" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>
        
        <ScrollArea className="h-[300px] lg:h-[400px] pr-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-4">
              <p className="text-sm text-muted-foreground">No messages yet. Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="mb-3 pb-3 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{message.user?.full_name || message.user?.username}</span>
                  <span className="text-xs text-muted-foreground">{formatMessageTime(message.created_at)}</span>
                </div>
                <p className="text-sm mt-1">{message.content}</p>
              </div>
            ))
          )}
        </ScrollArea>
        
        {isJoined ? (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Write a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button variant="secondary" size="icon" onClick={handleSendMessage}>
              <Share size={16} className="rotate-90" />
            </Button>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <p className="text-sm text-muted-foreground mb-2">Join the room to chat</p>
            <Button onClick={handleJoinRoom} className="w-full" size="sm">Join Room</Button>
          </div>
        )}
      </CardContent>
    </Card>
        </div>
      </div>
      
      {isJoined && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex items-center justify-center gap-4 z-40">
          {isSpeaker ? (
            <>
              <Button
                variant={isMuted ? "default" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={handleToggleMute}
                disabled={webRTC.isConnecting}
              >
                {isMuted ? (
                  <MicOff size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRequestToSpeak}
              disabled={Boolean(currentParticipant?.pending_speaker_request)}
            >
              <Volume2 size={16} />
              <span>{currentParticipant?.pending_speaker_request ? 'Request Pending' : 'Request to speak'}</span>
            </Button>
          )}
          
          <Button variant="destructive" size="sm" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
        </div>
      )}
      
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Speakers</h4>
              <div className="space-y-2">
                {speakers.map((speaker) => (
                  <div key={speaker.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage 
                          src={speaker.user?.avatar_url || `https://ui-avatars.com/api/?name=${speaker.user?.full_name || speaker.user?.username}&background=random`} 
                          alt={speaker.user?.full_name || speaker.user?.username || ''} 
                        />
                        <AvatarFallback>
                          {((speaker.user?.full_name || speaker.user?.username || 'U') as string).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{speaker.user?.full_name || speaker.user?.username}</p>
                          {speaker.is_moderator && (
                            <Crown size={12} className="text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {speaker.is_moderator ? 'Moderator' : 'Speaker'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Listeners</h4>
              <div className="space-y-2">
                {listeners.map((listener) => (
                  <div key={listener.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage 
                          src={listener.user?.avatar_url || `https://ui-avatars.com/api/?name=${listener.user?.full_name || listener.user?.username}&background=random`} 
                          alt={listener.user?.full_name || listener.user?.username || ''} 
                        />
                        <AvatarFallback>
                          {((listener.user?.full_name || listener.user?.username || 'U') as string).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{listener.user?.full_name || listener.user?.username}</p>
                        {listener.pending_speaker_request && (
                          <Badge variant="outline" size="sm" className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                            Request to speak
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChat} onOpenChange={setShowChat}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Room Chat</DialogTitle>
    </DialogHeader>
    <Card className="border-0 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-1 pr-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4">
                <p className="text-sm text-muted-foreground">No messages yet. Be the first to say hello!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="mb-3 pb-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{message.user?.full_name || message.user?.username}</span>
                    <span className="text-xs text-muted-foreground">{formatMessageTime(message.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1">{message.content}</p>
                </div>
              ))
            )}
          </ScrollArea>
          
          {isJoined ? (
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Write a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button variant="secondary" size="icon" onClick={handleSendMessage}>
                <Share size={16} className="rotate-90" />
              </Button>
            </div>
          ) : (
            <div className="mt-3 text-center">
              <p className="text-sm text-muted-foreground mb-2">Join the room to chat</p>
              <Button onClick={handleJoinRoom} className="w-full" size="sm">Join Room</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </DialogContent>
</Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Room</DialogTitle>
            <DialogDescription>
              Share this room with others by copying the link.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input 
              value={`${window.location.origin}/room/${id}`} 
              readOnly 
              className="flex-1"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button onClick={onCopyRoomLink}>
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      
    </div>
  );
};

export default Room;
