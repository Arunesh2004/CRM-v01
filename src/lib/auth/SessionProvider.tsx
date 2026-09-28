"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type NativeSessionUser = {
  id: string;
  tenantId: string;
  status: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type SessionState = {
  isLoaded: boolean;
  isAuthenticated: boolean;
  user: NativeSessionUser | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<NativeSessionUser | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Content-Type': 'application/json'
        },
        // Force no-cache so we always hit the server (which reads the HttpOnly cookie)
        cache: 'no-store'
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return (
    <SessionContext.Provider value={{
      isLoaded,
      isAuthenticated: !!user,
      user,
      refresh: fetchSession
    }}>
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
