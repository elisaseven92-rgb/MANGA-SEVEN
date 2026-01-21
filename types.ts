
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
  | 'speech'      // Oval (Imagem 1)
  | 'scream'      // Explosão (Imagem 2)
  | 'thought'     // Nuvem (Imagem 3)
  | 'soft-rect'   // Retângulo Arredondado (Imagem 6)
  | 'trapezoid'   // Trapezoide (Imagem 7)
  | 'starburst'   // Estrela de Ação (Imagem 9)
  | 'capsule'     // Cápsula Larga (Imagem 10)
  | 'bean'        // Formato Feijão/Orgânico (Imagem 13)
  | 'narrative'   // Caixa Reta (Imagem 14)
  | 'whisper'     // Pontilhado
  | 'impact'      // Sólido Preto
  | 'electronic'; // Tremido/Raio

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
  showTail?: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  error: string | null;
  resultUrl: string | null;
  suggestions: SceneSuggestion[];
}
