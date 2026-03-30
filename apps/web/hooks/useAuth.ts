"use client";

import { useAuth as useContextAuth } from "@/context/AuthProvider";

/**
 * Standard hook for consuming authentication state in the MultiAgent web app.
 * Provides the current user, session, and loading state from a single AuthProvider source.
 */
export function useAuth() {
  const { user, session, loading, signOut } = useContextAuth();
  
  return {
    user,
    session,
    isAuthenticated: !!user,
    loading,
    signOut
  };
}
