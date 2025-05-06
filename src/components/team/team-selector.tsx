"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, PlusCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TeamService } from '@/lib/services/team.service';
import { CreateTeamModal } from './create-team-modal';
import { toast } from 'sonner';

interface TeamSelectorProps {
  userId: string;
  currentTeamId?: string;
  onTeamChange?: (teamId: string) => void;
}

export function TeamSelector({ userId, currentTeamId, onTeamChange }: TeamSelectorProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const teamService = new TeamService();
  
  useEffect(() => {
    loadTeams();
  }, [userId]);
  
  async function loadTeams() {
    setLoading(true);
    try {
      const userTeams = await teamService.getUserTeams(userId);
      setTeams(userTeams.map((t: any) => ({
        id: t.team.id,
        name: t.team.name,
        role: t.role
      })));
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast.error('Unable to load your teams');
    } finally {
      setLoading(false);
    }
  }
  
  function handleTeamSelect(teamId: string) {
    if (teamId === currentTeamId) {
      setOpen(false);
      return;
    }
    
    // Save selected team in localStorage for persistence
    localStorage.setItem('currentTeamId', teamId);
    
    // Notify parent component of team change
    if (onTeamChange) {
      onTeamChange(teamId);
    } else {
      // If no callback provided, refresh the page
      window.location.reload();
    }
    
    setOpen(false);
  }
  
  // Find the current team
  const currentTeam = teams.find(team => team.id === currentTeamId) || 
    (teams.length > 0 ? teams[0] : null);
  
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a team"
            className="w-48 justify-between"
          >
            {currentTeam ? (
              <span className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                {currentTeam.name}
              </span>
            ) : loading ? (
              "Loading..."
            ) : (
              "Select a team"
            )}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0">
          <Command>
            <CommandInput placeholder="Search team..." className="h-9" />
            <CommandList>
              <CommandEmpty>No team found.</CommandEmpty>
              <CommandGroup>
                {teams.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={team.name}
                    onSelect={() => handleTeamSelect(team.id)}
                    className="text-sm"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {team.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentTeamId === team.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateTeamOpen(true);
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Team
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <CreateTeamModal
        isOpen={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        userId={userId}
        onSuccess={(newTeamId) => {
          loadTeams();
          handleTeamSelect(newTeamId);
        }}
      />
    </>
  );
}
