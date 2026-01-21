
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
  | 'speech'      | 'scream'     | 'shock'       | 'burst'      | 'thought'
  | 'soft-rect'   | 'trapezoid'  | 'starburst'   | 'capsule'    | 'bean'
  | 'narrative'   | 'whisper'    | 'impact'      | 'electronic' | 'heart'
  | 'fear'        | 'ice'        | 'radio'       | 'flower'     | 'double'
  | 'dripping'    | 'mechanical' | 'sharp'       | 'cloud-puffy'| 'spiky-thought'
  | 'shojo-spark' | 'double-oval'| 'comic-boom'  | 'scroll'     | 'zig-zag';

export interface SceneSuggestion {
  id: string;
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
  zIndex: number;
  showTail?: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  isAnalyzing: boolean;
  statusMessage: string;
  error: string | null;
  resultUrl: string | null;
  suggestions: SceneSuggestion[];
}
