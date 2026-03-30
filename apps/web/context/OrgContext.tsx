"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";

interface Org {
  id: string;
  name: string;
}

const OrgContext = createContext<{
  orgId: string | null;
  setOrgId: (id: string | null) => void;
  orgs: Org[];
  refreshOrgs: () => Promise<void>;
} | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);

  const fetchOrgs = async () => {
    if (!user) return;
    
    // In multi-tenant enterprise system, we fetch memberships
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('organization:organizationId (id, name)')
      .eq('userId', user.id);

    if (error) {
      console.error("Error fetching organizations:", error);
      return;
    }

    const fetchedOrgs = (memberships as any[] || []).map(m => m.organization);
    setOrgs(fetchedOrgs);
    
    // Set default org if none selected
    if (fetchedOrgs.length > 0 && !orgId) {
      setOrgId(fetchedOrgs[0].id);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrgs();
    } else {
      setOrgs([]);
      setOrgId(null);
    }
  }, [user]);

  return (
    <OrgContext.Provider value={{ orgId, setOrgId, orgs, refreshOrgs: fetchOrgs }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) throw new Error("useOrg must be used within OrgProvider");
  return context;
};
