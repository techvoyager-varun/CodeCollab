'use client';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';

export default function VoiceManager({ socket, roomId, currentUser }) {
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [peers, setPeers] = useState([]); // Array of peer users in voice
  const [screenShareUser, setScreenShareUser] = useState(null); // User who is currently screen sharing
  const [remoteScreenStream, setRemoteScreenStream] = useState(null); // Stream for remote screen sharing

  const toast = useToast();
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcsRef = useRef({}); // targetSocketId -> RTCPeerConnection
  const audiosRef = useRef({}); // targetSocketId -> HTMLAudioElement
  const screenVideoRef = useRef(null);

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Safe side effect to bind incoming video stream to video DOM element ref once mounted
  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = remoteScreenStream;
    }
  }, [remoteScreenStream]);

  // Toggle voice room join/leave
  const toggleVoice = async () => {
    if (inVoice) {
      leaveVoiceRoom();
    } else {
      await joinVoiceRoom();
    }
  };

  // Toggle microphone mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Join Voice Room and start WebRTC peer discovery
  const joinVoiceRoom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInVoice(true);
      setIsMuted(false);
      socket.emit('webrtc-join-voice');
      toast.success('Joined voice room');
    } catch (err) {
      console.error('Failed to get local stream', err);
      toast.error('Could not access microphone');
    }
  };

  // Leave voice room and close all peer connections
  const leaveVoiceRoom = () => {
    socket.emit('webrtc-leave-voice');
    
    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    stopScreenShare();

    // Close all peer connections
    Object.keys(pcsRef.current).forEach(socketId => {
      pcsRef.current[socketId].close();
    });
    pcsRef.current = {};

    // Remove all remote audios
    Object.keys(audiosRef.current).forEach(socketId => {
      audiosRef.current[socketId].remove();
    });
    audiosRef.current = {};

    setInVoice(false);
    setIsMuted(false);
    setPeers([]);
    setScreenShareUser(null);
    setRemoteScreenStream(null);
    toast.success('Left voice room');
  };

  // Start screen share
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      setIsSharingScreen(true);

      const videoTrack = stream.getVideoTracks()[0];

      // Send screen share start event
      socket.emit('webrtc-signal', {
        targetSocketId: 'all',
        signal: { type: 'screen-share-start', senderName: currentUser?.username }
      });

      // Add screen track to all peer connections
      Object.keys(pcsRef.current).forEach(socketId => {
        const pc = pcsRef.current[socketId];
        const senders = pc.getSenders();
        const screenSender = senders.find(s => s.track && s.track.kind === 'video');
        if (screenSender) {
          screenSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, stream);
        }
        
        // Renegotiate
        createAndSendOffer(socketId);
      });

      // Handle stream end (user clicks browser "Stop Sharing")
      videoTrack.onended = () => {
        stopScreenShare();
      };

      toast.success('Started screen sharing');
    } catch (err) {
      console.error('Failed to start screen share', err);
      toast.error('Screen sharing cancelled');
    }
  };

  // Stop screen share
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsSharingScreen(false);

    // Remove video track from all peer connections
    Object.keys(pcsRef.current).forEach(socketId => {
      const pc = pcsRef.current[socketId];
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        pc.removeTrack(videoSender);
        createAndSendOffer(socketId);
      }
    });

    socket.emit('webrtc-signal', {
      targetSocketId: 'all',
      signal: { type: 'screen-share-stop' }
    });
  };

  // Create Peer Connection
  const createPeerConnection = (targetSocketId, userObj) => {
    if (pcsRef.current[targetSocketId]) return pcsRef.current[targetSocketId];

    const pc = new RTCPeerConnection(iceConfig);
    pcsRef.current[targetSocketId] = pc;

    // Send local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getVideoTracks().forEach(track => {
        pc.addTrack(track, screenStreamRef.current);
      });
    }

    // Ice Candidate callback
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-signal', {
          targetSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Receive Remote Streams
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const track = event.track;

      if (track.kind === 'audio') {
        let audio = audiosRef.current[targetSocketId];
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audiosRef.current[targetSocketId] = audio;
          document.body.appendChild(audio);
        }
        audio.srcObject = remoteStream;
      } else if (track.kind === 'video') {
        // Screen share video stream
        setScreenShareUser(userObj?.username || 'Peer');
        setRemoteScreenStream(remoteStream);
      }
    };

    return pc;
  };

  const createAndSendOffer = async (targetSocketId) => {
    const pc = pcsRef.current[targetSocketId];
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-signal', {
        targetSocketId,
        signal: { sdp: offer }
      });
    } catch (err) {
      console.error('Failed to create offer', err);
    }
  };

  // Setup sockets
  useEffect(() => {
    if (!socket) return;

    // Receive peer list on joining
    socket.on('webrtc-voice-peers', (peersList) => {
      setPeers(peersList);
      peersList.forEach(peer => {
        const pc = createPeerConnection(peer.socketId, peer);
        createAndSendOffer(peer.socketId);
      });
    });

    // New peer joined
    socket.on('webrtc-peer-joined', (peer) => {
      setPeers(prev => {
        if (prev.find(p => p.socketId === peer.socketId)) return prev;
        return [...prev, peer];
      });
      createPeerConnection(peer.socketId, peer);
    });

    // Receive signaling signal (SDP or Candidate)
    socket.on('webrtc-signal', async ({ senderSocketId, signal }) => {
      // Find sender info
      const senderUser = peers.find(p => p.socketId === senderSocketId);
      
      if (signal.type === 'screen-share-start') {
        setScreenShareUser(signal.senderName);
        return;
      }
      if (signal.type === 'screen-share-stop') {
        setScreenShareUser(null);
        setRemoteScreenStream(null);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null;
        }
        return;
      }

      let pc = pcsRef.current[senderSocketId];
      if (!pc) {
        pc = createPeerConnection(senderSocketId, senderUser);
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-signal', {
              targetSocketId: senderSocketId,
              signal: { sdp: answer }
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    // Peer left voice
    socket.on('webrtc-peer-left', ({ socketId }) => {
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
      
      if (pcsRef.current[socketId]) {
        pcsRef.current[socketId].close();
        delete pcsRef.current[socketId];
      }
      if (audiosRef.current[socketId]) {
        audiosRef.current[socketId].remove();
        delete audiosRef.current[socketId];
      }
    });

    return () => {
      socket.off('webrtc-voice-peers');
      socket.off('webrtc-peer-joined');
      socket.off('webrtc-signal');
      socket.off('webrtc-peer-left');
    };
  }, [socket, peers]);

  // Handle room exit unmount cleanup
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      Object.keys(pcsRef.current).forEach(id => pcsRef.current[id].close());
      Object.keys(audiosRef.current).forEach(id => audiosRef.current[id].remove());
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 p-2 border-t border-brand-border" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Join Call button */}
          <button
            onClick={toggleVoice}
            className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-sm border cursor-pointer transition-colors
              ${inVoice 
                ? 'border-brand-error text-brand-error bg-brand-error/10 hover:bg-brand-error/20' 
                : 'border-brand-success text-brand-success bg-brand-success/10 hover:bg-brand-success/20'
              }`}
            style={inVoice 
              ? { borderColor: 'var(--error)', color: 'var(--error)' } 
              : { borderColor: 'var(--success)', color: 'var(--success)' }
            }
          >
            {inVoice ? 'Disconnect Voice' : '🎙 Join Voice Call'}
          </button>

          {/* Mute button */}
          {inVoice && (
            <button
              onClick={toggleMute}
              className={`px-2 py-1 text-[10px] font-mono border rounded-sm cursor-pointer transition-colors
                ${isMuted 
                  ? 'border-brand-error text-brand-error hover:bg-brand-error/10' 
                  : 'border-brand-border text-brand-text2 hover:text-brand-text1'
                }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? '🔇 Muted' : '🎙 Mic ON'}
            </button>
          )}

          {/* Screen Share button */}
          {inVoice && (
            <button
              onClick={isSharingScreen ? stopScreenShare : startScreenShare}
              className={`px-2 py-1 text-[10px] font-mono border rounded-sm cursor-pointer transition-colors
                ${isSharingScreen 
                  ? 'border-brand-accent text-brand-accent hover:bg-brand-accentMuted' 
                  : 'border-brand-border text-brand-text2 hover:text-brand-text1'
                }`}
              style={isSharingScreen ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
            >
              {isSharingScreen ? '🖥 Stop Share' : '🖥 Share Screen'}
            </button>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-1.5">
          {inVoice && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" style={{ backgroundColor: 'var(--success)' }} />
              <span className="text-[9px] text-brand-text3 font-mono">In Voice ({peers.length + 1})</span>
            </div>
          )}
        </div>
      </div>

      {/* Screen Share Video Stream Panel */}
      {screenShareUser && (
        <div className="mt-2 relative rounded overflow-hidden border border-brand-border bg-black aspect-video flex flex-col justify-end">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            controls
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono rounded text-white bg-black/60 backdrop-blur-sm">
            🖥 {screenShareUser}'s Screen Share
          </div>
        </div>
      )}
    </div>
  );
}
