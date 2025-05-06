import { createClient } from '@/utils/supabase/client';
import { nanoid } from 'nanoid';

export class TeamService {
  // Create a new team
  async createTeam(userId: string, teamName: string) {
    const supabase = createClient();
    
    // Generate a slug from the team name
    const slug = teamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + nanoid(6);
    
    // Start a transaction to create team and add creator as owner
    const { data, error } = await supabase.rpc('create_team', { 
      p_name: teamName,
      p_slug: slug,
      p_user_id: userId
    });
    
    if (error) throw error;
    return data;
  }
  
  // Join a team with an invitation token
  async joinTeamWithToken(userId: string, token: string) {
    const supabase = createClient();
    
    // Validate token and join team
    const { data, error } = await supabase.rpc('join_team_with_token', {
      p_user_id: userId,
      p_token: token
    });
    
    if (error) throw error;
    return data;
  }
  
  // Get user's teams
  async getUserTeams(userId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        role,
        team:teams(id, name, slug)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  }
  
  // Create an invitation
  async createInvitation(teamId: string, email: string, role: 'admin' | 'member', createdBy: string) {
    const supabase = createClient();
    
    // Generate a unique token
    const token = nanoid(24);
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        token,
        role,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get team details
  async getTeamDetails(teamId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        slug,
        created_at,
        members:team_members(user_id, role, profiles:user_id(full_name, avatar_url))
      `)
      .eq('id', teamId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Get team invitations
  async getTeamInvitations(teamId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId);
    
    if (error) throw error;
    return data || [];
  }

  // Delete invitation
  async deleteInvitation(invitationId: string) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId);
    
    if (error) throw error;
    return true;
  }

  // Update team member role
  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }

  // Remove team member
  async removeMember(teamId: string, userId: string) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }
}
