import { ModelProvider } from '../types/aiConnection';

export const LANGUAGE_MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Leading AI research company with GPT models',
    category: 'language',
    models: [
      {
        id: 'gpt-4o',
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        description: 'Most capable and cost-effective model',
        maxTokens: 128000,
        pricing: 'Fast and efficient',
        capabilities: ['Text generation', 'Code generation', 'Reasoning'],
        tags: ['HighQuality', 'FastResponse', 'Affordable', 'Multimodal', 'CodeGeneration']
      },
      {
        id: 'gpt-4o-mini',
        name: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        description: 'Fast and cost-effective model',
        maxTokens: 128000,
        pricing: 'Most affordable',
        capabilities: ['Text generation', 'Code generation'],
        tags: ['Lightweight', 'Fast', 'LowCost', 'Efficient']
      },
      {
        id: 'gpt-4-turbo',
        name: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        description: 'Previous generation with high performance',
        maxTokens: 128000,
        pricing: 'Fast and efficient',
        capabilities: ['Text generation', 'Code generation', 'Reasoning'],
        tags: ['Reliable', 'HighPerformance', 'Popular', 'Versatile']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Get your API key from OpenAI dashboard'
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'AI safety-focused company with Claude models',
    category: 'language',
    models: [
      {
        id: 'claude-3-5-sonnet',
        name: 'claude-3-5-sonnet',
        displayName: 'Claude 3.5 Sonnet',
        description: 'Most capable and balanced model',
        maxTokens: 200000,
        pricing: 'Best performance',
        capabilities: ['Text generation', 'Code generation', 'Reasoning', 'Vision'],
        tags: ['LongContext', 'Fast', 'Stable', 'VisionSupport']
      },
      {
        id: 'claude-3-5-haiku',
        name: 'claude-3-5-haiku',
        displayName: 'Claude 3.5 Haiku',
        description: 'Fast and efficient model',
        maxTokens: 200000,
        pricing: 'Most affordable',
        capabilities: ['Text generation', 'Code generation'],
        tags: ['Fastest', 'Efficient', 'LowCost', 'ShortContext']
      },
      {
        id: 'claude-3-opus',
        name: 'claude-3-opus',
        displayName: 'Claude 3 Opus',
        description: 'Previous generation, most powerful',
        maxTokens: 200000,
        capabilities: ['Text generation', 'Code generation', 'Reasoning', 'Vision'],
        tags: ['Powerful', 'Advanced', 'Vision', 'Reasoning']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
        helpText: 'Get your API key from Anthropic console'
      }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Google AI with Gemini models',
    category: 'language',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        description: 'Most capable Gemini model',
        maxTokens: 1000000,
        pricing: 'Best performance',
        capabilities: ['Text generation', 'Code generation', 'Reasoning', 'Vision', 'Audio'],
        tags: ['UltraLongContext', 'Multimodal', 'GoogleEcosystem', 'Fast']
      },
      {
        id: 'gemini-1.5-flash',
        name: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model',
        maxTokens: 1000000,
        pricing: 'Most affordable',
        capabilities: ['Text generation', 'Code generation', 'Vision'],
        tags: ['Fastest', 'Efficient', 'Affordable', 'Vision']
      },
      {
        id: 'gemini-pro',
        name: 'gemini-pro',
        displayName: 'Gemini Pro',
        description: 'Previous generation, reliable model',
        maxTokens: 30000,
        capabilities: ['Text generation', 'Code generation'],
        tags: ['Reliable', 'Stable', 'Popular', 'TextGeneration']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AIza...',
        helpText: 'Get your API key from Google AI Studio'
      }
    ]
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'Amazon Bedrock foundation models (us-east-1)',
    category: 'language',
    models: [
      { id: 'amazon.nova-canvas-v1:0', name: 'amazon.nova-canvas-v1:0', displayName: 'Nova Canvas', description: 'Amazon Nova Canvas', maxTokens: 32768, capabilities: ['Text', 'Image'], tags: ['AWS', 'Nova', 'Canvas'] },
      { id: 'amazon.nova-lite-v1:0', name: 'amazon.nova-lite-v1:0', displayName: 'Nova Lite', description: 'Amazon Nova Lite', maxTokens: 32768, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Lite'] },
      { id: 'amazon.nova-micro-v1:0', name: 'amazon.nova-micro-v1:0', displayName: 'Nova Micro', description: 'Amazon Nova Micro', maxTokens: 32768, capabilities: ['Text'], tags: ['AWS', 'Nova', 'Micro'] },
      { id: 'amazon.nova-premier-v1:0', name: 'amazon.nova-premier-v1:0', displayName: 'Nova Premier', description: 'Amazon Nova Premier', maxTokens: 32768, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Premier'] },
      { id: 'amazon.nova-pro-v1:0', name: 'amazon.nova-pro-v1:0', displayName: 'Nova Pro', description: 'Amazon Nova Pro', maxTokens: 32768, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Pro'] },
      { id: 'amazon.nova-reel-v1:0', name: 'amazon.nova-reel-v1:0', displayName: 'Nova Reel', description: 'Amazon Nova Reel', maxTokens: 32768, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Reel'] },
      { id: 'amazon.nova-reel-v1:1', name: 'amazon.nova-reel-v1:1', displayName: 'Nova Reel v1:1', description: 'Amazon Nova Reel v1:1', maxTokens: 32768, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Reel'] },
      { id: 'amazon.nova-sonic-v1:0', name: 'amazon.nova-sonic-v1:0', displayName: 'Nova Sonic', description: 'Amazon Nova Sonic', maxTokens: 32768, capabilities: ['Speech', 'Text'], tags: ['AWS', 'Nova', 'Sonic'] },
      { id: 'anthropic.claude-v2:1', name: 'anthropic.claude-v2:1', displayName: 'Claude 2.1', description: 'Anthropic Claude 2.1', maxTokens: 200000, capabilities: ['Text', 'Chat'], tags: ['Anthropic', 'Claude', 'v2.1'] },
      { id: 'anthropic.claude-v2', name: 'anthropic.claude-v2', displayName: 'Claude 2', description: 'Anthropic Claude 2', maxTokens: 200000, capabilities: ['Text', 'Chat'], tags: ['Anthropic', 'Claude', 'v2'] },
      { id: 'anthropic.claude-instant-v1', name: 'anthropic.claude-instant-v1', displayName: 'Claude Instant', description: 'Anthropic Claude Instant', maxTokens: 200000, capabilities: ['Text', 'Chat'], tags: ['Anthropic', 'Claude', 'Instant'] },
      { id: 'anthropic.claude-v2:0', name: 'anthropic.claude-v2:0', displayName: 'Claude', description: 'Anthropic Claude', maxTokens: 200000, capabilities: ['Text', 'Chat'], tags: ['Anthropic', 'Claude'] },
      { id: 'ai21.jamba-1-5-large-v1:0', name: 'ai21.jamba-1-5-large-v1:0', displayName: 'Jamba 1.5 Large', description: 'AI21 Jamba 1.5 Large', maxTokens: 8192, capabilities: ['Text', 'Chat'], tags: ['AI21', 'Jamba', 'Large'] },
      { id: 'ai21.jamba-1-5-mini-v1:0', name: 'ai21.jamba-1-5-mini-v1:0', displayName: 'Jamba 1.5 Mini', description: 'AI21 Jamba 1.5 Mini', maxTokens: 8192, capabilities: ['Text', 'Chat'], tags: ['AI21', 'Jamba', 'Mini'] },
      { id: 'ai21.jamba-instruct-v1:0', name: 'ai21.jamba-instruct-v1:0', displayName: 'Jamba-Instruct', description: 'AI21 Jamba-Instruct', maxTokens: 8192, capabilities: ['Text', 'Chat'], tags: ['AI21', 'Jamba', 'Instruct'] },
      { id: 'mistral.mistral-large-2402-v1:0', name: 'mistral.mistral-large-2402-v1:0', displayName: 'Mistral Large (24.02)', description: 'Mistral Large 24.02', maxTokens: 32000, capabilities: ['Text', 'Chat'], tags: ['Mistral', 'Large', '2402'] },
      { id: 'mistral.mistral-small-2402-v1:0', name: 'mistral.mistral-small-2402-v1:0', displayName: 'Mistral Small (24.02)', description: 'Mistral Small 24.02', maxTokens: 32000, capabilities: ['Text', 'Chat'], tags: ['Mistral', 'Small', '2402'] },
      { id: 'mistral.mixtral-8x7b-instruct-v0:1', name: 'mistral.mixtral-8x7b-instruct-v0:1', displayName: 'Mixtral 8x7B Instruct', description: 'Mixtral 8x7B Instruct', maxTokens: 32000, capabilities: ['Text', 'Chat'], tags: ['Mistral', 'Mixtral', '8x7B'] },
      { id: 'mistral.pixtral-large-2502-v1:0', name: 'mistral.pixtral-large-2502-v1:0', displayName: 'Pixtral Large (25.02)', description: 'Pixtral Large 25.02', maxTokens: 32000, capabilities: ['Text', 'Chat'], tags: ['Mistral', 'Pixtral', '2502'] }
    ],
    authFields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true, placeholder: 'AKIA...', helpText: 'AWS Access Key ID' },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true, placeholder: '...', helpText: 'AWS Secret Access Key' },
      { name: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1', helpText: 'AWS region (e.g., us-east-1, us-west-2)' }
    ]
  }
];

export const EMBEDDING_MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Leading AI research company with embedding models',
    category: 'embedding',
    models: [
      {
        id: 'text-embedding-3-small',
        name: 'text-embedding-3-small',
        displayName: 'Text Embedding 3 Small',
        description: 'Fast and efficient embedding model',
        maxTokens: 8192,
        pricing: 'Most affordable',
        capabilities: ['Text embedding', 'Similarity search'],
        tags: ['Fast', 'Efficient', 'LowCost', 'HighQuality']
      },
      {
        id: 'text-embedding-3-large',
        name: 'text-embedding-3-large',
        displayName: 'Text Embedding 3 Large',
        description: 'High-quality embedding model',
        maxTokens: 8192,
        pricing: 'Best quality',
        capabilities: ['Text embedding', 'Similarity search'],
        tags: ['HighQuality', 'Accurate', 'Reliable', 'Advanced']
      },
      {
        id: 'text-embedding-ada-002',
        name: 'text-embedding-ada-002',
        displayName: 'Text Embedding Ada 002',
        description: 'Previous generation, reliable model',
        maxTokens: 8192,
        pricing: 'Reliable',
        capabilities: ['Text embedding', 'Similarity search'],
        tags: ['Reliable', 'Stable', 'Popular', 'Proven']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Get your API key from OpenAI dashboard'
      }
    ]
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Specialized in text embeddings and similarity',
    category: 'embedding',
    models: [
      {
        id: 'embed-english-v3.0',
        name: 'embed-english-v3.0',
        displayName: 'Embed English v3.0',
        description: 'High-quality English embeddings',
        maxTokens: 512,
        pricing: 'Best for English',
        capabilities: ['Text embedding', 'Similarity search'],
        tags: ['English', 'HighQuality', 'Specialized', 'Accurate']
      },
      {
        id: 'embed-multilingual-v3.0',
        name: 'embed-multilingual-v3.0',
        displayName: 'Embed Multilingual v3.0',
        description: 'Multilingual embedding model',
        maxTokens: 512,
        pricing: 'Multilingual support',
        capabilities: ['Text embedding', 'Similarity search', 'Multilingual'],
        tags: ['Multilingual', 'Global', 'Versatile', 'Support']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '...',
        helpText: 'Get your API key from Cohere dashboard'
      }
    ]
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    description: 'Open source models and inference API',
    category: 'embedding',
    models: [
      {
        id: 'sentence-transformers/all-MiniLM-L6-v2',
        name: 'sentence-transformers/all-MiniLM-L6-v2',
        displayName: 'All-MiniLM-L6-v2',
        description: 'Fast and efficient sentence transformer',
        maxTokens: 256,
        pricing: 'Open source',
        capabilities: ['Text embedding', 'Similarity search'],
        tags: ['OpenSource', 'Fast', 'Efficient', 'Lightweight']
      },
      {
        id: 'sentence-transformers/all-mpnet-base-v2',
        name: 'sentence-transformers/all-mpnet-base-v2',
        displayName: 'All-mpnet-base-v2',
        description: 'High-quality sentence transformer',
        maxTokens: 384,
        pricing: 'Open source',
        capabilities: ['Text embedding', 'Similarity search'],
        tags: ['OpenSource', 'HighQuality', 'Accurate', 'Reliable']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'hf_...',
        helpText: 'Get your API key from HuggingFace settings'
      }
    ]
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'Amazon Bedrock embedding models (us-east-1)',
    category: 'embedding',
    models: [
      { id: 'amazon.titan-embed-text-v1', name: 'amazon.titan-embed-text-v1', displayName: 'Titan Embeddings G1 - Text', description: 'Amazon Titan Embeddings G1 - Text', maxTokens: 8192, capabilities: ['Text embedding'], tags: ['AWS', 'Titan', 'Embedding', 'Text'] },
      { id: 'amazon.titan-embed-image-v1', name: 'amazon.titan-embed-image-v1', displayName: 'Titan Multimodal Embeddings G1', description: 'Amazon Titan Multimodal Embeddings G1', maxTokens: 8192, capabilities: ['Text embedding', 'Image embedding'], tags: ['AWS', 'Titan', 'Embedding', 'Multimodal'] }
    ],
    authFields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true, placeholder: 'AKIA...', helpText: 'AWS Access Key ID' },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true, placeholder: '...', helpText: 'AWS Secret Access Key' },
      { name: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1', helpText: 'AWS region (e.g., us-east-1, us-west-2)' }
    ]
  }
];

