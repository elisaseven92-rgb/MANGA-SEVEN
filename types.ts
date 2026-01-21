
export interface MangaImage {
  id: string;
  url: string;
  base64: string;
  mimeType: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export type BubbleType = 
  | 'speech' 
  | 'thought' 
  | 'scream' 
  | 'narrative' 
  | 'whisper' 
  | 'wavy' 
  | 'impact' 
  | 'organic' 
  | 'sharp'
  | 'modern';

export interface SceneSuggestion {
  panelNumber: number;
  description: string;
  suggestedDialogue: string;
  position: {
    x: number; // 0-100
    y: number; // 0-100
  };
  tailAngle: number; 
  tailLength: number; 
  fontSize: number; 
  bubbleScale: number; 
  bubbleType: BubbleType; 
  readingOrder: number;
}

export interface GenerationState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  error: string | null;
  resultUrl: string | null;
  suggestions: SceneSuggestion[];
}
