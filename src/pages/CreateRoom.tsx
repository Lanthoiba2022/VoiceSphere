
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Users, Calendar, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

// Topic options
const topics = [
  'Design',
  'Technology',
  'Music',
  'Business',
  'Art',
  'Education',
  'Science',
  'Health',
  'Gaming',
  'Politics',
  'Sports',
  'Food',
  'Travel',
  'Fashion',
  'Other',
];

const CreateRoom = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [roomType, setRoomType] = useState('public');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if not logged in
  if (!user) {
    toast.error('You must be logged in to create a room');
    return <Navigate to="/auth" />;
  }
  
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a room title');
      return;
    }
    
    if (!topic) {
      toast.error('Please select a topic');
      return;
    }
    
    if (!user || !profile) {
      toast.error('You must be logged in to create a room');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert the new room into the database - use user.id for creator_id
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          creator_id: user.id, // Use user.id instead of profile.id
          title,
          description,
          topic,
          is_active: !isScheduled, // If scheduled, it's not active yet
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Add the creator as a participant and moderator
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          is_speaker: true,
          is_moderator: true,
          is_muted: false
        });
        
      if (participantError) throw participantError;
      
      if (isScheduled) {
        toast.success('Room scheduled successfully');
        navigate('/');
      } else {
        toast.success('Room created! Redirecting...');
        navigate(`/room/${room.id}`);
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error(error.message || 'Error creating room');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Create a Room</h1>
        <p className="text-muted-foreground mt-2">
          Host a conversation and connect with others in real-time
        </p>
      </div>
      
      <Card>
        <form onSubmit={handleCreateRoom}>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
            <CardDescription>
              Fill in the information about your room
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Room Title</Label>
              <Input
                id="title"
                placeholder="Give your room a descriptive title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/60
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="What will you be talking about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                className="resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/200
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger id="topic">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Room Type</Label>
              <RadioGroup value={roomType} onValueChange={setRoomType} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="cursor-pointer flex items-center">
                    <Users size={16} className="mr-2" />
                    Public (Anyone can join)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="cursor-pointer flex items-center">
                    <Users size={16} className="mr-2" />
                    Private (Invitation only)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="scheduled"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
              <Label htmlFor="scheduled" className="cursor-pointer flex items-center">
                <Calendar size={16} className="mr-2" />
                Schedule for later
              </Label>
            </div>
            
            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="bg-muted rounded-md p-4 flex gap-3">
              <Info size={18} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Room Guidelines</p>
                <ul className="list-disc space-y-1 ml-4">
                  <li>Be respectful and kind to all participants</li>
                  <li>Avoid sharing sensitive personal information</li>
                  <li>Moderators can mute or remove disruptive participants</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isScheduled ? 'Scheduling...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Mic size={18} />
                  <span>{isScheduled ? 'Schedule Room' : 'Start Room Now'}</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateRoom;
