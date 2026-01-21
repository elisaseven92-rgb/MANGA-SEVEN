
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
  | 'speech'      // Oval
  | 'scream'      // Grito Agressivo
  | 'shock'       // Grito de Choque (Flash)
  | 'burst'       // Explosão de Impacto
  | 'thought'     // Nuvem
  | 'soft-rect'   // Retângulo Arredondado
  | 'trapezoid'   // Trapezoide
  | 'starburst'   // Estrela de Ação
  | 'capsule'     // Cápsula Larga
  | 'bean'        // Formato Orgânico
  | 'narrative'   // Caixa Reta
  | 'whisper'     // Pontilhado
  | 'impact'      // Sólido Preto
  | 'electronic'  // Digital
  | 'heart'       // Shojo Love
  | 'fear'        // Medo/Trêmulo
  | 'ice'         // Frio/Afiado
  | 'radio'       // Transmissão
  | 'flower'      // Fofo/Pétalas
  | 'double';      // Impacto Duplo

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
