
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
      const newImages: MangaImage[] = [];
      const filesArray = Array.from(files).slice(0, 4 - sourceImages.length) as File[];

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
          zoom: 1,
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
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `manga-page-${Date.now()}.png`;
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

    // A grade sempre mantém overflow: visible se algo estiver sendo editado para evitar cortes visuais
    let gridClass = `grid gap-3 bg-black p-3 border-4 border-black h-full w-full transition-all ${activePanelIdx !== null ? 'overflow-visible' : 'overflow-hidden'}`;
    
    if (count === 1) gridClass += " grid-cols-1";
    else if (count === 2) gridClass += " grid-cols-1 grid-rows-2";
    else if (count === 3) gridClass += " grid-cols-2 grid-rows-2";
    else if (count === 4) gridClass += " grid-cols-2 grid-rows-2";

    return (
      <div className={gridClass} style={{ minHeight: '100%' }}>
        {sourceImages.map((img, i) => {
          const isActive = activePanelIdx === i;
          let spanClass = `relative bg-white transition-all ${isActive ? 'z-50 overflow-visible ring-4 ring-black shadow-2xl' : 'overflow-hidden'}`;
          
          if (count === 3 && i === 0) spanClass += " col-span-2";
          
          return (
            <div key={img.id} className={spanClass}>
              {isActive && (
                <div className="absolute inset-0 border-2 border-black/30 pointer-events-none z-10 bg-white/10"></div>
              )}
              
              <img 
                src={img.url} 
                alt="Manga Panel" 
                className="w-full h-full object-cover grayscale contrast-125 transition-transform duration-75 origin-center pointer-events-none" 
                style={{
                  transform: `scale(${img.zoom}) translate(${img.offsetX}%, ${img.offsetY}%)`
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const removeImage = (id: string) => {
    setSourceImages(prev => prev.filter(img => img.id !== id));
    setActivePanelIdx(null);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR DE CONTROLE */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-5 bg-white space-y-6">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Manga Composer</h2>
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">+ Adicionar</button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
              </div>
            </div>

            {/* GESTÃO DE CENAS */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase border-b-2 border-gray-100 pb-1 flex items-center gap-2">
                <i className="fa-solid fa-images"></i> Painéis da Página
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {sourceImages.map((img, i) => (
                  <div key={img.id} className={`border-2 p-3 bg-gray-50 transition-colors ${activePanelIdx === i ? 'border-black bg-white shadow-[6px_6px_0_black]' : 'border-gray-200'}`}>
                    <div className="flex gap-3 mb-2">
                      <div className="relative w-16 h-16 border-2 border-black flex-shrink-0 overflow-hidden bg-white">
                        <img src={img.url} className="w-full h-full object-cover grayscale" />
                      </div>
                      <div className="flex-grow space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase italic">Cena {i+1}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setActivePanelIdx(activePanelIdx === i ? null : i)}
                              className={`text-[9px] px-2 py-0.5 border-2 border-black font-black uppercase transition-all ${activePanelIdx === i ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                            >
                              {activePanelIdx === i ? 'Concluir' : 'Ajustar'}
                            </button>
                            <button onClick={() => removeImage(img.id)} className="text-red-600 hover:scale-110 transition-transform p-1">
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </div>
                        {activePanelIdx === i && (
                          <div className="space-y-4 pt-3 animate-in slide-in-from-top-1 duration-200 border-t border-gray-200 mt-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-black uppercase italic">
                                <span>Zoom</span>
                                <span>{img.zoom.toFixed(1)}x</span>
                              </div>
                              <input 
                                type="range" min="0.5" max="4" step="0.1" 
                                value={img.zoom} 
                                onChange={e => updateImageTransform(img.id, 'zoom', parseFloat(e.target.value))} 
                                className="w-full h-1 accent-black"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase italic block text-center">Horizontal</span>
                                <input 
                                  type="range" min="-200" max="200" step="1" 
                                  value={img.offsetX} 
                                  onChange={e => updateImageTransform(img.id, 'offsetX', parseInt(e.target.value))} 
                                  className="w-full h-1 accent-black"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase italic block text-center">Vertical</span>
                                <input 
                                  type="range" min="-200" max="200" step="1" 
                                  value={img.offsetY} 
                                  onChange={e => updateImageTransform(img.id, 'offsetY', parseInt(e.target.value))} 
                                  className="w-full h-1 accent-black"
                                />
                              </div>
                            </div>
                            <div className="bg-blue-50 p-2 text-[8px] font-bold border border-blue-200 rounded text-blue-900 leading-tight">
                              <i className="fa-solid fa-arrows-up-down-left-right mr-1"></i>
                              ENQUADRAMENTO: Use os controles para posicionar a imagem. O corte visual foi removido durante o ajuste para facilitar.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {sourceImages.length < 4 && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 cursor-pointer hover:border-black hover:text-black text-gray-400 transition-all font-black text-xs uppercase"
                  >
                    <i className="fa-solid fa-plus-circle"></i> Novo Painel
                  </button>
                )}
              </div>
            </div>

            {sourceImages.length > 0 && (
              <div className="space-y-4 pt-4 border-t-4 border-black">
                <div className="flex justify-between items-center">
                   <h3 className="text-sm font-black uppercase">Balões de Diálogo</h3>
                   <button onClick={addManualBubble} className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase italic">+ Novo</button>
                </div>
                
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {generation.suggestions.map((s, i) => (
                    <div key={i} className="border-2 border-black p-3 space-y-3 bg-white shadow-[3px_3px_0px_#000]">
                      <div className="grid grid-cols-5 gap-1">
                        {bubbleOptions.map(opt => (
                          <button key={opt.value} onClick={() => updateSuggestion(i, 'bubbleType', opt.value)} className={`p-1 border-2 border-black text-[7px] font-black transition-all ${s.bubbleType === opt.value ? 'bg-black text-white' : 'bg-white'}`} title={opt.label}>
                            <i className={`fa-solid ${opt.icon}`}></i>
                          </button>
                        ))}
                        <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== i)}))} className="p-1 border-2 border-black text-[7px] font-black text-red-600">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                      <textarea value={s.suggestedDialogue} onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} className="w-full text-[10px] font-bold border-2 border-black p-1.5 h-12 resize-none focus:bg-yellow-50 outline-none" />
                      
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                          <label className="text-[7px] font-black uppercase">Tamanho</label>
                          <input type="range" min="10" max="80" value={s.bubbleScale} onChange={e => updateSuggestion(i, 'bubbleScale', parseInt(e.target.value))} className="w-full accent-black h-1" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[7px] font-black uppercase">Rotação</label>
                          <input type="range" min="0" max="360" value={s.tailAngle} onChange={e => updateSuggestion(i, 'tailAngle', parseInt(e.target.value))} className="w-full accent-black h-1" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                         <div className="flex flex-col gap-1">
                            <span className="text-[6px] font-bold uppercase opacity-50 text-center">Posição X</span>
                            <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-[6px] font-bold uppercase opacity-50 text-center">Posição Y</span>
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

        {/* ÁREA DA FOLHA DE MANGÁ */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className={`manga-panel bg-white p-8 min-h-[900px] w-full max-w-[750px] relative halftone-bg flex flex-col border-4 border-black transition-all ${activePanelIdx !== null ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div ref={exportRef} className={`relative flex-grow bg-white w-full h-full flex flex-col ${activePanelIdx !== null ? 'overflow-visible' : 'overflow-hidden'}`}>
              {generation.isAnalyzing && (
                <div className="absolute inset-0 z-[100] bg-white/95 flex flex-col items-center justify-center font-black uppercase italic animate-pulse">
                  <i className="fa-solid fa-wand-magic-sparkles text-3xl mb-4"></i>
                  Organizando Página...
                </div>
              )}
              
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 select-none border-4 border-dashed border-black m-4">
                  <i className="fa-solid fa-layer-group text-9xl mb-6"></i>
                  <p className="text-3xl font-black uppercase italic tracking-tighter">Seven Mangá</p>
                  <p className="text-[12px] font-bold tracking-[0.5em] mt-2">ADICIONE SUAS ARTES</p>
                </div>
              ) : (
                <div className={`relative flex-grow bg-white border-2 border-black h-full ${activePanelIdx !== null ? 'overflow-visible' : 'overflow-hidden'}`}>
                  {renderMangaGrid()}
                  
                  {/* CAMADA DE BALÕES */}
                  <div className="absolute inset-0 pointer-events-none z-[60]">
                    {generation.suggestions.map((s, idx) => {
                      const rad = (s.tailAngle - 90) * (Math.PI / 180);
                      const cosA = Math.cos(rad);
                      const sinA = Math.sin(rad);
                      const scale = s.bubbleScale || 35;
                      
                      return (
                        <div key={idx} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${scale}%`, zIndex: 200 + idx }}>
                          <div className={getFilter(s.bubbleType)}>
                            {s.bubbleType !== 'narrative' && s.tailLength > 0 && (
                              <div className="absolute pointer-events-none" style={{ left: `calc(50% + ${cosA * 55}%)`, top: `calc(50% + ${sinA * 55}%)`, transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)` }}>
                                {s.bubbleType === 'thought' ? (
                                  <div className="flex flex-col gap-2 items-center">
                                    <div className="w-6 h-6 rounded-full border-[3px] border-black bg-white shadow-[2px_2px_0_black]"></div>
                                    <div className="w-3 h-3 rounded-full border-[2px] border-black bg-white shadow-[1px_1px_0_black]"></div>
                                  </div>
                                ) : (
                                  <div className="relative flex flex-col items-center">
                                    <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-black" style={{ borderTopWidth: `${s.tailLength}px`, marginTop: '-4px' }}></div>
                                    <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[13px] border-l-transparent border-r-[13px] border-r-transparent border-t-white" style={{ borderTopWidth: `${s.tailLength - 6}px` }}></div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={getBubbleStyles(s.bubbleType)}>
                              <p className="text-black font-black text-center leading-tight select-none uppercase tracking-tighter" style={{ fontSize: `${s.fontSize || 16}px`, fontFamily: 'Noto Sans JP' }}>{s.suggestedDialogue}</p>
                            </div>
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
            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[750px]">
              <button onClick={() => { setSourceImages([]); setActivePanelIdx(null); }} className="py-4 bg-white border-4 border-black font-black uppercase italic tracking-widest hover:bg-black hover:text-white transition-all shadow-[6px_6px_0px_#000]">Limpar Tudo</button>
              <button onClick={handleDownload} disabled={isExporting} className="py-4 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[10px_10px_0px_#ccc] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2">
                {isExporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
                Exportar Mangá
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
