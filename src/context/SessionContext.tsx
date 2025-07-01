
'use client';

import { createContext, useState, useContext, type ReactNode } from 'react';

interface SessionContextType {
  sessionEstablished: boolean;
  setSessionEstablished: (established: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionEstablished, setSessionEstablished] = useState(false);
  
  return (
    <SessionContext.Provider value={{ sessionEstablished, setSessionEstablished }}>
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
