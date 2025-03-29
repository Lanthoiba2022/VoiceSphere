
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Edit, Headphones, Link as LinkIcon, Settings, Share, Twitter, Users, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define user data structure to match the example
interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  isMe: boolean;
  website?: string;
  twitter?: string;
  joinedDate: string;
  interests: string[];
  upcomingRooms: RoomItem[];
  pastRooms: PastRoomItem[];
  savedRooms: SavedRoomItem[];
}

interface RoomItem {
  id: string;
  title: string;
  scheduledFor: string;
  participants: number;
}

interface PastRoomItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
}

interface SavedRoomItem {
  id: string;
  title: string;
  host: string;
  date: string;
  saved: boolean;
}

// Example data matching the requested format
const exampleUser: UserProfile = {
  id: 'me',
  name: 'Alex Morgan',
  username: 'alexmorgan',
  avatar: 'https://i.pravatar.cc/150?img=35',
  bio: 'Audio enthusiast and product designer. Host of weekly design conversations and tech talks.',
  followers: 1243,
  following: 382,
  isFollowing: false,
  isMe: true,
  website: 'alexmorgan.design',
  twitter: 'alexmorgandesign',
  joinedDate: 'September 2022',
  interests: ['Design', 'Technology', 'Music', 'Art'],
  upcomingRooms: [
    {
      id: '4',
      title: 'Weekly Design Review',
      scheduledFor: 'Tomorrow, 2:00 PM',
      participants: 42,
    },
  ],
  pastRooms: [
    {
      id: '1',
      title: 'Design Principles Discussion',
      date: '2 days ago',
      duration: '1h 23m',
      participants: 124,
    },
    {
      id: '2',
      title: 'UI Animation Workshop',
      date: 'Last week',
      duration: '2h 05m',
      participants: 89,
    },
  ],
  savedRooms: [
    {
      id: '3',
      title: 'Tech Talk: Voice UX',
      host: 'David Park',
      date: '3 days ago',
      saved: true,
    },
  ],
};

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  useEffect(() => {
    fetchUserProfile();
  }, [id, user]);
  
  const fetchUserProfile = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, you would fetch this data from your backend
      // For now, we'll use the example data
      
      // Check if viewing own profile
      const isOwnProfile = !id || id === 'me' || (user && id === user.id);
      
      // Get some basic profile info from Supabase if possible
      let fetchedProfile = null;
      if (id && id !== 'me') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
          
        if (!error) {
          fetchedProfile = data;
        }
      }
      
      // Combine with example data
      setUserData({
        ...exampleUser,
        id: isOwnProfile ? 'me' : (id || 'unknown'),
        isMe: isOwnProfile,
        name: fetchedProfile?.full_name || profile?.full_name || exampleUser.name,
        username: fetchedProfile?.username || profile?.username || exampleUser.username,
        avatar: fetchedProfile?.avatar_url || profile?.avatar_url || exampleUser.avatar,
        bio: fetchedProfile?.bio || profile?.bio || exampleUser.bio
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFollow = () => {
    if (!userData) return;
    
    setUserData({
      ...userData,
      isFollowing: !userData.isFollowing,
      followers: userData.isFollowing ? userData.followers - 1 : userData.followers + 1,
    });
    
    toast.success(userData.isFollowing ? 'Unfollowed successfully' : 'Following successfully');
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard');
  };
  
  const handleSaveRoom = (roomId: string) => {
    if (!userData) return;
    
    setUserData({
      ...userData,
      savedRooms: userData.savedRooms.map((room) => 
        room.id === roomId ? { ...room, saved: !room.saved } : room
      ),
    });
    
    const room = userData.savedRooms.find((r) => r.id === roomId);
    if (room) {
      toast.success(room.saved ? 'Room removed from saved' : 'Room saved successfully');
    }
  };
  
  if (loading || !userData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-24 bg-muted rounded-full mb-4 mx-auto"></div>
          <div className="h-6 w-48 bg-muted rounded-md mb-3 mx-auto"></div>
          <div className="h-4 w-32 bg-muted rounded-md mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-md">
          <AvatarImage src={`https://ui-avatars.com/api/?name=${profile?.full_name || user.email}&background=random`} alt={userData.name} />
          <AvatarFallback>{userData.name.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold">{userData.name}</h1>
          <p className="text-muted-foreground">@{userData.username}</p>
          
          <div className="flex flex-wrap gap-2 justify-center md:justify-start my-3">
            {userData.interests.map((interest) => (
              <Badge key={interest} variant="outline">{interest}</Badge>
            ))}
          </div>
          
          <p className="text-muted-foreground mt-2 max-w-xl">{userData.bio}</p>
          
          <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
            <div className="flex items-center gap-1 text-sm">
              <Users size={16} className="text-muted-foreground" />
              <span><strong>{userData.followers}</strong> followers</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Users size={16} className="text-muted-foreground" />
              <span><strong>{userData.following}</strong> following</span>
            </div>
            {userData.website && (
              <div className="flex items-center gap-1 text-sm">
                <LinkIcon size={16} className="text-muted-foreground" />
                <a 
                  href={`https://${userData.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {userData.website}
                </a>
              </div>
            )}
            {userData.twitter && (
              <div className="flex items-center gap-1 text-sm">
                <Twitter size={16} className="text-muted-foreground" />
                <a 
                  href={`https://twitter.com/${userData.twitter}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @{userData.twitter}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm">
              <Calendar size={16} className="text-muted-foreground" />
              <span>Joined {userData.joinedDate}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          {userData.isMe ? (
            <>
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <Link to="/settings">
                  <Settings size={14} />
                  <span>Settings</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <Link to="/edit-profile">
                  <Edit size={14} />
                  <span>Edit Profile</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={userData.isFollowing ? "outline" : "default"} 
                size="sm"
                onClick={handleFollow}
              >
                {userData.isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share size={14} />
              </Button>
            </>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto">
          <TabsTrigger
            value="upcoming"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none py-2 px-4"
          >
            Upcoming Rooms
          </TabsTrigger>
          <TabsTrigger
            value="past"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none py-2 px-4"
          >
            Past Rooms
          </TabsTrigger>
          {userData.isMe && (
            <TabsTrigger
              value="saved"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none py-2 px-4"
            >
              Saved
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {userData.upcomingRooms && userData.upcomingRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userData.upcomingRooms.map((room) => (
                <Card key={room.id} className="interactive-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{room.title}</CardTitle>
                    <CardDescription className="flex items-center">
                      <CalendarIcon size={14} className="mr-1" />
                      {room.scheduledFor}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users size={14} className="mr-1" />
                      {room.participants} interested
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/room/${room.id}`}>Remind me</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No upcoming rooms</h3>
              <p className="text-muted-foreground">
                {userData.isMe ? "You don't have any scheduled rooms yet" : "This user doesn't have any scheduled rooms"}
              </p>
              {userData.isMe && (
                <Button className="mt-4" asChild>
                  <Link to="/create">Schedule a Room</Link>
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="space-y-4">
          {userData.pastRooms && userData.pastRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userData.pastRooms.map((room) => (
                <Card key={room.id} className="interactive-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{room.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>{room.date} • {room.duration}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users size={14} className="mr-1" />
                      {room.participants} participants
                    </div>
                    {userData.isMe && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/room/${room.id}`}>Replay</Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Headphones size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No past rooms</h3>
              <p className="text-muted-foreground">
                {userData.isMe ? "You haven't hosted any rooms yet" : "This user hasn't hosted any rooms yet"}
              </p>
              {userData.isMe && (
                <Button className="mt-4" asChild>
                  <Link to="/create">Host Your First Room</Link>
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        {userData.isMe && (
          <TabsContent value="saved" className="space-y-4">
            {userData.savedRooms && userData.savedRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userData.savedRooms.map((room) => (
                  <Card key={room.id} className="interactive-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{room.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>Host: {room.host}</span>
                        <span>•</span>
                        <span>{room.date}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between pt-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleSaveRoom(room.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {room.saved ? 'Unsave' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/room/${room.id}`}>View</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Headphones size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No saved rooms</h3>
                <p className="text-muted-foreground">
                  You haven't saved any rooms yet
                </p>
                <Button className="mt-4" asChild>
                  <Link to="/">Explore Rooms</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Profile;
