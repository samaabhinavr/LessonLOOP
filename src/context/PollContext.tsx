import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import io, { Socket } from 'socket.io-client'; // Commented out

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  _id: string;
  class: string;
  question: string;
  options: PollOption[];
  correctAnswer: number;
  createdBy: string;
  isActive: boolean;
}

interface PollContextType {
  socket: null; // Changed to null
  activePoll: Poll | null;
  setActivePoll: React.Dispatch<React.SetStateAction<Poll | null>>;
}

const PollContext = createContext<PollContextType | undefined>(undefined);

export const usePoll = () => {
  const context = useContext(PollContext);
  if (context === undefined) {
    throw new Error('usePoll must be used within a PollProvider');
  }
  return context;
};

interface PollProviderProps {
  children: ReactNode;
}

export const PollProvider: React.FC<PollProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<null>(null); // Changed to null
  const [activePoll, setActivePoll] = useState<Poll | null>(null);

  useEffect(() => {
    // const newSocket = io('https://us-central1-lessonloop-633d9.cloudfunctions.net/api'); // Commented out
    // setSocket(newSocket); // Commented out

    // newSocket.on('connect', () => {
    //   console.log('Socket connected');
    // });

    // newSocket.on('pollCreated', (poll: Poll) => {
    //   setActivePoll(poll);
    // });

    // newSocket.on('pollUpdated', (poll: Poll) => {
    //   setActivePoll(poll);
    // });

    // newSocket.on('pollEnded', (poll: Poll) => {
    //   setActivePoll(poll);
    // });

    // newSocket.on('disconnect', () => {
    //   console.log('Socket disconnected');
    //   setActivePoll(null); // Clear active poll on disconnect
    // });

    // return () => {
    //   newSocket.disconnect();
    // };
  }, []);

  return (
    <PollContext.Provider value={{ socket, activePoll, setActivePoll }}>
      {children}
    </PollContext.Provider>
  );
};
