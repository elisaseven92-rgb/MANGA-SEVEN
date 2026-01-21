
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; label: string; icon: string }[] = [
  { type: 'speech', label: 'Clássico', icon: 'fa-comment' },
  { type: 'thought', label: 'Pensamento', icon: 'fa-cloud' },
  { type: 'scream', label: 'Grito', icon: 'fa-bolt' },
  { type: 'narrative', label: 'Narração', icon: 'fa-square' },
  { type: 'whisper', label: 'Sussurro', icon: 'fa-ellipsis' },
  { type: 'wavy', label: 'Ondulado', icon: 'fa-water' },
  { type: 'impact', label: 'Impacto', icon: 'fa-burst' },
  { type: 'organic', label: 'Orgânico', icon: 'fa-circle' },
  { type: 'sharp', label: 'Afiado', icon: 'fa-diamond' },
  { type: 'modern', label: 'Moderno', icon: 'fa-rectangle-ad' },
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

  // Fix: Added missing updateImageTransform function to handle image zoom and offsets
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
      link.download = `manga-export-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
      setActivePanelIdx(originalActive);
    }
  };

  const getBubbleStyleClass = (type: BubbleType) => {
    switch (type) {
      case 'thought': return 'rounded-[50%] border-dashed border-[6px]';
      case 'scream': return 'clip-path-jagged border-[8px] scale-110';
      case 'narrative': return 'rounded-none border-[4px] shadow-[4px_4px_0_black]';
      case 'whisper': return 'rounded-[40%] border-dotted border-[3px] opacity-80';
      case 'wavy': return 'rounded-[45%] border-[5px] border-black scale-y-90';
      case 'impact': return 'rounded-xl border-[10px] bg-black text-white shadow-[8px_8px_0_#444]';
      case 'organic': return 'rounded-[30%_70%_70%_30%/30%_30%_70%_70%] border-[4px]';
      case 'sharp': return 'rounded-[5%_20%_5%_20%] border-[5px]';
      case 'modern': return 'rounded-2xl border-[4px] border-black';
      default: return 'rounded-[50%] border-[5px]';
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR CONTROLES */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-6 bg-white space-y-6 border-4 border-black shadow-[8px_8px_0_black]">
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Editor de Cena</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ajuste e Letreiramento</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
              >
                {sourceImages.length > 0 ? 'Trocar Arte' : '+ Upload'}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {sourceImages.length > 0 && (
              <div className="space-y-6">
                {/* CONTROLES DE IMAGEM */}
                <div className="bg-gray-50 p-4 border-2 border-black">
                  <h3 className="text-[11px] font-black uppercase mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-camera"></i> Enquadramento
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span>Zoom</span>
                        <span>{sourceImages[0].zoom.toFixed(2)}x</span>
                      </div>
                      <input type="range" min="0.5" max="4" step="0.01" value={sourceImages[0].zoom} onChange={e => updateImageTransform(sourceImages[0].id, 'zoom', parseFloat(e.target.value))} className="w-full h-1 accent-black" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase text-center">X</span>
                        <input type="range" min="-150" max="150" value={sourceImages[0].offsetX} onChange={e => updateImageTransform(sourceImages[0].id, 'offsetX', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase text-center">Y</span>
                        <input type="range" min="-150" max="150" value={sourceImages[0].offsetY} onChange={e => updateImageTransform(sourceImages[0].id, 'offsetY', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* LISTA DE BALÕES */}
                <div className="pt-4 border-t-2 border-dashed border-black">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[11px] font-black uppercase italic">Balões de Fala</h3>
                    <button onClick={addManualBubble} className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase hover:bg-yellow-500 hover:text-black transition-colors">+ Novo</button>
                  </div>
                  
                  <div className="space-y-6 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                    {generation.suggestions.map((s, i) => (
                      <div key={i} className="border-2 border-black p-4 bg-white shadow-[4px_4px_0_black] space-y-4">
                        <div className="flex justify-between items-start">
                           <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 italic">Balão #{i+1}</span>
                           <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== i)}))} className="text-red-600 hover:scale-110 transition-transform">
                              <i className="fa-solid fa-trash-can"></i>
                           </button>
                        </div>

                        <textarea 
                          value={s.suggestedDialogue} 
                          onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} 
                          className="w-full text-[11px] font-bold border-2 border-black p-2 h-20 resize-none outline-none focus:bg-yellow-50"
                        />

                        {/* SELETOR DE 10 ESTILOS */}
                        <div className="grid grid-cols-5 gap-2">
                          {BUBBLE_STYLES.map(style => (
                            <button 
                              key={style.type}
                              onClick={() => updateSuggestion(i, 'bubbleType', style.type)}
                              className={`p-2 border-2 border-black text-[10px] flex flex-col items-center justify-center transition-all ${s.bubbleType === style.type ? 'bg-black text-white scale-105' : 'bg-white hover:bg-gray-100'}`}
                              title={style.label}
                            >
                              <i className={`fa-solid ${style.icon} mb-1`}></i>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-400">Escala ({s.bubbleScale}%)</span>
                            <input type="range" min="10" max="80" value={s.bubbleScale} onChange={e => updateSuggestion(i, 'bubbleScale', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-400">Fonte ({s.fontSize}px)</span>
                            <input type="range" min="8" max="40" value={s.fontSize} onChange={e => updateSuggestion(i, 'fontSize', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-400">Pos X</span>
                            <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-400">Pos Y</span>
                            <input type="range" min="0" max="100" value={s.position.y} onChange={e => updatePosition(i, s.position.x, parseInt(e.target.value))} className="w-full h-1 accent-black" />
                          </div>
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
            <div ref={exportRef} className="relative flex-grow bg-white w-full h-full flex flex-col border-2 border-black overflow-hidden shadow-2xl">
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 border-4 border-dashed border-black/20 m-10">
                  <i className="fa-solid fa-wand-magic-sparkles text-8xl mb-8"></i>
                  <p className="text-4xl font-black italic uppercase tracking-tighter text-center">Letreiramento AI</p>
                  <p className="text-[12px] font-bold tracking-[0.8em] mt-3 uppercase text-center">Faça upload da sua arte</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col">
                  {/* QUADRO ÚNICO */}
                  <div className="flex-grow p-4 bg-black w-full h-full border-2 border-black">
                    <div className="relative bg-white border-4 border-black w-full h-full overflow-hidden">
                      <img 
                        src={sourceImages[0].url} 
                        className="w-full h-full grayscale transition-transform duration-75 origin-center object-cover"
                        style={{
                          transform: `scale(${sourceImages[0].zoom}) translate(${sourceImages[0].offsetX}%, ${sourceImages[0].offsetY}%)`,
                          filter: 'contrast(1.15) brightness(1.05)'
                        }}
                      />
                      <div className="absolute top-4 left-4 bg-black text-white text-[9px] font-black px-3 py-1 z-50 italic uppercase tracking-widest shadow-[4px_4px_0_white]">
                        Splash Page
                      </div>
                    </div>
                  </div>
                  
                  {/* CAMADA DE BALÕES (SEM PONTEIROS) */}
                  <div className="absolute inset-0 pointer-events-none z-[100]">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" 
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale}%` }}
                      >
                        <div 
                          className={`bg-white border-black px-6 py-8 flex items-center justify-center text-center transition-all ${getBubbleStyleClass(s.bubbleType)}`}
                          style={{ minHeight: '80px', width: '100%', color: s.bubbleType === 'impact' ? '#fff' : '#000' }}
                        >
                           <p className="font-black leading-[1.1] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
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
            <div className="mt-8 flex gap-6 w-full max-w-[650px]">
              <button 
                onClick={handleDownload} 
                disabled={isExporting} 
                className="flex-grow py-5 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[10px_10px_0_#ccc] flex items-center justify-center gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
              >
                {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
                Exportar Mangá
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .clip-path-jagged {
          clip-path: polygon(
            0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 
            100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%
          );
        }
      `}</style>
    </Layout>
  );
}
