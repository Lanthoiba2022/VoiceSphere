
import { supabase } from './client';

export const enableRealtimeChannel = async (roomId: string) => {
  // Create a channel for real-time communication
  const channel = supabase.channel(`room-${roomId}`);
  
  // Subscribe to receive updates
  channel.subscribe(status => {
    console.log(`Room ${roomId} channel status:`, status);
  });
  
  return channel;
};

export const cleanupRealtimeChannel = (channel: ReturnType<typeof supabase.channel>) => {
  supabase.removeChannel(channel);
};
