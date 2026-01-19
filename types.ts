
export interface MangaImage {
  id: string;
  url: string;
  base64: string;
  mimeType: string;
}

export type BubbleType = 'speech' | 'thought' | 'scream' | 'narrative' | 'whisper';

export interface SceneSuggestion {
  panelNumber: number;
  description: string;
  suggestedDialogue: string;
  position: {
    x: number; // 0-100
    y: number; // 0-100
  };
  tailAngle: number; // 0-360
  tailLength: number; // Comprimento do rabicho
  fontSize: number; // Tamanho da fonte em px
  bubbleScale: number; // Escala/Largura do balão em % (ex: 20-60)
  bubbleType: BubbleType; // Estilo do balão
  readingOrder: number;
}

export interface GenerationState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  error: string | null;
  resultUrl: string | null;
  suggestions: SceneSuggestion[];
}
