
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
      const remaining = 3 - sourceImages.length;
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
          zoom: 1.2,
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
      link.download = `seven-manga-fixed-${Date.now()}.png`;
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
        className="grid gap-3 p-4 bg-black w-full h-full border-4 border-black"
        style={{
          gridTemplateRows: count === 3 ? '1.5fr 1fr' : count === 2 ? '1fr 1fr' : '1fr',
          gridTemplateColumns: count === 3 ? '1fr 1fr' : '1fr',
        }}
      >
        {sourceImages.map((img, i) => {
          const isActive = activePanelIdx === i;
          
          return (
            <div 
              key={img.id} 
              className={`relative bg-white border-2 border-black transition-all ${
                isActive ? 'z-50 ring-4 ring-white shadow-2xl scale-[1.01]' : 'z-10 overflow-hidden'
              }`}
              style={{
                gridColumn: count === 3 && i === 0 ? 'span 2' : 'auto',
              }}
            >
              {/* Moldura de Edição Ativa (Efeito de Máscara) */}
              {isActive && (
                <div className="absolute inset-0 z-40 pointer-events-none ring-[2000px] ring-black/40"></div>
              )}
              
              <img 
                src={img.url} 
                className={`w-full h-full grayscale transition-transform duration-75 origin-center pointer-events-none ${isActive ? 'object-contain' : 'object-cover'}`}
                style={{
                  transform: `scale(${img.zoom}) translate(${img.offsetX}%, ${img.offsetY}%)`,
                  filter: 'contrast(1.1) brightness(1.02)'
                }}
              />

              <div className="absolute top-2 left-2 bg-black text-white text-[8px] font-black px-1 z-50 italic">
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-5 bg-white space-y-6">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <div className="flex flex-col">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Manga Composer</h2>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Página de 3 Quadros</span>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={sourceImages.length >= 3} 
                className={`px-3 py-1 text-[10px] font-black uppercase ${sourceImages.length >= 3 ? 'bg-gray-100 text-gray-300' : 'bg-black text-white'}`}
              >
                + Upload
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
            </div>

            <div className="space-y-4">
              {sourceImages.map((img, i) => (
                <div key={img.id} className={`border-2 p-3 transition-all ${activePanelIdx === i ? 'border-black shadow-[6px_6px_0_black]' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex gap-3">
                    <img src={img.url} className="w-12 h-12 border-2 border-black object-cover grayscale" />
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black italic uppercase">Cena {i+1}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setActivePanelIdx(activePanelIdx === i ? null : i)} className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5">
                            {activePanelIdx === i ? 'Salvar' : 'Ajustar'}
                          </button>
                          <button onClick={() => setSourceImages(p => p.filter(x => x.id !== img.id))} className="text-red-600">
                             <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </div>
                      {activePanelIdx === i && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                           <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase">Escala (Zoom)</label>
                              <input type="range" min="0.1" max="5" step="0.1" value={img.zoom} onChange={e => updateImageTransform(img.id, 'zoom', parseFloat(e.target.value))} className="w-full h-1 accent-black" />
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] font-black uppercase">Horizontal</label>
                                <input type="range" min="-150" max="150" value={img.offsetX} onChange={e => updateImageTransform(img.id, 'offsetX', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                              </div>
                              <div>
                                <label className="text-[8px] font-black uppercase">Vertical</label>
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
              <div className="pt-4 border-t-4 border-black space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase italic">Diálogos</h3>
                  <button onClick={addManualBubble} className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase">+ Balão</button>
                </div>
                <div className="space-y-3 max-h-[25vh] overflow-y-auto pr-2 custom-scrollbar">
                  {generation.suggestions.map((s, i) => (
                    <div key={i} className="border-2 border-black p-3 bg-white shadow-[3px_3px_0_black]">
                       <textarea value={s.suggestedDialogue} onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} className="w-full text-[10px] font-bold border-2 border-black p-2 h-12 resize-none outline-none focus:bg-yellow-50" />
                       <div className="grid grid-cols-2 gap-2 mt-2">
                          <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                          <input type="range" min="0" max="100" value={s.position.y} onChange={e => updatePosition(i, s.position.x, parseInt(e.target.value))} className="w-full h-1 accent-black" />
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ÁREA DE DESENHO */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="manga-panel bg-white p-6 min-h-[900px] w-full max-w-[700px] relative halftone-bg border-4 border-black flex flex-col">
            <div ref={exportRef} className="relative flex-grow bg-white w-full h-full flex flex-col border-2 border-black overflow-hidden">
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 select-none">
                  <i className="fa-solid fa-layer-group text-8xl mb-4"></i>
                  <p className="text-3xl font-black italic uppercase">Seven Mangá</p>
                  <p className="text-[10px] font-bold tracking-widest mt-2 uppercase">Layout 3 Quadros</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col">
                  {renderMangaGrid()}
                  
                  {/* BALÕES */}
                  <div className="absolute inset-0 pointer-events-none z-[100]">
                    {generation.suggestions.map((s, idx) => (
                      <div key={idx} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale || 35}%` }}>
                        <div className="bg-white border-[3px] border-black rounded-[50%] px-6 py-8 flex items-center justify-center shadow-[4px_4px_0_black] relative">
                           <p className="text-black font-black text-center text-xs leading-tight uppercase">{s.suggestedDialogue}</p>
                           <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-black"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {sourceImages.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[700px]">
              <button onClick={() => setSourceImages([])} className="py-4 bg-white border-4 border-black font-black uppercase italic shadow-[6px_6px_0_black] hover:bg-black hover:text-white transition-all">Limpar Página</button>
              <button onClick={handleDownload} disabled={isExporting} className="py-4 bg-black text-white border-4 border-black font-black uppercase italic shadow-[10px_10px_0_#ccc] flex items-center justify-center gap-2">
                {isExporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-download"></i>}
                Baixar Mangá
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
