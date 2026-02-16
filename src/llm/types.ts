import { Category } from '../types';

export type ClassificationSource = 'llm' | 'keyword';

export interface LLMClassificationResult {
  category: Category;
  confidence: number;
  reasoning: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: ClassificationSource;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  retryCount: number;
  fallbackEnabled: boolean;
}
