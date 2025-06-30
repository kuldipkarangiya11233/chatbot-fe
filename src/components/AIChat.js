import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const AIChat = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [selectedMember, setSelectedMember] = useState(currentUser?.fullName || '');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const messagesEndRef = useRef(null);
  const BASE_URL = 'https://chatbot-be-732a.onrender.com';
  // const BASE_URL = 'http://localhost:5000';

  // Fetch all AI chats on component mount
  useEffect(() => {
    fetchChats();
    fetchFamilyMembers();
  }, []);

  // Set default selected member when currentUser changes
  useEffect(() => {
    if (currentUser?.fullName) {
      setSelectedMember(currentUser.fullName);
      // Add current user to family members if not already present
      setFamilyMembers(prev => {
        const currentUserExists = prev.some(member => member.fullName === currentUser.fullName);
        if (!currentUserExists) {
          return [...prev, { _id: currentUser._id, fullName: currentUser.fullName }];
        }
        return prev;
      });
    }
  }, [currentUser]);

  // Fetch messages when current chat changes
  useEffect(() => {
    if (currentChat) {
      fetchMessages(currentChat._id);
    } else {
      setMessages([]);
    }
  }, [currentChat]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Always get the latest token for every request
  const getAuthHeaders = () => {
    const token = currentUser?.token;
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const fetchChats = async () => {
    try {
      setError(null);
      const { data } = await axios.get(`${BASE_URL}/api/ai-chat`, getAuthHeaders());
      setChats(data);
      if (data.length > 0 && !currentChat) {
        setCurrentChat(data[0]);
      }
    } catch (error) {
      console.error('Error fetching AI chats:', error);
      setError('Failed to fetch chats. Please try again.');
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/ai-chat/${chatId}/messages`, getAuthHeaders());
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to fetch messages. Please try again.');
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      setLoadingFamilyMembers(true);
      const { data } = await axios.get(`${BASE_URL}/api/users/family-members`, getAuthHeaders());
      
      // Ensure we have an array and include the current user
      let members = Array.isArray(data) ? data : [];
      
      // Add current user if not already in the list
      if (currentUser && !members.some(member => member._id === currentUser._id)) {
        members = [{ _id: currentUser._id, fullName: currentUser.fullName }, ...members];
      }
      
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error fetching family members:', error);
      // Set current user as the only member if there's an error
      if (currentUser) {
        setFamilyMembers([{ _id: currentUser._id, fullName: currentUser.fullName }]);
      }
    } finally {
      setLoadingFamilyMembers(false);
    }
  };

  const createNewChat = async () => {
    try {
      setCreatingChat(true);
      setError(null);
      const { data } = await axios.post(`${BASE_URL}/api/ai-chat`, {}, getAuthHeaders());
      setChats([data, ...chats]);
      setCurrentChat(data);
      setMessages([]);
      // Immediately send a 'start' message to trigger AI greeting
      const response = await axios.post(
        `${BASE_URL}/api/ai-chat/${data._id}/message`,
        { content: 'start', senderName: currentUser?.fullName },
        getAuthHeaders()
      );
      // Add the AI greeting to messages
      if (response.data && response.data.newMessages) {
        setMessages(response.data.newMessages);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      setError('Failed to create new chat. Please try again.');
    } finally {
      setCreatingChat(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChat || loading) return;

    const messageContent = newMessage.trim();
    const messageWithName = selectedMember ? `[${selectedMember}]: ${messageContent}` : messageContent;
    
    setNewMessage('');
    setLoading(true);
    setError(null);

    // Add user message immediately for instant feedback
    const userMessage = {
      _id: Date.now().toString(),
      sender: currentUser,
      content: messageWithName,
      isAI: false,
      createdAt: new Date().toISOString(),
      senderName: selectedMember,
    };

    setMessages(prev => [...prev, userMessage]);
    // Update currentChat and chats message count for instant UI feedback
    setCurrentChat(prev => prev ? { ...prev, messages: [...(prev.messages || []), userMessage] } : prev);
    setChats(prev => prev.map(chat => chat._id === currentChat._id ? { ...chat, messages: [...(chat.messages || []), userMessage] } : chat));

    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/ai-chat/${currentChat._id}/message`,
        { content: messageContent, senderName: selectedMember },
        getAuthHeaders()
      );

      // Update chat with new title if it was generated
      if (data.chat.title !== currentChat.title) {
        setCurrentChat(data.chat);
        setChats(prev => prev.map(chat => 
          chat._id === data.chat._id ? data.chat : chat
        ));
      }

      // Add AI response without removing the user message
      const aiMessage = data.newMessages.find(msg => msg.isAI);
      if (aiMessage) {
        setMessages(prev => {
          // Keep the user message and add the AI response
          return [...prev, aiMessage];
        });
        // Update currentChat and chats with the new messages
        setCurrentChat(prev => prev ? { ...prev, messages: data.chat.messages } : prev);
        setChats(prev => prev.map(chat => chat._id === data.chat._id ? { ...chat, messages: data.chat.messages } : chat));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      // Keep the user message even on error - just show the error
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId) => {
    setChatToDelete(chatId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      await axios.delete(`${BASE_URL}/api/ai-chat/${chatToDelete}`, getAuthHeaders());
      setChats(chats.filter((chat) => chat._id !== chatToDelete));
      if (currentChat && currentChat._id === chatToDelete) {
        setCurrentChat(null);
        setMessages([]);
      }
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    } catch (error) {
      console.error('Failed to delete chat', error);
      alert('Failed to delete chat. Please try again.');
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'AI';
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const updateChatTitle = async (chatId, newTitle) => {
    try {
      setError(null);
      const { data } = await axios.put(
        `${BASE_URL}/api/ai-chat/${chatId}/title`,
        { title: newTitle },
        getAuthHeaders()
      );

      // Update chats list
      setChats(prev => prev.map(chat => 
        chat._id === chatId ? data : chat
      ));

      // Update current chat if it's the one being edited
      if (currentChat?._id === chatId) {
        setCurrentChat(data);
      }

      // Reset editing state
      setEditingChatId(null);
      setEditedTitle('');
    } catch (error) {
      console.error('Error updating chat title:', error);
      setError('Failed to update chat title. Please try again.');
    }
  };

  const handleEditClick = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat._id);
    setEditedTitle(chat.title);
  };

  const handleTitleSubmit = (e, chatId) => {
    e.preventDefault();
    if (editedTitle.trim()) {
      updateChatTitle(chatId, editedTitle);
    }
  };

  const handleTitleKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      handleTitleSubmit(e, chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
      setEditedTitle('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      {/* Floating Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-60 p-3 bg-white rounded-full shadow-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
        aria-label="Close AI Chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
                  <p className="text-sm text-gray-500">Your health companion</p>
                </div>
              </div>
            </div>
            <button
              onClick={createNewChat}
              disabled={creatingChat}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
            >
              {creatingChat ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>New Chat</span>
                </>
              )}
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4">
            {chats.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">No conversations yet</p>
                <p className="text-xs text-gray-500">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => (
                  <div
                    key={chat._id}
                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      currentChat?._id === chat._id
                        ? 'bg-white shadow-md border-2 border-indigo-200'
                        : 'hover:bg-white hover:shadow-sm'
                    }`}
                    onClick={() => setCurrentChat(chat)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingChatId === chat._id ? (
                          <form onSubmit={(e) => handleTitleSubmit(e, chat._id)} className="mb-1">
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onKeyDown={(e) => handleTitleKeyDown(e, chat._id)}
                              className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </form>
                        ) : (
                          <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                            {chat.title}
                          </h3>
                        )}
                        <p className="text-xs text-gray-500 mb-2">
                          {chat.messages.length > 0 
                            ? `${chat.messages.length} messages`
                            : 'New conversation'
                          }
                        </p>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-600">
                              {getInitials(chat.createdBy?.fullName)}
                            </span>
                          </div>
                          <span className="text-xs text-indigo-600">
                            {chat.createdBy?.fullName || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => handleEditClick(e, chat)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="Edit title"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete chat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">AI</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">{currentChat.title}</h1>
                      <p className="text-sm text-gray-500">
                        Created by {currentChat.createdBy?.fullName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                      {currentChat.messages.length} messages
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Start a conversation</h3>
                    <p className="text-gray-600 max-w-md">
                      Ask me anything about healthcare, family wellness, or general health questions. I'm here to help!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-2xl ${message.isAI ? 'flex items-start space-x-4' : ''}`}>
                        {message.isAI && (
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">AI</span>
                            </div>
                          </div>
                        )}
                        <div
                          className={`px-6 py-4 rounded-2xl shadow-sm ${
                            message.isAI
                              ? 'bg-gray-50 border border-gray-200 text-gray-900'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                          }`}
                        >
                          {!message.isAI && message.senderName && (
                            <div className="text-xs font-medium text-indigo-200 mb-2">
                              {message.senderName}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.isAI ? message.content : message.content.replace(/^\[.*?\]:\s*/, '')}
                          </div>
                          <div className={`text-xs mt-3 ${
                            message.isAI ? 'text-gray-500' : 'text-indigo-200'
                          }`}>
                            {formatTimestamp(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Loading indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">AI</span>
                        </div>
                      </div>
                      <div className="px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-gray-600 font-medium">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <div className="flex items-center space-x-3 text-red-700">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-6">
                <form onSubmit={sendMessage} className="space-y-4">
                  {/* Family Member Selector
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Asking as:</label>
                    {loadingFamilyMembers ? (
                      <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500">
                        Loading...
                      </div>
                    ) : (
                      <select
                        value={selectedMember}
                        onChange={(e) => setSelectedMember(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
                      >
                        {familyMembers.map((member) => (
                          <option key={member._id} value={member.fullName}>
                            {member.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                   */}
                  {/* Message Input */}
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 text-sm"
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !newMessage.trim()}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a chat from the sidebar or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteChat}
        message="Are you sure you want to delete this conversation? This action cannot be undone."
      />
    </div>
  );
};

export default AIChat; 