
import React from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileUserInfoProps {
  profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    created_at?: string;
    bio?: string | null;
    interests?: string[] | null;
    website?: string | null;
  };
}

const ProfileUserInfo: React.FC<ProfileUserInfoProps> = ({ profile }) => {
  const interests = profile.interests || ['Design', 'Technology', 'Music', 'Art'];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'Joined recently';
    
    try {
      const date = new Date(dateString);
      return `Joined ${format(date, 'MMMM yyyy')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Joined recently';
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <Avatar className="h-24 w-24 border-2 border-primary/20">
          <AvatarImage 
            src={profile.avatar_url || undefined} 
            alt={profile.full_name || profile.username || 'User'} 
          />
          <AvatarFallback className="text-xl font-bold">
            {getInitials(profile.full_name || profile.username || 'User')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name || 'User'}</h1>
          <p className="text-muted-foreground">@{profile.username || 'username'}</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Calendar size={14} />
            <span>{formatJoinDate(profile.created_at)}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm">{profile.bio || 'Audio enthusiast and product designer. Host of weekly design conversations and tech talks.'}</p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {interests.map((interest, index) => (
          <Badge variant="outline" key={index} className="px-3 py-1 bg-muted/50">
            {interest}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default ProfileUserInfo;
