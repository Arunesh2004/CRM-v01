"use client";

import React, { createContext, useContext } from "react";

const MockClerkContext = createContext({
  user: {
    id: 'mock-user-id',
    firstName: 'Test',
    lastName: 'User',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
    fullName: 'Test User'
  },
  isLoaded: true,
  isSignedIn: true,
});

export function MockClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <MockClerkContext.Provider value={{
      user: {
        id: 'mock-user-id',
        firstName: 'Test',
        lastName: 'User',
        primaryEmailAddress: { emailAddress: 'test@example.com' },
        fullName: 'Test User'
      } as any,
      isLoaded: true,
      isSignedIn: true,
    }}>
      {children}
    </MockClerkContext.Provider>
  );
}

export function useUser() {
  return useContext(MockClerkContext);
}

export function UserButton() {
  return <div className="mock-user-button">U</div>;
}
