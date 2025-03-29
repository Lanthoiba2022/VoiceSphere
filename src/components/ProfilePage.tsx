
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProfileUserInfo from './ProfileUserInfo';

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [userCreatedAt, setUserCreatedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user?.id) {
      // Fetch user's created_at timestamp from auth.users
      const fetchUserDetails = async () => {
        try {
          // First try to fetch from profiles table which might have a created_at field
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single();
          
          if (!profileError && profileData?.created_at) {
            setUserCreatedAt(profileData.created_at);
          } else {
            // Fallback to user's created_at from auth metadata if available
            if (user.created_at) {
              setUserCreatedAt(user.created_at);
            }
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      };
      
      fetchUserDetails();
    }
  }, [user]);

  const enhancedProfile = {
    ...profile,
    created_at: userCreatedAt
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-start">
        <ProfileUserInfo profile={enhancedProfile} />
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="upcoming">Upcoming Rooms</TabsTrigger>
          <TabsTrigger value="past">Past Rooms</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-10">
                <p className="text-muted-foreground">You don't have any upcoming rooms.</p>
                <Button className="mt-4">Create a Room</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="past" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-10">
                <p className="text-muted-foreground">You haven't participated in any rooms yet.</p>
                <Button className="mt-4">Explore Rooms</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="saved" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-10">
                <p className="text-muted-foreground">You don't have any saved rooms.</p>
                <Button className="mt-4">Explore Rooms</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
