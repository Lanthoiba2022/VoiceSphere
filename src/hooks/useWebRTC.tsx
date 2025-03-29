
import { useState, useEffect, useRef } from 'react';
import webRTCService, { WebRTCParticipant } from '@/services/webRTCService';

interface UseWebRTCProps {
  roomId: string;
  userId: string;
  isSpeaker: boolean;
  isActive: boolean;
}

export const useWebRTC = ({ roomId, userId, isSpeaker, isActive }: UseWebRTCProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [participants, setParticipants] = useState<Map<string, WebRTCParticipant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const speakingCheckIntervalRef = useRef<number | null>(null);
  
  // Initialize connection to the room
  useEffect(() => {
    if (!isActive || !roomId || !userId) return;
    
    const connect = async () => {
      try {
        setIsConnecting(true);
        await webRTCService.joinRoom(roomId, userId, isSpeaker);
        setIsMuted(webRTCService.isMicrophoneMuted());
        console.log('Connected to WebRTC room as', isSpeaker ? 'speaker' : 'listener');
        
        // Set up audio context for detecting speaking
        if (isSpeaker) {
          setupAudioAnalyser();
        }
      } catch (error) {
        console.error('Error connecting to WebRTC room:', error);
      } finally {
        setIsConnecting(false);
      }
    };
    
    connect();
    
    // Add handlers for participant events
    const handleParticipantAdded = (participant: WebRTCParticipant) => {
      console.log('Participant added to WebRTC:', participant.id);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(participant.id, participant);
        return newMap;
      });
    };
    
    const handleParticipantRemoved = (participantId: string) => {
      console.log('Participant removed from WebRTC:', participantId);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantId);
        return newMap;
      });
    };
    
    const handleMuteChanged = (muted: boolean) => {
      console.log('Mute state changed:', muted);
      setIsMuted(muted);
      
      // When muted, ensure speaking state is false
      if (muted) {
        setIsSpeaking(false);
      }
    };
    
    webRTCService.onParticipantAdded(handleParticipantAdded);
    webRTCService.onParticipantRemoved(handleParticipantRemoved);
    webRTCService.onMuteChanged(handleMuteChanged);
    
    return () => {
      console.log('Leaving WebRTC room');
      webRTCService.leaveRoom();
      cleanup();
    };
  }, [roomId, userId, isSpeaker, isActive]);
  
  // Update speaker status if it changes
  useEffect(() => {
    // If already connected and speaker status changes, update the connection
    if (isActive && roomId && userId) {
      console.log('Speaker status changed, rejoining room');
      webRTCService.leaveRoom();
      webRTCService.joinRoom(roomId, userId, isSpeaker);
      
      // If changing to speaker, ensure mic is muted by default
      if (isSpeaker) {
        webRTCService.setMuted(true);
        setIsMuted(true);
        
        // Set up audio context for detecting speaking
        if (!audioContextRef.current) {
          setupAudioAnalyser();
        }
      } else {
        cleanup();
      }
    }
  }, [isSpeaker]);
  
  // Clean up audio resources
  const cleanup = () => {
    if (speakingCheckIntervalRef.current) {
      clearInterval(speakingCheckIntervalRef.current);
      speakingCheckIntervalRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    }
    
    setIsSpeaking(false);
  };
  
  // Set up audio analyser for detecting speaking
  const setupAudioAnalyser = () => {
    try {
      const stream = webRTCService.getLocalStream();
      if (!stream) {
        console.log('No local stream available for audio analysis');
        return;
      }
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.error('AudioContext not supported in this browser');
        return;
      }
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      // Check if user is speaking
      speakingCheckIntervalRef.current = window.setInterval(() => {
        if (analyserRef.current && dataArrayRef.current && !isMuted) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          
          // Set speaking state based on volume threshold (adjusted for better sensitivity)
          setIsSpeaking(average > 15);
        } else {
          setIsSpeaking(false);
        }
      }, 100); // Check every 100ms for more responsive visualization
      
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
    }
  };
  
  const toggleMute = () => {
    if (!isSpeaker) return; // Only speakers can toggle mute
    
    const newMutedState = webRTCService.toggleMute();
    setIsMuted(newMutedState);
    return newMutedState;
  };
  
  return {
    isMuted,
    toggleMute,
    participants,
    isConnecting,
    isSpeaking
  };
};

export default useWebRTC;
