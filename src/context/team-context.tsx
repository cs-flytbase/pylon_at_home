"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TeamService } from '@/lib/services/team.service';

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  isLoading: boolean;
  setCurrentTeam: (teamId: string) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const teamService = new TeamService();
  
  // Get the current user
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      } else {
        setUserId(null);
      }
    };

    fetchUser();
  }, []);
  
  // Load teams when user is available
  useEffect(() => {
    if (userId) {
      loadTeams();
    } else {
      setCurrentTeam(null);
      setTeams([]);
      setIsLoading(false);
    }
  }, [userId]);
  
  async function loadTeams() {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Load all teams for the user
      const userTeams = await teamService.getUserTeams(userId);
      const formattedTeams = userTeams.map((t: any) => ({
        id: t.team.id,
        name: t.team.name,
        slug: t.team.slug,
        role: t.role
      }));
      
      setTeams(formattedTeams);
      
      // Set current team from localStorage or use the first team
      const savedTeamId = localStorage.getItem('currentTeamId');
      const teamToUse = savedTeamId 
        ? formattedTeams.find(t => t.id === savedTeamId) 
        : formattedTeams[0];
        
      if (teamToUse) {
        setCurrentTeam(teamToUse);
        localStorage.setItem('currentTeamId', teamToUse.id);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleSetCurrentTeam(teamId: string) {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      localStorage.setItem('currentTeamId', team.id);
    }
  }
  
  return (
    <TeamContext.Provider
      value={{
        currentTeam,
        teams,
        isLoading,
        setCurrentTeam: handleSetCurrentTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
