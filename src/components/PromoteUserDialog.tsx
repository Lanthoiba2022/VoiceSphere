import { useState } from 'react';
import { Shield, MicOff, Mic, Crown, UserMinus, ArrowDownCircle, UserPlus, Volume2, X, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ParticipantControls from './ParticipantControls';
import { Badge } from '@/components/ui/badge';

interface Participant {
  id: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  is_moderator: boolean;
  is_speaker: boolean;
  is_muted: boolean;
  pending_speaker_request?: boolean;
}

interface PromoteUserDialogProps {
  roomId: string;
  participants: Participant[];
  onParticipantsUpdate: () => void;
}

const PromoteUserDialog = ({ roomId, participants, onParticipantsUpdate }: PromoteUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePromoteToModerator = async (participantId: string, isModerator: boolean) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_moderator: !isModerator,
          is_speaker: true
        })
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success(isModerator ? 'User demoted from moderator' : 'User promoted to moderator');
      onParticipantsUpdate();
    } catch (error: any) {
      console.error('Error updating participant:', error);
      toast.error(error.message || 'Error updating participant');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleMute = async (participantId: string, isMuted: boolean) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_muted: !isMuted,
        })
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success(isMuted ? 'User unmuted' : 'User muted');
      onParticipantsUpdate();
    } catch (error: any) {
      console.error('Error updating participant mute status:', error);
      toast.error(error.message || 'Error updating participant');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteToSpeaker = async (participantId: string) => {
    try {
      setIsLoading(true);
      
      const { data: participant, error: fetchError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('id', participantId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_speaker: true,
          is_muted: true,
          pending_speaker_request: false
        })
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success('User promoted to speaker');
      onParticipantsUpdate();
    } catch (error: any) {
      console.error('Error promoting to speaker:', error);
      toast.error(error.message || 'Error updating participant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoteFromSpeaker = async (participantId: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_speaker: false,
          is_muted: true,
          pending_speaker_request: false
        })
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success('User demoted to listener');
      onParticipantsUpdate();
    } catch (error: any) {
      console.error('Error demoting from speaker:', error);
      toast.error(error.message || 'Error updating participant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDenySpeakerRequest = async (participantId: string) => {
    try {
      setIsLoading(true);
      
      const { data: participant, error: fetchError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('id', participantId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('room_participants')
        .update({ 
          is_speaker: false,
          is_muted: true,
          is_moderator: participant.is_moderator,
          pending_speaker_request: false
        })
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success('Speaker request denied');
      onParticipantsUpdate();
    } catch (error: any) {
      console.error('Error denying speaker request:', error);
      toast.error(error.message || 'Error updating participant');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveFromRoom = async (participantId: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success('User removed from room');
      onParticipantsUpdate();
    } catch (error: any) {
      console.error('Error removing participant:', error);
      toast.error(error.message || 'Error removing participant');
    } finally {
      setIsLoading(false);
    }
  };

  const moderators = participants.filter(p => p.is_moderator);
  const speakers = participants.filter(p => p.is_speaker && !p.is_moderator);
  const listeners = participants.filter(p => !p.is_speaker && !p.is_moderator);
  const pendingRequests = participants.filter(p => p.pending_speaker_request);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <Button 
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setIsOpen(true)}
      >
        <Shield size={16} />
        <span>Manage Participants</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Participants</DialogTitle>
            <DialogDescription>
              Promote participants to moderators, mute speakers, or remove participants from the room.
              Moderators can speak in the room and help manage it.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-4">
              {/* Current Moderators Section */}
              <div>
                <h4 className="text-sm font-medium mb-2">Current Moderators</h4>
                <div className="space-y-2">
                  {moderators.map((moderator) => (
                    <div key={moderator.id} className="flex items-center justify-between p-3 rounded-md hover:bg-accent dark:hover:bg-accent/30 border border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarImage 
                            src={moderator.user?.avatar_url || undefined} 
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(moderator.user?.full_name || moderator.user?.username || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium">{moderator.user?.full_name || moderator.user?.username}</p>
                            <Crown size={14} className="text-amber-500" />
                          </div>
                          <Badge variant={moderator.is_muted ? "destructive" : "success"} size="sm" className="text-xs mt-1">
                            {moderator.is_muted ? "Muted" : "Live"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Mute/Unmute Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleMute(moderator.id, moderator.is_muted)}
                          className="gap-1"
                        >
                          {moderator.is_muted ? (
                            <>
                              <Mic size={14} />
                              <span>Unmute</span>
                            </>
                          ) : (
                            <>
                              <MicOff size={14} />
                              <span>Mute</span>
                            </>
                          )}
                        </Button>
                        
                        {/* Demote Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePromoteToModerator(moderator.id, moderator.is_moderator)}
                          className="gap-1"
                        >
                          <ArrowDownCircle size={14} />
                          <span>Demote</span>
                        </Button>
                        
                        {/* Remove Button */}
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveFromRoom(moderator.id)}
                          className="gap-1"
                        >
                          <UserMinus size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {moderators.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">No moderators found</p>
                  )}
                </div>
              </div>
              
              {/* Pending Speaker Requests Section */}
              {pendingRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Speaker Requests</h4>
                  <div className="space-y-2">
                    {pendingRequests.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-3 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={participant.user?.avatar_url || undefined}
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                              {getInitials(participant.user?.full_name || participant.user?.username || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{participant.user?.full_name || participant.user?.username}</p>
                            <Badge variant="outline" size="sm" className="text-xs mt-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                              Request to speak
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => handlePromoteToSpeaker(participant.id)}
                            className="gap-1"
                          >
                            <Volume2 size={14} />
                            <span>Allow</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDenySpeakerRequest(participant.id)}
                            className="gap-1"
                          >
                            <X size={14} />
                            <span>Deny</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Speakers Section */}
              {speakers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Speakers</h4>
                  <div className="space-y-2">
                    {speakers.map((speaker) => (
                      <div key={speaker.id} className="flex items-center justify-between p-3 rounded-md hover:bg-accent dark:hover:bg-accent/30 border border-border">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={speaker.user?.avatar_url || undefined}
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                              {getInitials(speaker.user?.full_name || speaker.user?.username || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium">{speaker.user?.full_name || speaker.user?.username}</p>
                            </div>
                            <Badge variant={speaker.is_muted ? "destructive" : "success"} size="sm" className="text-xs mt-1">
                              {speaker.is_muted ? "Muted" : "Live"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Mute/Unmute Button */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleMute(speaker.id, speaker.is_muted)}
                            className="gap-1"
                          >
                            {speaker.is_muted ? (
                              <>
                                <Mic size={14} />
                                <span>Unmute</span>
                              </>
                            ) : (
                              <>
                                <MicOff size={14} />
                                <span>Mute</span>
                              </>
                            )}
                          </Button>
                          
                          {/* Demote Button */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDemoteFromSpeaker(speaker.id)}
                            className="gap-1"
                          >
                            <ArrowDownCircle size={14} />
                            <span>Demote</span>
                          </Button>
                          
                          {/* Promote to Moderator Button */}
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handlePromoteToModerator(speaker.id, speaker.is_moderator)}
                            className="gap-1"
                          >
                            <Crown size={14} />
                            <span>Make Mod</span>
                          </Button>
                          
                          {/* Remove Button */}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRemoveFromRoom(speaker.id)}
                          >
                            <UserMinus size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Listeners Section */}
              <div>
                <h4 className="text-sm font-medium mb-2">Listeners</h4>
                <div className="space-y-2">
                  {listeners.length > 0 ? (
                    listeners.map((listener) => (
                      <div key={listener.id} className="flex items-center justify-between p-3 rounded-md hover:bg-accent dark:hover:bg-accent/30 border border-border">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={listener.user?.avatar_url || undefined}
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                              {getInitials(listener.user?.full_name || listener.user?.username || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{listener.user?.full_name || listener.user?.username}</p>
                            <Badge variant="outline" size="sm" className="text-xs mt-1">
                              Listener
                            </Badge>
                            {listener.pending_speaker_request && (
                              <Badge variant="outline" size="sm" className="text-xs ml-1 mt-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                                Request to speak
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Promote to Speaker Button */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePromoteToSpeaker(listener.id)}
                            className="gap-1"
                          >
                            <Volume2 size={14} />
                            <span>Make Speaker</span>
                          </Button>
                          
                          {/* Promote to Moderator Button */}
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handlePromoteToModerator(listener.id, listener.is_moderator)}
                            className="gap-1"
                          >
                            <Crown size={14} />
                            <span>Make Mod</span>
                          </Button>
                          
                          {/* Remove Button */}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleRemoveFromRoom(listener.id)}
                          >
                            <UserMinus size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">No listeners in the room</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromoteUserDialog;
