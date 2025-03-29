import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Mic, MicOff, Volume2, Headphones, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Featured Topics
const featuredTopics = ['Design', 'Technology', 'Music', 'Business', 'Art', 'Education', 'Science', 'Health'];

const Home = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRooms();
    
    // Set up a realtime subscription for rooms
    const roomsChannel = supabase
      .channel('public:rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' }, 
        () => {
          fetchRooms();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);
  
  const fetchRooms = async () => {
    try {
      setLoading(true);
      
      // Get all active rooms
      // Use separate queries for each part of the data we need instead of foreign key relationships
      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // For each room, get creator details and participants
      const roomsWithDetails = await Promise.all(
        roomsData.map(async (room) => {
          // Get creator profile
          const { data: creatorData, error: creatorError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', room.creator_id)
            .single();
            
          if (creatorError) console.error('Creator fetch error:', creatorError);
          
          // Get participants
          const { data: participants, error: participantsError } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', room.id);
            
          if (participantsError) console.error('Participants fetch error:', participantsError);
          
          // Get speakers
          const { data: speakers, error: speakersError } = await supabase
            .from('room_participants')
            .select(`
              *,
              user:profiles(id, username, full_name, avatar_url)
            `)
            .eq('room_id', room.id)
            .eq('is_speaker', true);
            
          if (speakersError) console.error('Speakers fetch error:', speakersError);
          
          // Get listeners count
          const { data: listeners, error: listenersError } = await supabase
            .from('room_participants')
            .select('count')
            .eq('room_id', room.id)
            .eq('is_speaker', false);
            
          const listenersCount = listeners ? listeners[0]?.count || 0 : 0;
          
          return {
            ...room,
            creator: creatorData,
            participants: participants || [],
            speakers: speakers || [],
            listenersCount
          };
        })
      );
      
      setRooms(roomsWithDetails);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'live') return matchesSearch && room.is_active;
    
    // Filter by topic
    return matchesSearch && room.topic === activeFilter;
  });
  
  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 py-8 mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Real conversations,
          <br />
          <span className="text-primary">in real time</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join live audio rooms, connect with like-minded people, and share your voice with the world.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          {user ? (
            <Button size="lg" asChild>
              <Link to="/create" className="gap-2">
                <Mic size={18} />
                <span>Start a Room</span>
              </Link>
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link to="/auth" className="gap-2">
                <Mic size={18} />
                <span>Sign In to Start</span>
              </Link>
            </Button>
          )}
          <Button size="lg" variant="outline" asChild>
            <Link to="#explore" className="gap-2">
              <Headphones size={18} />
              <span>Explore Rooms</span>
            </Link>
          </Button>
        </div>
      </section>
      
      <section className="space-y-6" id="explore">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="section-title">Explore Rooms</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search rooms..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 py-2">
          <Badge 
            variant={activeFilter === 'all' ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setActiveFilter('all')}
          >
            All
          </Badge>
          <Badge 
            variant={activeFilter === 'live' ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setActiveFilter('live')}
          >
            Live Now
          </Badge>
          {featuredTopics.map(topic => (
            <Badge 
              key={topic}
              variant={activeFilter === topic ? "default" : "outline"} 
              className="cursor-pointer"
              onClick={() => setActiveFilter(topic)}
            >
              {topic}
            </Badge>
          ))}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No rooms found</h3>
            <p className="text-muted-foreground">
              {user ? (
                <>Be the first to create a room!</>
              ) : (
                <>Sign in to create a new room or check back later.</>
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map(room => (
              <Card key={room.id} className="interactive-card overflow-hidden">
                <CardContent className="p-6 pb-0">
                  <div className="flex justify-between">
                    <div>
                      <Badge variant="destructive" className="mb-2">
                        LIVE
                      </Badge>
                      {room.topic && (
                        <Badge variant="outline" className="ml-2 mb-2">
                          {room.topic}
                        </Badge>
                      )}
                      <h3 className="text-lg font-medium line-clamp-1">{room.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {room.description || 'Join this room to discover what people are talking about'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center mt-4 -space-x-2">
                    {room.speakers && room.speakers.map((speaker: any, index: number) => (
                      <div key={speaker.id} className="relative">
                        <Avatar className="border-2 border-background">
                          <AvatarImage 
                            src={speaker.user?.avatar_url || `https://ui-avatars.com/api/?name=${speaker.user?.full_name || speaker.user?.username}&background=random`} 
                            alt={speaker.user?.full_name || speaker.user?.username} 
                          />
                          <AvatarFallback>
                            {(speaker.user?.full_name || speaker.user?.username || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {speaker.is_speaker && !speaker.is_muted && (
                          <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                            <Mic className="h-2 w-2 text-white" />
                          </span>
                        )}
                        {speaker.is_speaker && speaker.is_muted && (
                          <span className="absolute -bottom-1 -right-1 rounded-full bg-gray-500 p-1">
                            <MicOff className="h-2 w-2 text-white" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between p-6 pb-5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users size={14} className="mr-1" />
                    {room.participants ? room.participants.length : 0} listening
                  </div>
                  <Button size="sm" asChild>
                    <Link to={`/room/${room.id}`}>Join</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
