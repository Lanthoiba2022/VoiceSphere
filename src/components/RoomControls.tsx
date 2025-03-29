
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoomControlsProps {
  roomId: string;
  isModerator: boolean;
  isCreator: boolean;
}

const RoomControls = ({ roomId, isModerator, isCreator }: RoomControlsProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRoom = async () => {
    if (!isCreator) return;
    
    try {
      setIsDeleting(true);
      
      // Delete all participants first
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId);
        
      // Delete all messages
      await supabase
        .from('messages')
        .delete()
        .eq('room_id', roomId);
        
      // Delete the room
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);
        
      if (error) throw error;
      
      toast.success('Room deleted successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting room:', error);
      toast.error(error.message || 'Error deleting room');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!isModerator && !isCreator) return null;

  return (
    <>
      {isCreator && (
        <Button 
          variant="destructive" 
          size="sm" 
          className="gap-1"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 size={16} />
          <span>Delete Room</span>
        </Button>
      )}
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this room? This action cannot be undone.
              All messages and participants will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRoom} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomControls;
