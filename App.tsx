
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
          zoom: 1.1, // Começa com um leve zoom para garantir preenchimento
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
      await new Promise(r => setTimeout(r, 300));
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

  const bubbleOptions: { label: string; value: BubbleType; icon: string }[] = [
    { label: 'Fala', value: 'speech', icon: 'fa-comment' },
    { label: 'Pensa', value: 'thought', icon: 'fa-cloud' },
    { label: 'Grito', value: 'scream', icon: 'fa-bolt' },
    { label: 'Nuvem', value: 'wavy', icon: 'fa-cloud-meatball' },
    { label: 'Modern', value: 'modern', icon: 'fa-window-maximize' },
    { label: 'Sharp', value: 'sharp', icon: 'fa-caret-up' },
    { label: 'Organic', value: 'organic', icon: 'fa-circle-nodes' },
    { label: 'Narra', value: 'narrative', icon: 'fa-square' },
    { label: 'Sussu', value: 'whisper', icon: 'fa-ellipsis' },
  ];

  const getBubbleStyles = (type: BubbleType) => {
    const base = "w-full h-full bg-white flex items-center justify-center border-black transition-all";
    switch (type) {
      case 'scream':
        return `${base} [clip-path:polygon(0%_20%,_5%_0%,_20%_15%,_35%_0%,_50%_15%,_65%_0%,_80%_15%,_95%_0%,_100%_20%,_85%_35%,_100%_50%,_85%_65%,_100%_80%,_95%_100%,_80%_85%,_65%_100%,_50%_85%,_35%_100%,_20%_85%,_5%_100%,_0%_80%,_15%_65%,_0%_50%,_15%_35%)] px-14 py-14`;
      case 'wavy':
        return `${base} [clip-path:polygon(20%_0%,_35%_5%,_50%_0%,_65%_5%,_80%_0%,_100%_20%,_95%_35%,_100%_50%,_95%_65%,_100%_80%,_80%_100%,_65%_95%,_50%_100%,_35%_95%,_20%_100%,_0%_80%,_5%_65%,_0%_50%,_5%_35%,_0%_20%)] px-12 py-12`;
      case 'thought':
        return `${base} border-[4px] rounded-[100%] px-10 py-12`;
      case 'modern':
        return `${base} border-[4px] rounded-3xl px-8 py-10`;
      case 'organic':
        return `${base} border-[4px] [border-radius:55%_45%_35%_65%_/_65%_35%_45%_55%] px-10 py-12`;
      case 'sharp':
        return `${base} border-[4px] [clip-path:polygon(10%_0%,_90%_0%,_100%_20%,_100%_80%,_90%_100%,_10%_100%,_0%_80%,_0%_20%)] px-10 py-12`;
      case 'narrative':
        return `${base} border-[5px] px-6 py-4 rounded-none shadow-[2px_2px_0_black]`;
      case 'whisper':
        return `${base} border-[3px] border-dashed rounded-[50%] px-8 py-10`;
      default:
        return `${base} border-[4px] rounded-[50%] px-10 py-12`;
    }
  };

  const getFilter = (type: BubbleType) => {
    if (['scream', 'wavy', 'sharp'].includes(type)) {
      return "relative [filter:drop-shadow(3px_0_0_black)_drop-shadow(-3px_0_0_black)_drop-shadow(0_3px_0_black)_drop-shadow(0_-3px_0_black)]";
    }
    return "relative";
  };

  const renderMangaGrid = () => {
    const count = sourceImages.length;
    if (count === 0) return null;

    return (
      <div 
        className="grid gap-4 p-4 bg-black w-full h-full flex-grow border-4 border-black"
        style={{
          gridTemplateRows: count === 3 ? '1.2fr 1fr' : count === 2 ? '1fr 1fr' : '1fr',
          gridTemplateColumns: count === 3 ? '1fr 1fr' : '1fr',
        }}
      >
        {sourceImages.map((img, i) => {
          const isActive = activePanelIdx === i;
          
          return (
            <div 
              key={img.id} 
              className={`relative bg-white border-2 border-black transition-all group ${
                isActive ? 'z-50 shadow-2xl' : 'z-10 overflow-hidden'
              }`}
              style={{
                gridColumn: count === 3 && i === 0 ? 'span 2' : 'auto',
              }}
            >
              {/* Moldura de Edição (Máscara Ativa) */}
              {isActive && (
                <div className="absolute inset-0 z-40 pointer-events-none ring-[2000px] ring-black/60"></div>
              )}
              
              <img 
                src={img.url} 
                className={`w-full h-full grayscale transition-transform duration-75 origin-center pointer-events-none ${isActive ? 'object-contain' : 'object-cover'}`}
                style={{
                  transform: `scale(${img.zoom}) translate(${img.offsetX}%, ${img.offsetY}%)`,
                  filter: 'contrast(1.15) brightness(1.05)'
                }}
              />

              {/* Indicador de quadro */}
              <div className="absolute top-2 left-2 bg-black text-white text-[8px] font-black px-1.5 py-0.5 z-50 italic select-none">
                {i + 1}
              </div>

              {/* Overlay de auxílio visual */}
              {isActive && (
                <div className="absolute inset-0 z-50 border-2 border-dashed border-white/40 pointer-events-none flex items-center justify-center">
                   <div className="w-1/2 h-full border-x border-white/20"></div>
                   <div className="h-1/2 w-full border-y border-white/20 absolute"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const removeImage = (id: string) => {
    setSourceImages(prev => prev.filter(img => img.id !== id));
    if (activePanelIdx !== null) setActivePanelIdx(null);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR DE CONTROLES */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-5 bg-white space-y-6">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <div className="flex flex-col">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Manga Composer</h2>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Controle de Máscara Profissional</span>
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={sourceImages.length >= 3} className={`px-3 py-1 text-[10px] font-black uppercase transition-all ${sourceImages.length >= 3 ? 'bg-gray-100 text-gray-400' : 'bg-black text-white hover:bg-gray-800'}`}>
                + Upload
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
            </div>

            <div className="space-y-4">
              {sourceImages.map((img, i) => (
                <div key={img.id} className={`border-2 p-3 transition-all ${activePanelIdx === i ? 'border-black bg-white shadow-[6px_6px_0_black]' : 'border-gray-100 bg-gray-50 opacity-80'}`}>
                  <div className="flex gap-3">
                    <div className="w-14 h-14 border-2 border-black flex-shrink-0 bg-white overflow-hidden">
                       <img src={img.url} className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase italic">Quadro {i+1}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setActivePanelIdx(activePanelIdx === i ? null : i)} className={`text-[9px] font-black px-2 py-0.5 border-2 border-black uppercase ${activePanelIdx === i ? 'bg-black text-white' : 'bg-white'}`}>
                            {activePanelIdx === i ? 'Salvo' : 'Ajustar'}
                          </button>
                          <button onClick={() => removeImage(img.id)} className="text-red-600 hover:scale-110">
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </div>
                      
                      {activePanelIdx === i && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in fade-in duration-300">
                           <div className="space-y-1">
                              <div className="flex justify-between text-[8px] font-black uppercase italic">
                                <span>Zoom da Máscara</span>
                                <span>{img.zoom.toFixed(1)}x</span>
                              </div>
                              <input type="range" min="0.1" max="5" step="0.1" value={img.zoom} onChange={e => updateImageTransform(img.id, 'zoom', parseFloat(e.target.value))} className="w-full h-1 accent-black" />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase text-center block">Mover X</span>
                                <input type="range" min="-150" max="150" value={img.offsetX} onChange={e => updateImageTransform(img.id, 'offsetX', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] font-black uppercase text-center block">Mover Y</span>
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
                  <h3 className="text-xs font-black uppercase italic">Adicionar Falas</h3>
                  <button onClick={addManualBubble} className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter hover:bg-yellow-500 hover:text-black">+ Novo Balão</button>
                </div>
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {generation.suggestions.map((s, i) => (
                    <div key={i} className="border-2 border-black p-3 bg-white shadow-[3px_3px_0_black] transition-all hover:translate-x-0.5">
                       <textarea value={s.suggestedDialogue} onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} className="w-full text-[10px] font-bold border-2 border-black p-2 h-14 resize-none outline-none focus:bg-yellow-50" />
                       <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[7px] font-black uppercase opacity-50">Local X</span>
                            <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[7px] font-black uppercase opacity-50">Local Y</span>
                            <input type="range" min="0" max="100" value={s.position.y} onChange={e => updatePosition(i, s.position.x, parseInt(e.target.value))} className="w-full h-1 accent-black" />
                          </div>
                       </div>
                       <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== i)}))} className="text-[7px] font-black uppercase text-red-600 mt-2 hover:underline">Remover Diálogo</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ÁREA DA FOLHA DE MANGÁ */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="manga-panel bg-white p-6 min-h-[900px] w-full max-w-[700px] relative halftone-bg border-4 border-black flex flex-col">
            <div ref={exportRef} className="relative flex-grow bg-white w-full h-full flex flex-col border-2 border-black overflow-hidden shadow-inner">
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 select-none m-12 border-4 border-dashed border-black/20">
                  <i className="fa-solid fa-wand-magic-sparkles text-8xl mb-6"></i>
                  <p className="text-3xl font-black italic uppercase">Seven Mangá</p>
                  <p className="text-[10px] font-bold tracking-[0.8em] mt-2">MONOCHROME ENGINE</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex-grow flex flex-col">
                  {renderMangaGrid()}
                  
                  {/* CAMADA DE BALÕES DE FALA */}
                  <div className="absolute inset-0 pointer-events-none z-[100]">
                    {generation.suggestions.map((s, idx) => {
                      const scale = s.bubbleScale || 35;
                      return (
                        <div key={idx} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${scale}%`, zIndex: 100 + idx }}>
                          <div className="relative [filter:drop-shadow(3px_3px_0_black)]">
                            <div className="bg-white border-[4px] border-black rounded-[50%] px-6 py-10 flex items-center justify-center min-h-[80px]">
                              <p className="text-black font-black text-center text-xs leading-[1.1] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize || 14}px` }}>{s.suggestedDialogue}</p>
                            </div>
                            {/* Rabicho simples */}
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-black"></div>
                            <div className="absolute -bottom-[12px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-white"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {sourceImages.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[700px]">
              <button onClick={() => { setSourceImages([]); setGeneration(p => ({...p, suggestions: []})); setActivePanelIdx(null); }} className="py-4 bg-white border-4 border-black font-black uppercase italic tracking-widest shadow-[8px_8px_0_black] hover:bg-black hover:text-white transition-all">Limpar Tudo</button>
              <button onClick={handleDownload} disabled={isExporting} className="py-4 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[12px_12px_0_#ccc] flex items-center justify-center gap-3 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                {isExporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-down"></i>}
                Exportar Arte
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
