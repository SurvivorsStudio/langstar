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
      },
      {
        id: 'gpt-5',
        name: 'gpt-5',
        displayName: 'GPT-5',
        description: 'The best model for coding and agentic tasks across domains',
        maxTokens: 200000,
        pricing: 'Premium performance',
        capabilities: ['Text generation', 'Code generation', 'Reasoning', 'Agentic tasks'],
        tags: ['Latest', 'HighPerformance', 'Coding', 'Agentic', 'Advanced']
      },
      {
        id: 'gpt-5-mini',
        name: 'gpt-5-mini',
        displayName: 'GPT-5 mini',
        description: 'A faster, cost-efficient version of GPT-5 for well-defined tasks',
        maxTokens: 200000,
        pricing: 'Cost-efficient',
        capabilities: ['Text generation', 'Code generation', 'Fast processing'],
        tags: ['Fast', 'Efficient', 'CostEffective', 'Optimized', 'Reliable']
      },
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
        id: 'claude-sonnet-4-5-20250929',
        name: 'claude-sonnet-4-5-20250929',
        displayName: 'Claude Sonnet 4.5',
        description: 'Our best model for complex agents and coding, with highest intelligence across most tasks',
        maxTokens: 200000,
        pricing: 'Higher tier / flagship',
        capabilities: [
          'Reasoning',
          'Vision',
          'Tool use'
        ],
        tags: ['LongContext', 'Advanced', 'Agentic', 'VisionSupport']
      },
      {
        id: 'claude-opus-4-1-20250805',
        name: 'claude-opus-4-1-20250805',
        displayName: 'Claude Opus 4.1',
        description: 'Exceptional model for specialized complex tasks requiring advanced reasoning',
        maxTokens: 200000,
        pricing: 'Premium',
        capabilities: [
          'Reasoning',
          'Vision',
          'Tool use',
          'Agentic search',
          'Parallel tool execution'
        ],
        tags: ['HighestReasoning', 'Specialist', 'Agentic']
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'claude-sonnet-4-20250514',
        displayName: 'Claude Sonnet 4',
        description: 'Balanced model in Claude 4 generation, strong reasoning & intelligence',
        maxTokens: 200000,
        pricing: 'Mid-tier',
        capabilities: [
          'Reasoning',
          'Vision',
          'Tool use'
        ],
        tags: ['Balanced', 'Efficient', 'Agentic']
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'claude-opus-4-20250514',
        displayName: 'Claude Opus 4',
        description: 'Previous flagship model in Claude 4 generation, very high intelligence',
        maxTokens: 200000,
        pricing: 'High',
        capabilities: [
          'Reasoning',
          'Vision',
          'Tool use'
        ],
        tags: ['Flagship', 'HighPerformance']
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'claude-3-7-sonnet-20250219',
        displayName: 'Claude 3.7 Sonnet',
        description: 'Hybrid reasoning model; lets you choose between fast or methodical reasoning',
        maxTokens: 200000,
        pricing: 'Mid-high',
        capabilities: [
          'Reasoning',
          'Extended thinking',
          'Hybrid reasoning',
          'Tool use'
        ],
        tags: ['HybridReasoning', 'Flexible', 'Agentic']
      },
      {
        id: 'claude-3-5-haiku-latest',
        name: 'claude-3-5-haiku-latest',
        displayName: 'Claude 3.5 Haiku',
        description: 'Fast and efficient model in Claude 3.5 family',
        maxTokens: 200000,
        pricing: 'Lower-cost',
        capabilities: [],
        tags: ['Fastest', 'CostEffective']
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        description: 'Most capable model in Claude 3.5 family',
        maxTokens: 200000,
        pricing: 'Standard',
        capabilities: [
          'Reasoning',
          'Vision'
        ],
        tags: ['Balanced', 'Versatile']
      }
    ],
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-anthropic-...',
        helpText: 'Get your API key from Anthropic / Claude console'
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
        id: 'gemini-2.5-flash',
        name: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        description: 'Balanced model optimized for latency and throughput with multimodal support',
        maxTokens: 1048576,
        capabilities: ['Text generation', 'Code generation', 'Multimodal input Text'],
        tags: ['Balanced', 'Performance', 'Multimodal']
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'gemini-2.5-flash-lite',
        displayName: 'Gemini 2.5 Flash-Lite',
        description: 'Cost-efficient variant optimized for speed and high throughput',
        maxTokens: 1048576,
        capabilities: ['Text generation', 'Multimodal input Text'],
        tags: ['CostEfficient', 'HighThroughput', 'Multimodal']
      },
      {
        id: 'gemini-2.0-flash',
        name: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        description: 'Fast multimodal model from the 2.0 generation',
        maxTokens: 1048576,
        capabilities: ['Text generation', 'Multimodal input Text'],
        tags: ['Stable', 'Multimodal', 'Fast']
      },
      {
        id: 'gemini-2.0-flash-lite',
        name: 'gemini-2.0-flash-lite',
        displayName: 'Gemini 2.0 Flash-Lite',
        description: 'Lightweight variant of the 2.0 Flash model optimized for efficiency',
        maxTokens: 1048576,
        capabilities: ['Text generation', 'Multimodal input Text'],
        tags: ['Lightweight', 'Efficient', 'Multimodal']
      },
      {
        id: 'gemini-1.5-pro',
        name: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        description: 'Most capable model in the 1.5 generation, supports ultra-long context',
        maxTokens: 2097152,
        capabilities: ['Text generation', 'Code generation', 'Reasoning', 'Multimodal input Text'],
        tags: ['UltraLongContext', 'Reasoning', 'Multimodal']
      },
      {
        id: 'gemini-1.5-flash',
        name: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        description: 'Fast and efficient 1.5 generation model',
        maxTokens: 1048576,
        capabilities: ['Text generation', 'Code generation', 'Multimodal input (Text, Audio, Image, Video)'],
        tags: ['Fast', 'Efficient', 'Multimodal']
      },
      {
        id: 'gemini-1.5-flash-8b',
        name: 'gemini-1.5-flash-8b',
        displayName: 'Gemini 1.5 Flash-8B',
        description: 'Smaller and optimized variant of Gemini 1.5 Flash',
        maxTokens: 1048576,
        capabilities: ['Text generation', 'Multimodal input (Text, Audio, Image)'],
        tags: ['Lightweight', 'Efficient', 'Multimodal']
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
    description: 'Amazon Bedrock foundation models',
    category: 'language',
    models: [
      // Amazon Nova Models
      { id: 'amazon.nova-premier-v1:0', name: 'amazon.nova-premier-v1:0', displayName: 'Nova Premier', description: 'Amazon Nova Premier - Most capable model with 1M context window', maxTokens: 1000000, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Premier', 'UltraLongContext'], regions: ['us-east-1'] },
      { id: 'amazon.nova-pro-v1:0', name: 'amazon.nova-pro-v1:0', displayName: 'Nova Pro', description: 'Amazon Nova Pro - High performance model with 300K context window', maxTokens: 300000, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Pro', 'LongContext'], regions: ['us-east-1', 'us-gov-west-1', 'ap-northeast-1', 'ap-southeast-2', 'eu-west-2'] },
      { id: 'amazon.nova-lite-v1:0', name: 'amazon.nova-lite-v1:0', displayName: 'Nova Lite', description: 'Amazon Nova Lite - Balanced model with 300K context window', maxTokens: 300000, capabilities: ['Text', 'Image', 'Video'], tags: ['AWS', 'Nova', 'Lite', 'LongContext'], regions: ['us-east-1', 'us-gov-west-1', 'ap-northeast-1', 'ap-southeast-2', 'eu-west-2'] },
      { id: 'amazon.nova-micro-v1:0', name: 'amazon.nova-micro-v1:0', displayName: 'Nova Micro', description: 'Amazon Nova Micro - Efficient model with 128K context window', maxTokens: 128000, capabilities: ['Text'], tags: ['AWS', 'Nova', 'Micro', 'Efficient'], regions: ['us-east-1', 'us-gov-west-1', 'ap-northeast-1', 'ap-southeast-2', 'eu-west-2'] },
      
      // Anthropic Claude Models
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'anthropic.claude-3-haiku-20240307-v1:0', displayName: 'Claude 3 Haiku', description: 'Fast and efficient Claude model', maxTokens: 200000, maxOutputTokens: 4096, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', '3', 'Haiku', 'Fast'], regions: ['us-east-1', 'us-west-2', 'us-gov-west-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ca-central-1', 'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'sa-east-1'] },
      { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'anthropic.claude-3-opus-20240229-v1:0', displayName: 'Claude 3 Opus', description: 'Most powerful Claude model', maxTokens: 200000, maxOutputTokens: 4096, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', '3', 'Opus', 'Powerful'], regions: ['us-west-2'] },
      { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'anthropic.claude-3-sonnet-20240229-v1:0', displayName: 'Claude 3 Sonnet', description: 'Balanced Claude model', maxTokens: 200000, maxOutputTokens: 4096, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', '3', 'Sonnet', 'Balanced'], regions: ['us-east-1', 'us-west-2', 'ap-south-1', 'ap-southeast-2', 'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'sa-east-1'] },
      { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'anthropic.claude-3-5-haiku-20241022-v1:0', displayName: 'Claude 3.5 Haiku', description: 'Latest generation Haiku model', maxTokens: 200000, maxOutputTokens: 8192, capabilities: ['텍스트'], tags: ['Anthropic', 'Claude', '3.5', 'Haiku', 'Latest'], regions: ['us-west-2'] },
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'anthropic.claude-3-5-sonnet-20241022-v2:0', displayName: 'Claude 3.5 Sonnet v2', description: 'Latest generation Sonnet model v2', maxTokens: 200000, maxOutputTokens: 8192, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', '3.5', 'Sonnet', 'v2', 'Latest'], regions: ['us-west-2', 'ap-southeast-2'] },
      { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'anthropic.claude-3-5-sonnet-20240620-v1:0', displayName: 'Claude 3.5 Sonnet', description: 'Latest generation Sonnet model', maxTokens: 200000, maxOutputTokens: 8192, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', '3.5', 'Sonnet', 'Latest'], regions: ['us-east-1', 'us-west-2', 'us-gov-west-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'eu-central-1', 'eu-central-2'] },
      { id: 'anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'anthropic.claude-3-7-sonnet-20250219-v1:0', displayName: 'Claude 3.7 Sonnet', description: 'Advanced Claude model', maxTokens: 200000, maxOutputTokens: 8192, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', '3.7', 'Sonnet', 'Advanced'], regions: ['us-gov-west-1', 'eu-west-2'] },
      { id: 'anthropic.claude-opus-4-1-20250805-v1:0', name: 'anthropic.claude-opus-4-1-20250805-v1:0', displayName: 'Claude Opus 4.1', description: 'Next generation Opus model', maxTokens: 200000, maxOutputTokens: 32000, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', 'Opus', '4.1', 'NextGen'], regions: [] },
      { id: 'anthropic.claude-opus-4-20250514-v1:0', name: 'anthropic.claude-opus-4-20250514-v1:0', displayName: 'Claude Opus 4', description: 'Next generation Opus model', maxTokens: 200000, maxOutputTokens: 32000, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', 'Opus', '4', 'NextGen'], regions: [] },
      { id: 'anthropic.claude-sonnet-4-20250514-v1:0', name: 'anthropic.claude-sonnet-4-20250514-v1:0', displayName: 'Claude Sonnet 4', description: 'Next generation Sonnet model', maxTokens: 200000, maxOutputTokens: 64000, capabilities: ['텍스트', '이미지'], tags: ['Anthropic', 'Claude', 'Sonnet', '4', 'NextGen'], regions: [] },
      
      // OpenAI Series Models
      { id: 'openai.gpt-oss-120b-1:0', name: 'openai.gpt-oss-120b-1:0', displayName: 'GPT-OSS-120B', description: 'OpenAI Series 120B parameter model', maxTokens: 128000, capabilities: ['텍스트'], tags: ['OpenAI', 'OSS', '120B', 'Large'], regions: ['us-west-2'] },
      { id: 'openai.gpt-oss-20b-1:0', name: 'openai.gpt-oss-20b-1:0', displayName: 'GPT-OSS-20B', description: 'OpenAI Series 20B parameter model', maxTokens: 128000, capabilities: ['텍스트'], tags: ['OpenAI', 'OSS', '20B', 'Medium'], regions: ['us-west-2'] },
    ],
    authFields: [
      { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true, placeholder: 'AKIA...', helpText: 'AWS Access Key ID' },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true, placeholder: '...', helpText: 'AWS Secret Access Key' },
      { name: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1', helpText: 'AWS region (e.g., us-east-1, us-west-2)' }
    ],
    supportedRegions: [
      { id: 'us-east-1', name: 'US East (N. Virginia)', displayName: 'us-east-1' },
      { id: 'us-west-2', name: 'US West (Oregon)', displayName: 'us-west-2' },
      { id: 'us-gov-west-1', name: 'US Gov West (N. California)', displayName: 'us-gov-west-1' },
      { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', displayName: 'ap-northeast-1' },
      { id: 'ap-northeast-2', name: 'Asia Pacific (Seoul)', displayName: 'ap-northeast-2' },
      { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', displayName: 'ap-south-1' },
      { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', displayName: 'ap-southeast-1' },
      { id: 'ap-southeast-2', name: 'Asia Pacific (Sydney)', displayName: 'ap-southeast-2' },
      { id: 'ca-central-1', name: 'Canada (Central)', displayName: 'ca-central-1' },
      { id: 'eu-central-1', name: 'Europe (Frankfurt)', displayName: 'eu-central-1' },
      { id: 'eu-central-2', name: 'Europe (Zurich)', displayName: 'eu-central-2' },
      { id: 'eu-west-1', name: 'Europe (Ireland)', displayName: 'eu-west-1' },
      { id: 'eu-west-2', name: 'Europe (London)', displayName: 'eu-west-2' },
      { id: 'eu-west-3', name: 'Europe (Paris)', displayName: 'eu-west-3' },
      { id: 'eu-north-1', name: 'Europe (Stockholm)', displayName: 'eu-north-1' },
      { id: 'sa-east-1', name: 'South America (São Paulo)', displayName: 'sa-east-1' }
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
    description: 'GPT-5, GPT-5 mini, GPT-4o, GPT-4o Mini, GPT-4 Turbo',
    modelCount: 5,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    textColor: 'text-green-700',
    iconColor: 'text-green-600'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: '🧠',
    description: 'Claude Sonnet 4.5, Claude Opus 4.1, Claude Sonnet 4, Claude Opus 4, Claude 3.7 Sonnet, Claude 3.5 (Sonnet, Haiku)',
    modelCount: 7,
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    textColor: 'text-orange-700',
    iconColor: 'text-orange-600'
  },
  {
    id: 'google',
    name: 'Google',
    logo: '🔍',
    description: 'Gemini 2.5 (Flash, Flash-Lite), Gemini 2.0 (Flash, Flash-Lite), Gemini 1.5 (Pro, Flash, Flash-8B)',
    modelCount: 7,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600'
  },
  {
    id: 'aws',
    name: 'AWS',
    logo: '☁️',
    description: 'Nova, Claude 3/3.5/3.7/4, GPT-OSS via Bedrock',
    modelCount: 17,
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