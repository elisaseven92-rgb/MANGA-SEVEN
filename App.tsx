
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

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
      const remaining = 2 - sourceImages.length;
      if (remaining <= 0) return;

      const newImages: MangaImage[] = [];
      const filesArray = Array.from(files).slice(0, remaining) as File[];

      for (const file of filesArray) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
        
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          url: base64,
          base64: base64,
          mimeType: file.type,
          zoom: 1.2, // Zoom inicial para garantir preenchimento da máscara
          offsetX: 0,
          offsetY: 0,
        });
      }

      const updatedImages = [...sourceImages, ...newImages];
      setSourceImages(updatedImages);
      
      if (updatedImages.length > 0) {
        triggerAIAnalysis(updatedImages);
      }
    }
  };

  const triggerAIAnalysis = async (images: MangaImage[]) => {
    setGeneration(prev => ({ ...prev, isAnalyzing: true, error: null }));
    try {
      // Analisa a página para sugestão de balões baseada no contexto visual
      const analysis = await analyzeMangaPage(images[0].base64, images[0].mimeType);
      setGeneration(prev => ({ ...prev, suggestions: analysis, isAnalyzing: false }));
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false, error: "Modo manual ativado." }));
    }
  };

  const updateImageTransform = (id: string, field: 'zoom' | 'offsetX' | 'offsetY', val: number) => {
    setSourceImages(prev => prev.map(img => img.id === id ? { ...img, [field]: val } : img));
  };

  const addManualBubble = () => {
    const newSug: SceneSuggestion = {
      panelNumber: 1,
      description: "Novo Balão",
      suggestedDialogue: "Estou pronto para sair da vila. Depois de treinar por dez anos, sinto-me forte",
      position: { x: 50, y: 30 },
      tailAngle: 150,
      tailLength: 40,
      fontSize: 18,
      bubbleScale: 35,
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

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    const originalActive = activePanelIdx;
    setActivePanelIdx(null); 
    
    try {
      await new Promise(r => setTimeout(r, 400));
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `seven-manga-2panels-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
      setActivePanelIdx(originalActive);
    }
  };

  const renderMangaGrid = () => {
    const count = sourceImages.length;
    if (count === 0) return null;

    return (
      <div 
        className="grid gap-6 p-6 bg-black w-full h-full border-4 border-black"
        style={{
          gridTemplateRows: count === 2 ? '1fr 1fr' : '1fr',
          gridTemplateColumns: '1fr',
        }}
      >
        {sourceImages.map((img, i) => {
          const isActive = activePanelIdx === i;
          
          return (
            <div 
              key={img.id} 
              className={`relative bg-white border-4 border-black transition-all group ${
                isActive ? 'z-50 ring-8 ring-white shadow-2xl scale-[1.01]' : 'z-10 overflow-hidden'
              }`}
            >
              {/* Efeito de Máscara Profissional (Overlay) */}
              {isActive && (
                <div className="absolute inset-0 z-40 pointer-events-none ring-[3000px] ring-black/50"></div>
              )}
              
              <img 
                src={img.url} 
                className={`w-full h-full grayscale transition-transform duration-75 origin-center pointer-events-none ${isActive ? 'object-contain' : 'object-cover'}`}
                style={{
                  transform: `scale(${img.zoom}) translate(${img.offsetX}%, ${img.offsetY}%)`,
                  filter: 'contrast(1.1) brightness(1.05)'
                }}
              />

              <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black px-3 py-1 z-50 italic uppercase tracking-widest shadow-[4px_4px_0_white]">
                Cena {i + 1}
              </div>

              {isActive && (
                <div className="absolute inset-0 z-50 border-2 border-dashed border-white/40 pointer-events-none flex items-center justify-center">
                   <div className="w-px h-full bg-white/20"></div>
                   <div className="h-px w-full bg-white/20 absolute"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR DE CONTROLES */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-6 bg-white space-y-6">
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div className="flex flex-col">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Manga Composer</h2>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Layout de 2 Quadros</span>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={sourceImages.length >= 2} 
                className={`px-4 py-2 text-[10px] font-black uppercase transition-all border-2 border-black ${sourceImages.length >= 2 ? 'bg-gray-100 text-gray-300 border-gray-100' : 'bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'}`}
              >
                + Adicionar
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
            </div>

            <div className="space-y-5">
              {sourceImages.map((img, i) => (
                <div key={img.id} className={`border-2 p-4 transition-all ${activePanelIdx === i ? 'border-black bg-white shadow-[10px_10px_0_black]' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 border-2 border-black flex-shrink-0 bg-white overflow-hidden">
                       <img src={img.url} className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-black italic uppercase">Cena {i+1}</span>
                        <div className="flex gap-3">
                          <button onClick={() => setActivePanelIdx(activePanelIdx === i ? null : i)} className={`text-[10px] font-black uppercase px-3 py-1 border-2 border-black transition-colors ${activePanelIdx === i ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>
                            {activePanelIdx === i ? 'Salvar' : 'Enquadrar'}
                          </button>
                          <button onClick={() => setSourceImages(p => p.filter(x => x.id !== img.id))} className="text-red-600 hover:scale-110 transition-transform">
                             <i className="fa-solid fa-trash-can text-sm"></i>
                          </button>
                        </div>
                      </div>
                      
                      {activePanelIdx === i && (
                        <div className="mt-4 space-y-5 border-t border-gray-200 pt-4 animate-in slide-in-from-top-2 duration-300">
                           <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[9px] font-black uppercase">Recorte (Zoom)</label>
                                <span className="text-[9px] font-bold text-gray-500">{img.zoom.toFixed(2)}x</span>
                              </div>
                              <input type="range" min="0.5" max="4" step="0.01" value={img.zoom} onChange={e => updateImageTransform(img.id, 'zoom', parseFloat(e.target.value))} className="w-full h-1 accent-black" />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-black uppercase">Deslocamento X</label>
                                <input type="range" min="-150" max="150" value={img.offsetX} onChange={e => updateImageTransform(img.id, 'offsetX', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                              </div>
                              <div className="space-y-1 text-center">
                                <label className="text-[9px] font-black uppercase">Deslocamento Y</label>
                                <input type="range" min="-150" max="150" value={img.offsetY} onChange={e => updateImageTransform(img.id, 'offsetY', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sourceImages.length > 0 && (
              <div className="pt-6 border-t-4 border-black space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase italic tracking-tighter">Letreiramento</h3>
                  <button onClick={addManualBubble} className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase hover:bg-yellow-500 hover:text-black transition-colors shadow-[2px_2px_0_black]">+ Novo Balão</button>
                </div>
                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {generation.suggestions.map((s, i) => (
                    <div key={i} className="border-2 border-black p-3 bg-white shadow-[6px_6px_0_black] transition-transform hover:translate-x-0.5">
                       <textarea 
                        value={s.suggestedDialogue} 
                        onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} 
                        className="w-full text-[11px] font-bold border-2 border-black p-2 h-20 resize-none outline-none focus:bg-yellow-50 leading-tight" 
                        placeholder="Digite o diálogo aqui..."
                       />
                       <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-400">Horizontal</span>
                            <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-gray-400">Vertical</span>
                            <input type="range" min="0" max="100" value={s.position.y} onChange={e => updatePosition(i, s.position.x, parseInt(e.target.value))} className="w-full h-1 accent-black" />
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ÁREA DA PÁGINA (RENDER) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="manga-panel bg-white p-8 min-h-[900px] w-full max-w-[700px] relative halftone-bg border-4 border-black flex flex-col">
            <div ref={exportRef} className="relative flex-grow bg-white w-full h-full flex flex-col border-2 border-black overflow-hidden shadow-2xl">
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 select-none border-4 border-dashed border-black/20 m-12">
                  <i className="fa-solid fa-clone text-8xl mb-8"></i>
                  <p className="text-4xl font-black italic uppercase tracking-tighter">Seven Mangá</p>
                  <p className="text-[12px] font-bold tracking-[0.8em] mt-3 uppercase">Dual Panel Composition</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col">
                  {renderMangaGrid()}
                  
                  {/* CAMADA DE BALÕES (LAYER SUPERIOR) */}
                  <div className="absolute inset-0 pointer-events-none z-[100]">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className="absolute transform -translate-x-1/2 -translate-y-1/2" 
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale || 35}%` }}
                      >
                        <div className="bg-white border-[4px] border-black rounded-[50%] px-7 py-10 flex items-center justify-center shadow-[8px_8px_0_black] relative min-h-[90px]">
                           <p className="text-black font-black text-center text-xs leading-[1.1] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize || 14}px` }}>{s.suggestedDialogue}</p>
                           {/* Rabicho (Tail) do Balão */}
                           <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[25px] border-t-black"></div>
                           <div className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-white"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {sourceImages.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-6 w-full max-w-[700px]">
              <button 
                onClick={() => {setSourceImages([]); setGeneration(p => ({...p, suggestions: []})); setActivePanelIdx(null);}} 
                className="py-5 bg-white border-4 border-black font-black uppercase italic tracking-widest shadow-[10px_10px_0_black] hover:bg-black hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Limpar Arte
              </button>
              <button 
                onClick={handleDownload} 
                disabled={isExporting} 
                className="py-5 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[14px_14px_0_#ccc] flex items-center justify-center gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
                Exportar Mangá
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
