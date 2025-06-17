import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // To get current user for setup

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// Ensure this matches your backend server address
const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null); // To persist socket instance across re-renders

  useEffect(() => {
    if (currentUser && currentUser.token) {
      // Disconnect previous socket if exists and user changes or logs out
      if (socketRef.current) {
        console.log('Disconnecting previous socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      
      console.log('Attempting to connect to Socket.IO server...');
      const newSocket = io(SOCKET_SERVER_URL, {
        // query: { token: currentUser.token }, // Example: sending token for auth if backend expects it
        // reconnectionAttempts: 5,
        // reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        // Setup user-specific room after connection
        newSocket.emit('setup', currentUser); 
      });

      newSocket.on('connected', () => {
        console.log('Socket setup complete by server.');
        // You can set another state here if needed, e.g., isSetupComplete
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        // Handle reconnection logic if needed, though socket.io has some built-in
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });
      
      socketRef.current = newSocket;
      setSocket(newSocket);

    } else {
      // If no current user or token, disconnect any existing socket
      if (socketRef.current) {
        console.log('No user, disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setSocket(null);
      }
    }

    // Cleanup on component unmount or when currentUser changes
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection...');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [currentUser]); // Re-run effect if currentUser changes

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};