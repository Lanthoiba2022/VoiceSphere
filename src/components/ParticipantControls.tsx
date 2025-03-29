
import { useState } from 'react';
import { Volume2, VolumeX, ShieldX, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ParticipantControlsProps {
  participantId: string;
  roomId: string;
  isMuted: boolean;
  onKickOut: () => void;
  onToggleMute: () => void;
  onPromote: () => void;
}

const ParticipantControls = ({ 
  participantId, 
  roomId, 
  isMuted, 
  onKickOut, 
  onToggleMute, 
  onPromote 
}: ParticipantControlsProps) => {
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleKickOut = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('id', participantId)
        .eq('room_id', roomId);
        
      if (error) throw error;
      
      toast.success('Participant has been removed from the room');
      onKickOut();
      setShowKickDialog(false);
    } catch (error: any) {
      console.error('Error kicking participant:', error);
      toast.error(error.message || 'Error removing participant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleMute}
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isMuted ? "Unmute participant" : "Mute participant"}
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowKickDialog(true)}
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ShieldX size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Remove from room
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onPromote}
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <UserPlus size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Promote to moderator
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={showKickDialog} onOpenChange={setShowKickDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this participant from the room?
              They will need to rejoin if they want to participate again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleKickOut}
              disabled={isLoading}
            >
              {isLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParticipantControls;
