import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import AddFamilyMemberModal from '../components/AddFamilyMemberModal'; // Import the modal
import { useSocket } from '../context/SocketContext'; // Added useSocket
import axios from 'axios'; // Added axios

// --- Reusable Components (can be moved to /components later) ---
const ProfileIcon = ({ user, onProfileClick }) => (
  <div className="relative">
    <button
      onClick={onProfileClick}
      className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
    >
      <img
        className="h-10 w-10 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=60A5FA&color=fff&size=128&font-size=0.5&bold=true`}
        alt={user?.name || 'Profile'}
      />
      <span className="text-sm font-semibold text-gray-700 hidden md:block pr-2">{user?.name || 'My Profile'}</span>
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
  const [isTyping, setIsTyping] = useState(false); // Other user is typing
  // const [typingUser, setTypingUser] = useState(''); // Name of the user typing - Commented out as unused for now
  const messagesEndRef = useRef(null); // For scrolling to bottom

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);


  // Fetch initial messages
  useEffect(() => {
    if (!familyChatId || !currentUser?.token) return;

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/message/${familyChatId}`, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
        setMessages(response.data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        // Handle error (e.g., show a message to the user)
      }
    };
    fetchMessages();
  }, [familyChatId, currentUser?.token]);


  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join chat', familyChatId); // Join the specific chat room

    const messageReceivedHandler = (newMessageReceived) => {
      // Ensure message is for the current chat
      if (!familyChatId || newMessageReceived.chat._id !== familyChatId) return;
      setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
    };
    
    const messageEditedHandler = (editedMessage) => {
      if (!familyChatId || editedMessage.chat._id !== familyChatId) return;
      setMessages((prevMessages) =>
        prevMessages.map(msg => msg._id === editedMessage._id ? editedMessage : msg)
      );
    };

    const typingHandler = (room /*, userName */) => { // userName could be passed from backend
      if (room === familyChatId) {
        setIsTyping(true);
        // setTypingUser(userName);
      }
    };
    const stopTypingHandler = (room) => {
      if (room === familyChatId) {
        setIsTyping(false);
        // setTypingUser('');
      }
    };

    socket.on('message received', messageReceivedHandler);
    socket.on('message edited', messageEditedHandler);
    socket.on('typing', typingHandler);
    socket.on('stop typing', stopTypingHandler);

    return () => {
      socket.off('message received', messageReceivedHandler);
      socket.off('message edited', messageEditedHandler);
      socket.off('typing', typingHandler);
      socket.off('stop typing', stopTypingHandler);
      // Optionally, emit 'leave chat' if needed
    };
  }, [socket, isConnected, familyChatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socket || !isConnected) return;

    // Stop typing event
    if (typing) {
        socket.emit('stop typing', familyChatId);
        setTyping(false);
    }

    try {
      // API call to save message to DB
      const { data: sentMessage } = await axios.post('/api/message',
        { content: newMessage, chatId: familyChatId },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      
      // Emit message via socket
      socket.emit('new message', sentMessage);
      
      // Add to local messages for immediate feedback (optimistic update, though API call is awaited)
      // setMessages((prevMessages) => [...prevMessages, sentMessage]); // Already handled by socket 'message received' if sender also gets it
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send message:", error);
      // Handle error (e.g., show a message to the user)
    }
  };
  
  const handleEditMessage = async (messageId, newContent) => {
    if (!newContent.trim() || !socket || !isConnected) return;
    try {
        const { data: editedMessage } = await axios.put(`/api/message/${messageId}`,
            { content: newContent },
            { headers: { Authorization: `Bearer ${currentUser.token}` } }
        );
        socket.emit('edit message', editedMessage);
        // UI update will be handled by 'message edited' socket event
    } catch (error) {
        console.error("Failed to edit message:", error);
    }
  };

  // Typing indicator logic
  const typingTimeoutRef = useRef(null);
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !isConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit('typing', familyChatId);
    }
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop typing', familyChatId);
      setTyping(false);
    }, 3000); // 3 seconds of inactivity
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Placeholder for editing UI state
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
    }
    cancelEdit();
  };


  return (
    <div className="bg-white h-full flex-grow p-6 border border-gray-200 rounded-xl shadow-lg flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h3 className="text-2xl font-semibold text-gray-800">
          Family Chat
        </h3>
        {isTyping && <span className="text-sm text-indigo-600 animate-pulse">(Someone is typing...)</span>}
      </div>
      <div className="flex-grow overflow-y-auto bg-slate-50 p-4 rounded-lg mb-4 space-y-4 custom-scrollbar">
        {messages.length === 0 &&
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-lg">No messages yet.</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        }
        {messages.map((msg) => (
          <div key={msg._id} className={`flex ${msg.sender._id === currentUser?._id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-md ${msg.sender._id === currentUser?._id ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold">{msg.sender.name}</p>
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
                        <button onClick={cancelEdit} className="text-xs px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors">Cancel</button>
                        <button onClick={submitEdit} className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors">Save</button>
                    </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs opacity-80">{formatTimestamp(msg.createdAt)}</p>
                {msg.sender._id === currentUser?._id && editingMessageId !== msg._id && (
                    <button onClick={() => startEdit(msg)} className="ml-3 text-xs opacity-60 hover:opacity-100 hover:text-indigo-200 transition-opacity">
                        Edit
                    </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* For auto-scrolling */}
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
// --- End Reusable Components ---


const DashboardPage = () => {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket(); // Get socket status
  const navigate = useNavigate();
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null); // Store the active family chat ID

  // Effect for initial setup and fetching user/chat data
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate('/login', { state: { message: "Please log in." } });
    } else if (currentUser) {
      if (!currentUser.isProfileComplete) {
        navigate('/profile', { state: { message: 'Please complete your profile.' } });
      } else {
        // User is logged in and profile is complete
        // Fetch family members and determine the primary family chat
        const fetchDashboardData = async () => {
          try {
            // Fetch user profile again to get latest family members and chat info
            // This could be optimized if AuthContext already holds fully populated user
            const profileRes = await axios.get('/api/users/profile', {
              headers: { Authorization: `Bearer ${currentUser.token}` },
            });
            const updatedUser = profileRes.data;
            // Update family members list (assuming they are populated with 'name')
            if (updatedUser.familyMembers) {
                setFamilyMembers(updatedUser.familyMembers);
            }

            // Determine the primary family chat ID
            // This logic assumes the user has one main family chat.
            // The backend's login/register response includes `familyChatId`.
            // We can also try to find it if not directly available.
            if (currentUser.familyChatId) {
                setActiveChatId(currentUser.familyChatId);
            } else {
                // Fallback: try to find a chat where this user is admin or member
                const chatsRes = await axios.get('/api/chat', {
                     headers: { Authorization: `Bearer ${currentUser.token}` },
                });
                if (chatsRes.data && chatsRes.data.length > 0) {
                    // Prioritize chats where user is admin, or just take the first one
                    const adminChat = chatsRes.data.find(c => c.groupAdmin?._id === currentUser._id);
                    setActiveChatId(adminChat ? adminChat._id : chatsRes.data[0]._id);
                } else {
                    console.warn("No family chat found for user:", currentUser.email);
                    // Potentially create a chat here if none exists, though backend should handle this.
                }
            }

          } catch (error) {
            console.error("Error fetching dashboard data:", error);
            // Handle error, maybe logout user or show error message
          }
        };
        fetchDashboardData();
      }
    }
  }, [currentUser, authLoading, navigate]);


  const handleLogout = () => {
    if (socket && isConnected) {
      socket.disconnect();
    }
    logout();
    navigate('/login');
  };

  const handleMemberAdded = async (newMember) => {
    setIsAddMemberModalOpen(false);
    // Refetch user profile to update family members list and potentially the chat
    try {
        const profileRes = await axios.get('/api/users/profile', {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
        const updatedUser = profileRes.data;
        if (updatedUser.familyMembers) {
            setFamilyMembers(updatedUser.familyMembers);
        }
        // The new member should be automatically added to the chat by the backend.
        // If chat UI needs explicit update, trigger refetch or use socket event.
      } catch (error) {
        console.error("Error refetching profile after adding member:", error);
      }
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
  };

  if (authLoading || !currentUser || !currentUser.isProfileComplete) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-lg">Loading...</p></div>;
  }
  
  if (!activeChatId && currentUser && currentUser.isProfileComplete) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="text-center">
                <p className="text-lg text-gray-700">Loading chat information...</p>
                <p className="text-sm text-gray-500 mt-2">If this persists, there might be an issue finding your family chat.</p>
                {/* Optionally, a button to try refetching or contact support */}
            </div>
        </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-lg sticky top-0 z-40 border-b border-gray-200">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">ChatWithFamily</h1>
          <div className="flex items-center space-x-5">
            <ProfileIcon user={currentUser} onProfileClick={handleProfileClick} />
            <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
            >
                Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-6 lg:p-8">
        {activeChatId ? (
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8 h-[calc(100vh-110px)]"> {/* Adjusted height for header */}
            <aside className="w-full md:w-1/3 lg:w-1/4 bg-white p-6 rounded-xl shadow-xl flex flex-col space-y-6 custom-scrollbar overflow-y-auto">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-5 border-b pb-3">Family Circle</h2>
                    <AddFamilyMemberButton onClick={() => setIsAddMemberModalOpen(true)} />
                </div>
                <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4 sticky top-0 bg-white py-2">Members</h3>
                    {familyMembers.length > 0 ? (
                        <ul className="space-y-3">
                            {familyMembers.map(member => (
                                <li
                                    key={member._id}
                                    className="p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:shadow-sm transition-all duration-150 cursor-pointer border border-slate-200"
                                >
                                    <p className="font-medium text-gray-800 text-sm">{member.name}</p>
                                    <p className="text-xs text-gray-500">{member.email}</p>
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
                <FamilyChatArea familyChatId={activeChatId} currentUser={currentUser} />
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
      
      <AddFamilyMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
};

export default DashboardPage;