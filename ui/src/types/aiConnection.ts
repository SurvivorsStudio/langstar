export interface ModelProvider {
  id: string;
  name: string;
  logo?: string;
  description: string;
  models: Model[];
  authFields: AuthField[];
  category: 'language' | 'embedding';
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  description: string;
  maxTokens?: number;
  pricing?: string;
  capabilities: string[];
  tags?: string[];
}

export interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  required: boolean;
  placeholder: string;
  helpText?: string;
}

export interface AIConnection {
  id: string;
  name: string;
  type: 'language' | 'embedding';
  provider: string;
  model: string;
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  status: string;
  lastModified: string;
}

export interface AIConnectionForm {
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  status: 'active' | 'draft' | 'archived';
} 