
export enum MessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
  TOOL_LOG = 'tool_log'
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  prompt?: string;
  status?: 'pending' | 'completed' | 'failed';
}

export interface ToolCallData {
  id: string;
  name: string;
  args: any;
  status: 'running' | 'complete' | 'failed';
  output?: string;
}

export interface Message {
  id: string;
  type: MessageType;
  text: string;
  thinking?: string;
  links?: GroundingLink[];
  media?: MediaItem;
  toolCalls?: ToolCallData[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type ImageSize = '1K' | '2K' | '4K';

// Virtual File System Types
export interface VirtualFile {
  content: string;
  updatedAt: number;
}

export type FileSystem = Record<string, VirtualFile>;
