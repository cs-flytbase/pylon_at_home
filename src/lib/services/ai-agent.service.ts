import { createServerClient } from '@/lib/supabase';
import { OpenAI } from 'openai';

// Define the types for AI agent configuration
export interface AIAgentConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

// Default configuration for AI agents
export const DEFAULT_AI_AGENT_CONFIG: AIAgentConfig = {
  model: 'gpt-3.5-turbo',
  systemPrompt: 'You are a helpful assistant responding to WhatsApp messages. Be concise, friendly, and helpful.',
  temperature: 0.7,
  maxTokens: 500,
};

// Define the types for conversation history
export interface MessageHistory {
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export class AIAgentService {
  private openai: OpenAI;
  
  constructor() {
    // Initialize OpenAI client with API key from environment variables
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Create a new AI agent for a conversation
   */
  async createAgent(conversationId: string, config: Partial<AIAgentConfig> = {}) {
    try {
      const supabase = createServerClient();
      
      // Merge default config with provided config
      const agentConfig: AIAgentConfig = {
        ...DEFAULT_AI_AGENT_CONFIG,
        ...config,
      };
      
      // Generate a unique agent ID
      const agentId = crypto.randomUUID();
      
      // Update conversation metadata to include AI agent information
      const { error } = await supabase
        .from('conversations')
        .update({
          metadata: {
            is_agent: true,
            agent_id: agentId,
            agent_config: agentConfig,
          },
        })
        .eq('id', conversationId);
      
      if (error) {
        console.error('Error creating AI agent:', error);
        throw error;
      }
      
      return { agentId, config: agentConfig };
    } catch (error) {
      console.error('Error in createAgent:', error);
      throw error;
    }
  }

  /**
   * Update an existing AI agent's configuration
   */
  async updateAgentConfig(conversationId: string, config: Partial<AIAgentConfig>) {
    try {
      const supabase = createServerClient();
      
      // Get current metadata
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching conversation:', fetchError);
        throw fetchError;
      }
      
      // Parse metadata
      const metadata = typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata || {};
      
      // Update agent config
      const updatedMetadata = {
        ...metadata,
        agent_config: {
          ...(metadata.agent_config || DEFAULT_AI_AGENT_CONFIG),
          ...config,
        },
      };
      
      // Save updated metadata
      const { error } = await supabase
        .from('conversations')
        .update({
          metadata: updatedMetadata,
        })
        .eq('id', conversationId);
      
      if (error) {
        console.error('Error updating AI agent config:', error);
        throw error;
      }
      
      return { agentId: metadata.agent_id, config: updatedMetadata.agent_config };
    } catch (error) {
      console.error('Error in updateAgentConfig:', error);
      throw error;
    }
  }

  /**
   * Get conversation history formatted for AI context
   */
  async getConversationHistory(conversationId: string, limit = 10): Promise<MessageHistory[]> {
    try {
      const supabase = createServerClient();
      
      // Get conversation metadata to retrieve system prompt
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      if (convError) {
        console.error('Error fetching conversation:', convError);
        throw convError;
      }
      
      // Parse metadata
      const metadata = typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata || {};
      
      // Get system prompt from agent config
      const systemPrompt = metadata?.agent_config?.systemPrompt || DEFAULT_AI_AGENT_CONFIG.systemPrompt;
      
      // Get recent messages
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (msgError) {
        console.error('Error fetching messages:', msgError);
        throw msgError;
      }
      
      // Format messages for AI context
      const history: MessageHistory[] = [
        { role: 'system', content: systemPrompt },
      ];
      
      // Add messages in chronological order (oldest first)
      messages.reverse().forEach(message => {
        // Skip system messages
        if (message.user_id === '00000000-0000-0000-0000-000000000000') {
          history.push({
            role: 'assistant',
            content: message.content,
            created_at: message.created_at,
          });
        } else {
          history.push({
            role: 'user',
            content: message.content,
            created_at: message.created_at,
          });
        }
      });
      
      return history;
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      throw error;
    }
  }

  /**
   * Generate an AI response for a message
   */
  async generateResponse(conversationId: string, userMessage: string): Promise<string> {
    try {
      // Get conversation metadata to retrieve agent config
      const supabase = createServerClient();
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      if (convError) {
        console.error('Error fetching conversation:', convError);
        throw convError;
      }
      
      // Parse metadata
      const metadata = typeof conversation.metadata === 'string'
        ? JSON.parse(conversation.metadata)
        : conversation.metadata || {};
      
      // Get agent config
      const agentConfig = metadata?.agent_config || DEFAULT_AI_AGENT_CONFIG;
      
      // Get conversation history
      const history = await this.getConversationHistory(conversationId);
      
      // Add the current user message
      history.push({
        role: 'user',
        content: userMessage,
      });
      
      // Generate AI response
      const completion = await this.openai.chat.completions.create({
        model: agentConfig.model,
        messages: history.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: agentConfig.temperature,
        max_tokens: agentConfig.maxTokens,
      });
      
      // Extract and return the response text
      const responseText = completion.choices[0]?.message?.content || 
        "I'm sorry, I couldn't generate a response at this time.";
      
      return responseText;
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Return a fallback response
      return "I apologize, but I'm experiencing technical difficulties right now. Please try again later.";
    }
  }

  /**
   * Save an AI response to the database
   */
  async saveAIResponse(conversationId: string, content: string) {
    try {
      const supabase = createServerClient();
      
      // Insert AI message
      const { data: aiMessage, error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          user_id: '00000000-0000-0000-0000-000000000000', // System/AI user ID
          content: content,
          direction: 'inbound',
          status: 'delivered',
          is_from_customer: false,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving AI response:', error);
        throw error;
      }
      
      return aiMessage;
    } catch (error) {
      console.error('Error in saveAIResponse:', error);
      throw error;
    }
  }

  /**
   * Process a user message and generate an AI response
   */
  async processMessage(conversationId: string, userMessage: string) {
    try {
      // Generate AI response
      const responseText = await this.generateResponse(conversationId, userMessage);
      
      // Save AI response to database
      const aiMessage = await this.saveAIResponse(conversationId, responseText);
      
      return { aiMessage, responseText };
    } catch (error) {
      console.error('Error processing message with AI:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const aiAgentService = new AIAgentService();

