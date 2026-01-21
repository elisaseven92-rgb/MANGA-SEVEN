
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; label: string; icon: string }[] = [
  { type: 'speech', label: 'Comum', icon: 'fa-comment' },
  { type: 'thought', label: 'Pensamento', icon: 'fa-cloud' },
  { type: 'scream', label: 'Grito', icon: 'fa-bolt' },
  { type: 'whisper', label: 'Sussurro', icon: 'fa-ellipsis' },
  { type: 'unison', label: 'Uníssono', icon: 'fa-users' },
  { type: 'electronic', label: 'Eletrônico', icon: 'fa-microchip' },
  { type: 'fear', label: 'Medo', icon: 'fa-ghost' },
  { type: 'narrative', label: 'Recordatório', icon: 'fa-square' },
  { type: 'impact', label: 'Impacto', icon: 'fa-burst' },
  { type: 'poetic', label: 'Poético', icon: 'fa-wind' },
];

export default function App() {
  const [sourceImages, setSourceImages] = useState<MangaImage[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activePanelIdx, setActivePanelIdx] = useState<number | null>(null);
  const [generation, setGeneration] = useState<GenerationState>({
    isGenerating: false,
    isAnalyzing: false,
    error: null,
    resultUrl: null,
    suggestions: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(files[0]);
      });
      
      setSourceImages([{
        id: Math.random().toString(36).substr(2, 9),
        url: base64,
        base64: base64,
        mimeType: files[0].type,
        zoom: 1.1,
        offsetX: 0,
        offsetY: 0,
      }]);
      
      triggerAIAnalysis(base64, files[0].type);
    }
  };

  const triggerAIAnalysis = async (base64: string, mime: string) => {
    setGeneration(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const analysis = await analyzeMangaPage(base64, mime);
      setGeneration(prev => ({ ...prev, suggestions: analysis, isAnalyzing: false }));
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const addManualBubble = () => {
    const newSug: SceneSuggestion = {
      panelNumber: 1,
      description: "Novo Balão",
      suggestedDialogue: "Estou pronto para sair da vila. Depois de treinar por dez anos, sinto-me forte",
      position: { x: 50, y: 30 },
      tailAngle: 0,
      tailLength: 0,
      fontSize: 18,
      bubbleScale: 40,
      bubbleType: 'speech',
      readingOrder: generation.suggestions.length + 1
    };
    setGeneration(prev => ({ ...prev, suggestions: [...prev.suggestions, newSug] }));
  };

  const updateSuggestion = (idx: number, field: keyof SceneSuggestion, val: any) => {
    const newSugs = [...generation.suggestions];
    (newSugs[idx] as any)[field] = val;
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const updatePosition = (idx: number, x: number, y: number) => {
    const newSugs = [...generation.suggestions];
    newSugs[idx].position = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const updateImageTransform = (id: string, field: keyof MangaImage, val: number) => {
    setSourceImages(prev => prev.map(img => img.id === id ? { ...img, [field]: val } : img));
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    const originalActive = activePanelIdx;
    setActivePanelIdx(null);
    try {
      await new Promise(r => setTimeout(r, 400));
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `seven-manga-splash-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
      setActivePanelIdx(originalActive);
    }
  };

  const getBubbleStyleClass = (type: BubbleType) => {
    switch (type) {
      case 'thought': return 'rounded-[50%] border-dashed border-[5px] bubble-thought-bg shadow-[0_0_15px_rgba(0,0,0,0.1)]';
      case 'scream': return 'clip-path-scream border-[8px] bg-white scale-110';
      case 'whisper': return 'rounded-[40%] border-dotted border-[3px] border-gray-400 opacity-70';
      case 'unison': return 'rounded-[50%] border-[6px] border-black ring-4 ring-black ring-offset-[-8px]';
      case 'electronic': return 'rounded-none border-[4px] border-black skew-x-[-5deg] animate-glitch';
      case 'fear': return 'rounded-[50%] border-[4px] border-black animate-fear-wiggle opacity-90';
      case 'narrative': return 'rounded-none border-[4px] bg-white shadow-[6px_6px_0_black]';
      case 'impact': return 'rounded-lg border-[10px] bg-black text-white border-black';
      case 'poetic': return 'rounded-[40%_60%_70%_30%/50%_40%_60%_50%] border-[4px] border-black';
      default: return 'rounded-[50%] border-[5px] border-black';
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-6 bg-white border-4 border-black shadow-[8px_8px_0_black]">
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Manga Lettering</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">10 Estilos Profissionais</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
              >
                Upload Arte
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {sourceImages.length > 0 && (
              <div className="space-y-6 mt-4">
                <div className="bg-gray-50 p-4 border-2 border-black">
                  <h3 className="text-[10px] font-black uppercase mb-3">Enquadramento</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                     <div className="col-span-2 space-y-1">
                        <div className="flex justify-between text-[8px] font-black uppercase">
                          <span>Zoom</span>
                          <span>{sourceImages[0].zoom.toFixed(2)}x</span>
                        </div>
                        <input type="range" min="0.5" max="3" step="0.01" value={sourceImages[0].zoom} onChange={e => updateImageTransform(sourceImages[0].id, 'zoom', parseFloat(e.target.value))} className="w-full h-1 accent-black" />
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-dashed border-black">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase italic">Balões</h3>
                    <button onClick={addManualBubble} className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase shadow-[2px_2px_0_black]">+ Adicionar</button>
                  </div>
                  
                  <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {generation.suggestions.map((s, i) => (
                      <div key={i} className="border-2 border-black p-4 bg-white shadow-[4px_4px_0_black] space-y-3">
                        <div className="flex justify-between">
                           <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5">Balão {i+1}</span>
                           <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== i)}))} className="text-red-600">
                              <i className="fa-solid fa-trash-can text-xs"></i>
                           </button>
                        </div>

                        <textarea 
                          value={s.suggestedDialogue} 
                          onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} 
                          className="w-full text-[11px] font-bold border-2 border-black p-2 h-16 resize-none focus:bg-yellow-50"
                        />

                        {/* SELETOR DE 10 ESTILOS */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {BUBBLE_STYLES.map(style => (
                            <button 
                              key={style.type}
                              onClick={() => updateSuggestion(i, 'bubbleType', style.type)}
                              className={`p-2 border border-black text-[9px] flex flex-col items-center justify-center transition-all ${s.bubbleType === style.type ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
                              title={style.label}
                            >
                              <i className={`fa-solid ${style.icon} mb-0.5`}></i>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                           <input type="range" min="10" max="80" value={s.bubbleScale} onChange={e => updateSuggestion(i, 'bubbleScale', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                           <input type="range" min="10" max="40" value={s.fontSize} onChange={e => updateSuggestion(i, 'fontSize', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                           <input type="range" min="0" max="100" value={s.position.y} onChange={e => updatePosition(i, s.position.x, parseInt(e.target.value))} className="w-full h-1 accent-black" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ÁREA DE RENDERIZAÇÃO */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="manga-panel bg-white p-8 min-h-[850px] w-full max-w-[650px] relative halftone-bg border-4 border-black flex flex-col">
            <div ref={exportRef} className="relative flex-grow bg-white w-full h-full border-2 border-black overflow-hidden shadow-2xl">
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 border-4 border-dashed border-black/20 m-10">
                  <i className="fa-solid fa-feather-pointed text-8xl mb-8"></i>
                  <p className="text-4xl font-black italic uppercase tracking-tighter">Splash Frame</p>
                  <p className="text-[12px] font-bold tracking-[0.6em] mt-3 uppercase text-center">Inicie seu projeto</p>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <div className="w-full h-full bg-black">
                     <img 
                        src={sourceImages[0].url} 
                        className="w-full h-full grayscale object-cover"
                        style={{
                          transform: `scale(${sourceImages[0].zoom}) translate(${sourceImages[0].offsetX}%, ${sourceImages[0].offsetY}%)`,
                          filter: 'contrast(1.2) brightness(1.05)'
                        }}
                      />
                  </div>
                  
                  {/* CAMADA DE BALÕES SEM PONTEIROS */}
                  <div className="absolute inset-0 pointer-events-none">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" 
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale}%` }}
                      >
                        <div 
                          className={`bg-white p-6 flex items-center justify-center text-center transition-all ${getBubbleStyleClass(s.bubbleType)}`}
                          style={{ 
                            minHeight: '80px', 
                            width: '100%', 
                            color: s.bubbleType === 'impact' ? '#fff' : '#000',
                            borderColor: s.bubbleType === 'whisper' ? '#9ca3af' : '#000'
                          }}
                        >
                           <p className="font-black leading-[1.0] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
                             {s.suggestedDialogue}
                           </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {sourceImages.length > 0 && (
            <button 
              onClick={handleDownload} 
              disabled={isExporting} 
              className="mt-8 w-full max-w-[650px] py-5 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[10px_10px_0_#ccc] flex items-center justify-center gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
              Exportar Arte Final
            </button>
          )}
        </div>
      </div>

      <style>{`
        .clip-path-scream {
          clip-path: polygon(
            0% 15%, 15% 5%, 30% 15%, 50% 0%, 70% 15%, 85% 5%, 100% 15%,
            95% 40%, 100% 50%, 95% 65%, 100% 85%, 85% 95%, 70% 85%, 50% 100%, 30% 85%, 15% 95%, 0% 85%,
            5% 65%, 0% 50%, 5% 40%
          );
        }
        @keyframes glitch {
          0% { transform: skew(0deg); }
          50% { transform: skew(2deg); }
          100% { transform: skew(-1deg); }
        }
        .animate-glitch { animation: glitch 0.5s infinite alternate; }
        
        @keyframes fear {
          0% { transform: scale(1) translate(0, 0); }
          33% { transform: scale(1.02) translate(1px, -1px); }
          66% { transform: scale(0.98) translate(-1px, 1px); }
          100% { transform: scale(1) translate(0, 0); }
        }
        .animate-fear-wiggle { animation: fear 0.2s infinite ease-in-out; }
        
        .bubble-thought-bg {
          background-image: radial-gradient(circle at center, #fff 70%, transparent 71%);
          background-size: 20px 20px;
        }
      `}</style>
    </Layout>
  );
}
