import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddFamilyMemberModal from '../components/AddFamilyMemberModal';
import DeleteFamilyMemberModal from '../components/DeleteFamilyMemberModal';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import AIChat from '../components/AIChat';

// Helper function to get initials from full name
const getInitials = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return 'U';
  const names = fullName.trim().split(/\s+/);
  return names
    .slice(0, 2) // Take first two names (e.g., "John Doe" -> "JD")
    .map(name => name.charAt(0).toUpperCase())
    .join('');
};

// --- Reusable Components ---
const ProfileIcon = ({ user, onProfileClick }) => (
  <div className="relative">
    <button
      onClick={onProfileClick}
      className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
    >
      <img
        className="h-10 w-10 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
        src={
          user?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            getInitials(user?.fullName)
          )}&background=60A5FA&color=fff&size=128&font-size=0.5&bold=true`
        }
        alt={user?.fullName || 'Profile'}
      />
      <span className="text-sm font-semibold text-gray-700 hidden md:block pr-2">{user?.fullName || 'My Profile'}</span>
    </button>
  </div>
);

const AddFamilyMemberButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out flex items-center justify-center space-x-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
    </svg>
    <span>Add Family Member</span>
  </button>
);

const FamilyChatArea = ({ familyChatId, currentUser }) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log('Socket connected:', isConnected);
    console.log('FamilyChatId:', familyChatId);
    console.log('Messages:', messages);
  }, [messages, familyChatId, isConnected]);

  useEffect(scrollToBottom, [messages]);

  // Fetch messages when component mounts or chatId changes
  useEffect(() => {
    if (!familyChatId || !currentUser?.token) return;
    
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/chat/${familyChatId}/messages`, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
        console.log('Fetched messages:', response.data);
        setMessages(response.data || []);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    
    fetchMessages();
  }, [familyChatId, currentUser?.token]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected || !familyChatId) return;
    
    console.log('Setting up socket events for chat:', familyChatId);
    
    // Join the chat room
    socket.emit('join chat', familyChatId);
    
    // Handle new message received
    const messageReceivedHandler = (newMessageReceived) => {
      console.log('Received message via socket:', newMessageReceived);
      if (newMessageReceived.chat === familyChatId) {
        setMessages((prevMessages) => {
          // Check if message already exists to avoid duplicates
          const messageExists = prevMessages.some(msg => msg._id === newMessageReceived._id);
          if (!messageExists) {
            return [...prevMessages, newMessageReceived];
          }
          return prevMessages;
        });
      }
    };
    
    // Handle message edited
    const messageEditedHandler = (editedMessage) => {
      console.log('Message edited via socket:', editedMessage);
      if (editedMessage.chat === familyChatId) {
        setMessages((prevMessages) =>
          prevMessages.map(msg => 
            msg._id === editedMessage._id ? editedMessage : msg
          )
        );
      }
    };
    
    // Handle typing indicators
    const typingHandler = (room) => {
      if (room === familyChatId) {
        setIsTyping(true);
      }
    };
    
    const stopTypingHandler = (room) => {
      if (room === familyChatId) {
        setIsTyping(false);
      }
    };
    
    // Add event listeners
    socket.on('message received', messageReceivedHandler);
    socket.on('message edited', messageEditedHandler);
    socket.on('typing', typingHandler);
    socket.on('stop typing', stopTypingHandler);
    
    // Cleanup function
    return () => {
      socket.off('message received', messageReceivedHandler);
      socket.off('message edited', messageEditedHandler);
      socket.off('typing', typingHandler);
      socket.off('stop typing', stopTypingHandler);
    };
  }, [socket, isConnected, familyChatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket || !isConnected || !familyChatId) return;
    
    // Stop typing indicator
    if (typing) {
      socket.emit('stop typing', familyChatId);
      setTyping(false);
    }
    
    try {
      console.log('Sending message:', newMessage, 'to chat:', familyChatId);
      
      const { data: sentMessage } = await axios.post('/api/chat/message',
        { content: newMessage, chatId: familyChatId },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      
      console.log('Message sent successfully:', sentMessage);
      
      // Add message to local state immediately for instant feedback
      setMessages((prevMessages) => {
        const messageExists = prevMessages.some(msg => msg._id === sentMessage._id);
        if (!messageExists) {
          return [...prevMessages, sentMessage];
        }
        return prevMessages;
      });
      
      // Emit socket event for real-time delivery to other users
      socket.emit('new message', sentMessage);
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    if (!newContent.trim() || !socket || !isConnected || !familyChatId) return;
    
    try {
      const { data: editedMessage } = await axios.put(`/api/chat/${familyChatId}/messages/${messageId}`,
        { content: newContent },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      
      // Update local state immediately
      setMessages((prevMessages) =>
        prevMessages.map(msg => 
          msg._id === editedMessage._id ? editedMessage : msg
        )
      );
      
      // Emit socket event for real-time update to other users
      socket.emit('edit message', editedMessage);
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  const typingTimeoutRef = useRef(null);
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!socket || !isConnected) return;
    
    if (!typing) {
      setTyping(true);
      socket.emit('typing', familyChatId);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop typing', familyChatId);
      setTyping(false);
    }, 3000);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  const startEdit = (message) => {
    setEditingMessageId(message._id);
    setEditText(message.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const submitEdit = () => {
    if (editingMessageId && editText.trim()) {
      handleEditMessage(editingMessageId, editText);
      setEditingMessageId(null);
      setEditText('');
    }
  };

  return (
    <div className="bg-white h-full flex-grow p-6 border border-gray-200 rounded-xl shadow-lg flex flex-col min-h-[400px]">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h3 className="text-2xl font-semibold text-gray-800">Family Chat</h3>
        {isTyping && <span className="text-sm text-indigo-600 animate-pulse">(Someone is typing...)</span>}
      </div>
      <div className="flex-grow overflow-y-auto bg-slate-50 p-4 rounded-lg mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mb-3 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              role="img"
              aria-label="Empty chat icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
            </svg>
            <p className="text-lg">No messages yet.</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Ensure sender information is available
            const senderName = msg.sender?.fullName || msg.sender?.name || 'Unknown User';
            const senderId = msg.sender?._id || msg.sender;
            const isOwnMessage = senderId === currentUser?._id;
            
            return (
              <div
                key={msg._id}
                className={`flex items-start space-x-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwnMessage && (
                  <img
                    src={
                      msg.sender?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        getInitials(senderName)
                      )}&background=60A5FA&color=fff&size=128&font-size=0.5&bold=true`
                    }
                    alt={senderName}
                    className="h-8 w-8 rounded-full object-cover border-2 border-indigo-500 mt-2"
                  />
                )}
                <div
                  className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-md ${isOwnMessage
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold">{senderName}</p>
                    {msg.isEdited && <span className="text-xs opacity-70 ml-2">(edited)</span>}
                  </div>
                  {editingMessageId === msg._id ? (
                    <div className="my-1">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 text-sm text-gray-800 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500"
                        rows="2"
                      />
                      <div className="text-right mt-2 space-x-2">
                        <button
                          onClick={cancelEdit}
                          className="text-xs px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitEdit}
                          className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs opacity-80">{formatTimestamp(msg.createdAt)}</p>
                    {isOwnMessage && editingMessageId !== msg._id && (
                      <button
                        onClick={() => startEdit(msg)}
                        className="ml-3 text-xs opacity-60 hover:opacity-100 hover:text-indigo-200 transition-opacity"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {isOwnMessage && (
                  <img
                    src={
                      msg.sender?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        getInitials(senderName)
                      )}&background=60A5FA&color=fff&size=32&font-size=0.5&bold=true`
                    }
                    alt={senderName}
                    className="h-8 w-8 rounded-full object-cover border-2 border-indigo-500 mt-2 ml-2"
                  />
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-auto flex items-center space-x-3 p-1 bg-gray-100 rounded-xl border border-gray-200">
        <input
          type="text"
          placeholder="Type your message here..."
          value={newMessage}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSendMessage(), e.preventDefault())}
          className="flex-grow p-3 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !newMessage.trim()}
          className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 16.571V11a1 1 0 112 0v5.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyChatId, setFamilyChatId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);

  // Socket event handlers for family member updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleFamilyMemberAdded = (data) => {
      console.log('Family member added via socket:', data);
      setFamilyMembers(prev => {
        if (!Array.isArray(prev)) prev = [];
        const exists = prev.some(member => member._id === data._id);
        if (!exists) {
          return [...prev, data];
        }
        return prev;
      });
    };

    const handleFamilyMemberDeleted = (data) => {
      console.log('Family member deleted via socket:', data);
      setFamilyMembers(prev => prev.filter(member => member._id !== data.memberId));
    };

    socket.on('family member added', handleFamilyMemberAdded);
    socket.on('family member deleted', handleFamilyMemberDeleted);

    return () => {
      socket.off('family member added', handleFamilyMemberAdded);
      socket.off('family member deleted', handleFamilyMemberDeleted);
    };
  }, [socket, isConnected]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    if (!currentUser?.token) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // Fetch family members
        const familyResponse = await axios.get('/api/users/family-members', {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
        setFamilyMembers(familyResponse.data.familyMembers || []);

        // Fetch or create family chat
        const chatResponse = await axios.get('/api/chat', {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
        
        if (chatResponse.data && chatResponse.data._id) {
          setFamilyChatId(chatResponse.data._id);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (error.response?.status === 401) {
          logout();
          navigate('/login');
        }
      }
    };

    fetchDashboardData();
  }, [currentUser, navigate, logout]);

  const handleLogout = () => {
    if (socket && isConnected) {
      socket.disconnect();
    }
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  if (authLoading || !currentUser || !currentUser.isProfileComplete) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-lg">Loading...</p></div>;
  }

  if (!familyChatId && currentUser && currentUser.isProfileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <p className="text-lg text-gray-700">Loading chat information...</p>
          <p className="text-sm text-gray-500 mt-2">If this persists, there might be an issue finding your family chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-indigo-600">HealthChat</h1>
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
                <span>•</span>
                <span>Family Dashboard</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* AI Chat Toggle Button */}
              <button
                onClick={() => setShowAIChat(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
              
              <ProfileIcon user={currentUser} onProfileClick={handleProfileClick} />
              
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-6 lg:p-8">
        {familyChatId ? (
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 h-[calc(100vh-110px)]">
            <aside className="w-full md:w-1/3 lg:w-1/4 bg-white p-6 rounded-xl shadow-xl flex flex-col space-y-6 custom-scrollbar overflow-y-auto">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-5 border-b pb-3">Family Circle</h2>
                <AddFamilyMemberButton onClick={() => setShowAddModal(true)} />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-semibold text-gray-700 mb-4 sticky top-0 bg-white py-2">Members</h3>
                {familyMembers.length > 0 ? (
                  <ul className="space-y-3">
                    {familyMembers.map(member => (
                      <li
                        key={member._id}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:shadow-sm transition-all duration-150 border border-slate-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{member.fullName}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                            {member.relation && (
                              <p className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full inline-block mt-1">
                                {member.relation}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(member);
                              setShowDeleteModal(true);
                            }}
                            className={`ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200 ${
                              currentUser.role === 'patient' ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : 'hidden'
                            }`}
                            title="Delete family member"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No family members yet.</p>
                    <p className="text-xs text-gray-400">Click "Add Family Member" to invite them.</p>
                  </div>
                )}
              </div>
            </aside>

            <section className="w-full md:w-2/3 lg:w-3/4 flex flex-col">
              <FamilyChatArea familyChatId={familyChatId} currentUser={currentUser} />
            </section>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-10 bg-white p-10 rounded-xl shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-indigo-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M7.5 12h9M7.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-xl font-semibold text-gray-700">Loading Chat...</p>
              <p className="text-sm text-gray-500 mt-1">If this persists, please try refreshing the page.</p>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <AddFamilyMemberModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onMemberAdded={(newMember) => {
            console.log('handleMemberAdded called with newMember:', newMember);
            setShowAddModal(false);
            console.log(`Successfully added ${newMember.fullName} to your family circle!`);
          }}
        />
      )}

      {showDeleteModal && selectedMember && (
        <DeleteFamilyMemberModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedMember(null);
          }}
          onMemberDeleted={(deletedMemberId) => {
            console.log('handleMemberDeleted called with deletedMemberId:', deletedMemberId);
            setShowDeleteModal(false);
            console.log('Family member deleted successfully!');
          }}
          member={selectedMember}
        />
      )}

      {showAIChat && (
        <AIChat onClose={() => setShowAIChat(false)} />
      )}
    </div>
  );
};

export default DashboardPage;