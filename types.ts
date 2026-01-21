
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
  | 'whisper' 
  | 'unison' 
  | 'electronic' 
  | 'fear' 
  | 'narrative' 
  | 'impact' 
  | 'poetic';

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
  showTail?: boolean; // Controle de visibilidade da seta
}

export interface GenerationState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  error: string | null;
  resultUrl: string | null;
  suggestions: SceneSuggestion[];
}
