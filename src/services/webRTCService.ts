
// Simple WebRTC service for voice communication
type PeerConnection = RTCPeerConnection;

export interface WebRTCParticipant {
  id: string;
  stream?: MediaStream;
  connection?: PeerConnection;
  audioTrack?: MediaStreamTrack;
}

class WebRTCService {
  private localStream: MediaStream | null = null;
  private participants: Map<string, WebRTCParticipant> = new Map();
  private isMuted: boolean = true;
  private onParticipantAddedCallbacks: ((participant: WebRTCParticipant) => void)[] = [];
  private onParticipantRemovedCallbacks: ((participantId: string) => void)[] = [];
  private onMuteChangedCallbacks: ((isMuted: boolean) => void)[] = [];
  private peerConnectionConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };
  private isInitialized: boolean = false;

  constructor() {
    // Don't initialize immediately, wait for joinRoom
  }

  private async initLocalStream() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing local media stream');
      // Request audio with advanced constraints for better quality
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      // Start with muted audio
      this.setMuted(true);
      this.isInitialized = true;
      
      console.log('Local stream initialized successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Could not access microphone');
    }
  }

  public async joinRoom(roomId: string, userId: string, isSpeaker: boolean) {
    console.log(`Joining room ${roomId} as ${isSpeaker ? 'speaker' : 'listener'}`);
    
    if (isSpeaker) {
      try {
        await this.initLocalStream();
        // Connect to peer server and other participants
        this.setupPeerConnections(roomId, userId);
      } catch (error) {
        console.error("Error joining room as speaker:", error);
        throw error;
      }
    } else {
      console.log('Joined as listener, not initializing audio');
    }
  }

  private setupPeerConnections(roomId: string, userId: string) {
    // In a real implementation, we would set up connections to all existing participants
    // For simplicity in this demo, we'll simulate connecting with some mock participants
    console.log('Setting up peer connections for room:', roomId);

    // Clear any existing connections
    this.participants.forEach((_, id) => {
      this.removeParticipant(id);
    });

    // In a real implementation, we would fetch existing participants from the signaling server
    // and establish connections with them
  }

  public createPeerConnection(participantId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection(this.peerConnectionConfig);
    
    // Add local stream tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          peerConnection.addTrack(track, this.localStream);
        }
      });
    }
    
    // Set up event handlers for the peer connection
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real implementation, we would send this to our signaling server
        console.log('ICE candidate generated', event.candidate);
      }
    };
    
    peerConnection.ontrack = (event) => {
      console.log('Track received from peer', event.track);
      
      const participant = this.participants.get(participantId);
      if (participant) {
        if (!participant.stream) {
          participant.stream = new MediaStream();
        }
        participant.stream.addTrack(event.track);
        participant.audioTrack = event.track;
        this.participants.set(participantId, participant);
        this.notifyParticipantAdded(participant);
      }
    };
    
    return peerConnection;
  }

  public addParticipant(participantId: string): WebRTCParticipant {
    if (this.participants.has(participantId)) {
      return this.participants.get(participantId)!;
    }
    
    const participant: WebRTCParticipant = {
      id: participantId,
      connection: this.createPeerConnection(participantId)
    };
    
    this.participants.set(participantId, participant);
    this.notifyParticipantAdded(participant);
    return participant;
  }

  public removeParticipant(participantId: string) {
    if (!this.participants.has(participantId)) return;
    
    const participant = this.participants.get(participantId)!;
    
    if (participant.connection) {
      participant.connection.close();
    }
    
    if (participant.stream) {
      participant.stream.getTracks().forEach(track => track.stop());
    }
    
    this.participants.delete(participantId);
    this.notifyParticipantRemoved(participantId);
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
        console.log(`Setting local audio track to ${track.enabled ? 'enabled' : 'disabled'}`);
      });
    }
    
    this.notifyMuteChanged(muted);
  }

  public isMicrophoneMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    const newMutedState = !this.isMuted;
    this.setMuted(newMutedState);
    return newMutedState;
  }

  public leaveRoom() {
    // Clean up all connections
    this.participants.forEach((participant, id) => {
      this.removeParticipant(id);
    });
    
    // Keep the local stream but mute it
    if (this.localStream) {
      this.setMuted(true);
    }
    
    console.log('Left room and cleaned up resources');
  }
  
  // Observer pattern methods
  public onParticipantAdded(callback: (participant: WebRTCParticipant) => void) {
    this.onParticipantAddedCallbacks.push(callback);
  }
  
  public onParticipantRemoved(callback: (participantId: string) => void) {
    this.onParticipantRemovedCallbacks.push(callback);
  }
  
  public onMuteChanged(callback: (isMuted: boolean) => void) {
    this.onMuteChangedCallbacks.push(callback);
  }
  
  private notifyParticipantAdded(participant: WebRTCParticipant) {
    this.onParticipantAddedCallbacks.forEach(callback => callback(participant));
  }
  
  private notifyParticipantRemoved(participantId: string) {
    this.onParticipantRemovedCallbacks.forEach(callback => callback(participantId));
  }
  
  private notifyMuteChanged(isMuted: boolean) {
    this.onMuteChangedCallbacks.forEach(callback => callback(isMuted));
  }
}

// Singleton instance
export const webRTCService = new WebRTCService();
export default webRTCService;
