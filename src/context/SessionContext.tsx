
'use client';

import { createContext, useState, useContext, type ReactNode } from 'react';

interface SessionInfo {
  name: string;
  position: string;
}

interface SessionContextType {
  sessionEstablished: boolean;
  setSessionEstablished: (established: boolean) => void;
  sessionInfo: SessionInfo | null;
  setSessionInfo: (info: SessionInfo | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  
  return (
    <SessionContext.Provider value={{ sessionEstablished, setSessionEstablished, sessionInfo, setSessionInfo }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