// 통합된 모델 프로바이더 리스트
export const MODEL_PROVIDERS: ModelProvider[] = [
  ...LANGUAGE_MODEL_PROVIDERS,
  ...EMBEDDING_MODEL_PROVIDERS
];

export const PROVIDER_CARDS = [
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '🤖',
    description: 'GPT-4o, GPT-4o Mini, GPT-4 Turbo',
    modelCount: 3,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    textColor: 'text-green-700',
    iconColor: 'text-green-600'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: '🧠',
    description: 'Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus',
    modelCount: 3,
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-600'
  },
  {
    id: 'google',
    name: 'Google',
    logo: '🔍',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro',
    modelCount: 3,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600'
  },
  {
    id: 'aws',
    name: 'AWS',
    logo: '☁️',
    description: 'Claude, Titan, Llama 2 via Bedrock',
    modelCount: 4,
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-600'
  }
];

// 임베딩 전용 프로바이더 카드
export const EMBEDDING_PROVIDER_CARDS = [
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '🤖',
    description: 'Text Embedding 3 Small, Text Embedding 3 Large',
    modelCount: 3,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    textColor: 'text-green-700',
    iconColor: 'text-green-600'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    logo: '🔗',
    description: 'Embed English v3.0, Embed Multilingual v3.0',
    modelCount: 2,
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-600'
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    logo: '🤗',
    description: 'All-MiniLM-L6-v2, All-mpnet-base-v2',
    modelCount: 2,
    color: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
    textColor: 'text-pink-700',
    iconColor: 'text-pink-600'
  }
]; 