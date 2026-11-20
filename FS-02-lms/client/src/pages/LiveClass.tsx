import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useGetLiveKitTokenQuery, useGetLiveClassQuery, useGetChatHistoryQuery, useAddChatMessageMutation } from '../features/live-class/api';
import { useAuth } from '../features/auth';

export default function LiveClass() {
  const { liveClassId } = useParams<{ liveClassId: string }>();
  const { accessToken } = useAuth();
  const [joined, setJoined] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; userName: string; message: string; sentAt: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<Array<{ identity: string; name: string; isHost: boolean }>>([]);
  const [roomJoined, setRoomJoined] = useState(false);

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useGetLiveKitTokenQuery(liveClassId ?? '', { skip: !liveClassId });
  const { data: liveClass } = useGetLiveClassQuery(liveClassId ?? '', { skip: !liveClassId });
  const { data: chatHistory } = useGetChatHistoryQuery(liveClassId ?? '', { skip: !liveClassId });
  const [addChatMessage] = useAddChatMessageMutation();

  useEffect(() => {
    if (chatHistory) {
      setChatMessages(chatHistory.map((msg) => ({
        id: msg.id,
        userName: msg.userName,
        message: msg.message,
        sentAt: msg.createdAt,
      })));
    }
  }, [chatHistory]);

  useEffect(() => {
    if (!accessToken) return;
  }, [accessToken]);

  const joinRoom = async () => {
    if (!tokenData || !liveClassId) return;

    // Simulate joining a room
    setJoined(true);
    setRoomJoined(true);
    setParticipants([
      { identity: 'local', name: 'You', isHost: tokenData.role === 'host' },
      { identity: 'remote-1', name: 'Student 1', isHost: false },
      { identity: 'remote-2', name: 'Student 2', isHost: false },
    ]);

    // In a real implementation, this would connect to LiveKit:
    // const room = new Room({ adaptiveStream: true, dynacast: true });
    // await room.connect(tokenData.url, tokenData.token);
    // Set up event handlers for TrackSubscribed, ParticipantConnected, etc.
    // await room.localParticipant.setCameraEnabled(true);
    // await room.localParticipant.setMicrophoneEnabled(true);
  };

  const leaveRoom = async () => {
    setJoined(false);
    setRoomJoined(false);
    setParticipants([]);
    // In a real implementation: await room.disconnect();
  };

  const toggleVideo = async () => {
    setLocalVideoEnabled(!localVideoEnabled);
    // In a real implementation: await room.localParticipant.setCameraEnabled(!localVideoEnabled);
  };

  const toggleAudio = async () => {
    setLocalAudioEnabled(!localAudioEnabled);
    // In a real implementation: await room.localParticipant.setMicrophoneEnabled(!localAudioEnabled);
  };

  const toggleScreenShare = async () => {
    setScreenSharing(!screenSharing);
    // In a real implementation: await room.localParticipant.setScreenShareEnabled(!screenSharing);
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim()) return;
    const message = newMessage;
    setNewMessage('');

    // In a real implementation:
    // room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'chat', message })), { reliable: true });

    try {
      await addChatMessage({ liveClassId: liveClassId!, message }).unwrap();
    } catch (err) {
      console.error('Failed to persist chat message:', err);
    }

    setChatMessages((prev) => [...prev, {
      id: Date.now().toString(),
      userName: 'You',
      message,
      sentAt: new Date().toISOString(),
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  useEffect(() => {
    if (chatHistory) {
      setChatMessages(chatHistory.map((msg) => ({
        id: msg.id,
        userName: msg.userName,
        message: msg.message,
        sentAt: msg.createdAt,
      })));
    }
  }, [chatHistory]);

  useEffect(() => {
    return () => {
      if (roomJoined) leaveRoom();
    };
  }, []);

  if (tokenLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-600">Failed to get LiveKit token. LiveKit may not be configured.</p>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-500">LiveKit not configured. Please check server configuration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{liveClass?.title || 'Live Class'}</h1>
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 text-xs rounded-full ${joined ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {joined ? 'Live' : 'Not Joined'}
          </span>
          {!joined && (
            <button onClick={joinRoom} className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700">
              Join Class
            </button>
          )}
          {joined && (
            <button onClick={leaveRoom} className="px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700">
              Leave
            </button>
          )}
        </div>
      </div>

      <div className="aspect-video bg-black rounded-lg mb-6 relative flex items-center justify-center">
        {joined ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 opacity-50" />
            <div className="relative z-10 text-center text-white">
              <div className="text-4xl mb-4">🎥</div>
              <h2 className="text-2xl font-bold mb-2">Live Session Active</h2>
              <p className="text-gray-300">LiveKit video feed would appear here</p>
              <div className="mt-4 flex justify-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm ${localVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                  📹 {localVideoEnabled ? 'On' : 'Off'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${localAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                  🎤 {localAudioEnabled ? 'On' : 'Off'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${screenSharing ? 'bg-green-500' : 'bg-gray-500'}`}>
                  🖥 {screenSharing ? 'Sharing' : 'Off'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-white">
            <div className="text-4xl mb-4">🎥</div>
            <h2 className="text-2xl font-bold mb-2">Live Class: {liveClass?.title || 'Session'}</h2>
            <p className="text-gray-300">Click "Join Class" to enter the live session</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Chat</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleVideo}
                disabled={!joined}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${localVideoEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'} disabled:opacity-50`}
              >
                📹 Video
              </button>
              <button
                onClick={toggleAudio}
                disabled={!joined}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${localAudioEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'} disabled:opacity-50`}
              >
                🎤 Audio
              </button>
              <button
                onClick={toggleScreenShare}
                disabled={!joined}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${screenSharing ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'} disabled:opacity-50`}
              >
                🖥 Screen
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">No messages yet</div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex space-x-2">
                  <span className="font-medium text-gray-900">{msg.userName}:</span>
                  <span className="text-gray-700">{msg.message}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(msg.sentAt).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={joined ? "Type a message..." : "Join the class to chat"}
              disabled={!joined}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            />
            <button onClick={sendChatMessage} disabled={!joined} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
              Send
            </button>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants ({participants.length})</h2>
          <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
            {participants.map((p) => (
              <li key={p.identity} className="flex items-center text-sm text-gray-700">
                <span className={`w-2 h-2 rounded-full mr-2 ${p.isHost ? 'bg-purple-500' : 'bg-green-500'}`} />
                {p.name} {p.isHost && <span className="ml-2 text-xs text-purple-600 font-medium">(Host)</span>}
              </li>
            ))}
            {participants.length === 0 && (
              <li className="text-sm text-gray-500 text-center py-4">Join the class to see participants</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}