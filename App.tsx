
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
      // Analisamos a imagem principal para sugestões iniciais
      const analysis = await analyzeMangaPage(images[0].base64, images[0].mimeType);
      
      // Se já houver sugestões do usuário, não sobrescrevemos totalmente se for um erro bobo
      setGeneration(prev => ({ 
        ...prev, 
        suggestions: analysis.length > 0 ? analysis : prev.suggestions, 
        isAnalyzing: false 
      }));
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
      // Pequeno delay para garantir que o render do React limpou os enquadramentos de seleção
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true, 
        pixelRatio: 2, // 2x é suficiente e evita travamentos
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `seven-manga-${Date.now()}.png`;
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

    // Definição das proporções do grid de 3 quadros
    // O primeiro (topo) tem 1.6x a altura do de baixo para dar o impacto de mangá e evitar cortes
    const gridStyles: React.CSSProperties = {
      display: 'grid',
      gap: '12px',
      padding: '12px',
      backgroundColor: 'black',
      height: '100%',
      width: '100%',
      gridTemplateRows: count === 3 ? '1.6fr 1fr' : count === 2 ? '1fr 1fr' : '1fr',
      gridTemplateColumns: count === 3 ? '1fr 1fr' : '1fr',
    };

    return (
      <div style={gridStyles} className="transition-all duration-300">
        {sourceImages.map((img, i) => {
          const isActive = activePanelIdx === i;
          
          let cellStyle: React.CSSProperties = {
            position: 'relative',
            backgroundColor: 'white',
            border: '2px solid black',
            // O segredo está aqui: apenas 'hidden' quando NÃO está sendo editado.
            // Quando ativo, permitimos transbordar para que o usuário veja o resto da imagem ao enquadrar.
            overflow: isActive ? 'visible' : 'hidden',
            zIndex: isActive ? 40 : 10,
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: isActive ? '0 0 0 4px white, 0 0 30px rgba(0,0,0,0.5)' : 'none',
            transform: isActive ? 'scale(1.02)' : 'none',
            minHeight: 0,
            minWidth: 0,
          };

          // O primeiro quadro em um layout de 3 sempre ocupa as duas colunas superiores
          if (count === 3 && i === 0) {
            cellStyle.gridColumn = 'span 2';
          }

          return (
            <div key={img.id} style={cellStyle}>
              {/* Overlay de ajuda para enquadramento */}
              {isActive && (
                <div className="absolute inset-0 z-20 border-4 border-dashed border-black/20 pointer-events-none flex items-center justify-center">
                  <div className="w-1/3 h-full border-x border-black/10"></div>
                  <div className="h-1/3 w-full border-y border-black/10 absolute"></div>
                </div>
              )}
              
              <img 
                src={img.url} 
                className="w-full h-full object-contain grayscale transition-transform duration-75"
                style={{
                  transform: `scale(${img.zoom}) translate(${img.offsetX}%, ${img.offsetY}%)`,
                  filter: 'contrast(1.1) brightness(1.05)'
                }}
              />

              {/* Tag de identificação do quadro (apenas visual) */}
              <div className="absolute top-2 left-2 bg-black text-white text-[8px] px-1 font-black italic z-30 select-none">
                PANEL {i+1}
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
        {/* SIDEBAR DE CONTROLE */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-5 bg-white space-y-6">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <div className="flex flex-col">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Manga Editor</h2>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">3 Quadros Máximo</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={sourceImages.length >= 3}
                  className={`px-3 py-1 text-[10px] font-black uppercase transition-all ${sourceImages.length >= 3 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                  <i className="fa-solid fa-plus mr-1"></i> Imagem
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
              </div>
            </div>

            {/* CONTROLES DE QUADROS */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase border-b-2 border-gray-100 pb-1 flex items-center gap-2">
                <i className="fa-solid fa-images"></i> Organização de Cenas
              </h3>
              
              {sourceImages.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Adicione até 3 imagens para começar</p>
                </div>
              )}

              <div className="space-y-4">
                {sourceImages.map((img, i) => (
                  <div key={img.id} className={`border-2 p-3 transition-all ${activePanelIdx === i ? 'border-black bg-white shadow-[6px_6px_0_black]' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex gap-3">
                      <div className="w-14 h-14 border-2 border-black bg-white flex-shrink-0 overflow-hidden">
                        <img src={img.url} className="w-full h-full object-cover grayscale" />
                      </div>
                      <div className="flex-grow flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black italic uppercase">Cena {i+1} {i === 0 && sourceImages.length === 3 ? '(Topo)' : ''}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setActivePanelIdx(activePanelIdx === i ? null : i)}
                              className={`text-[9px] px-2 py-0.5 border-2 border-black font-black uppercase ${activePanelIdx === i ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                            >
                              {activePanelIdx === i ? 'OK' : 'Ajustar'}
                            </button>
                            <button onClick={() => setSourceImages(prev => prev.filter(x => x.id !== img.id))} className="text-red-600 hover:scale-110 transition-transform">
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>
                        {activePanelIdx === i && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 animate-in fade-in duration-300">
                             <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-black uppercase italic">
                                  <span>Zoom</span>
                                  <span>{img.zoom.toFixed(1)}x</span>
                                </div>
                                <input type="range" min="0.5" max="4" step="0.1" value={img.zoom} onChange={e => updateImageTransform(img.id, 'zoom', parseFloat(e.target.value))} className="w-full accent-black h-1" />
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <span className="text-[8px] font-black uppercase block text-center">Desloc. X</span>
                                  <input type="range" min="-100" max="100" step="1" value={img.offsetX} onChange={e => updateImageTransform(img.id, 'offsetX', parseInt(e.target.value))} className="w-full accent-black h-1" />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[8px] font-black uppercase block text-center">Desloc. Y</span>
                                  <input type="range" min="-100" max="100" step="1" value={img.offsetY} onChange={e => updateImageTransform(img.id, 'offsetY', parseInt(e.target.value))} className="w-full accent-black h-1" />
                                </div>
                             </div>
                             <p className="text-[7px] text-gray-400 italic font-bold leading-tight">
                               *DICA: O quadro do topo agora é maior para evitar cortes indesejados em cenas panorâmicas.
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTROLES DE BALÕES */}
            {sourceImages.length > 0 && (
              <div className="space-y-4 pt-4 border-t-4 border-black">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase">Balões de Diálogo</h3>
                  <button onClick={addManualBubble} className="bg-black text-white px-2 py-0.5 text-[9px] font-black uppercase">+ Balão</button>
                </div>
                
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {generation.suggestions.map((s, i) => (
                    <div key={i} className="border-2 border-black p-3 space-y-3 bg-white shadow-[3px_3px_0px_#000]">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-[150px] no-scrollbar">
                          {bubbleOptions.map(opt => (
                            <button key={opt.value} onClick={() => updateSuggestion(i, 'bubbleType', opt.value)} className={`w-6 h-6 flex-shrink-0 border border-black text-[10px] transition-all ${s.bubbleType === opt.value ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>
                              <i className={`fa-solid ${opt.icon}`}></i>
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== i)}))} className="text-red-600">
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      </div>
                      
                      <textarea 
                        value={s.suggestedDialogue} 
                        onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} 
                        className="w-full text-[10px] font-bold border-2 border-black p-2 h-14 resize-none outline-none focus:bg-yellow-50" 
                        placeholder="Texto do balão..."
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase">Tamanho</label>
                          <input type="range" min="10" max="80" value={s.bubbleScale} onChange={e => updateSuggestion(i, 'bubbleScale', parseInt(e.target.value))} className="w-full accent-black h-1" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] font-black uppercase">Giro do Rabicho</label>
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
          <div className="manga-panel bg-white p-6 min-h-[900px] w-full max-w-[700px] relative halftone-bg flex flex-col border-4 border-black shadow-[20px_20px_0_black]">
            <div ref={exportRef} className="relative flex-grow bg-white w-full h-full flex flex-col overflow-hidden border-2 border-black">
              {generation.isAnalyzing && (
                <div className="absolute inset-0 z-[100] bg-white/90 flex flex-col items-center justify-center font-black uppercase italic animate-in fade-in">
                  <i className="fa-solid fa-wand-magic-sparkles text-3xl mb-4 animate-bounce"></i>
                  Analisando Painéis...
                </div>
              )}
              
              {sourceImages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center opacity-10 select-none m-8 border-4 border-dashed border-black/20">
                  <i className="fa-solid fa-layer-group text-8xl mb-6"></i>
                  <p className="text-3xl font-black uppercase italic tracking-tighter">Seven Mangá</p>
                  <p className="text-[10px] font-bold tracking-[0.6em] mt-2">MONOCHROME STUDIO</p>
                </div>
              ) : (
                <div className="relative flex-grow h-full w-full">
                  {renderMangaGrid()}
                  
                  {/* CAMADA DE BALÕES (ABSOLUTA) */}
                  <div className="absolute inset-0 pointer-events-none z-[80]">
                    {generation.suggestions.map((s, idx) => {
                      const rad = (s.tailAngle - 90) * (Math.PI / 180);
                      const cosA = Math.cos(rad);
                      const sinA = Math.sin(rad);
                      const scale = s.bubbleScale || 35;
                      
                      return (
                        <div key={idx} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${scale}%`, zIndex: 100 + idx }}>
                          <div className={getFilter(s.bubbleType)}>
                            {s.bubbleType !== 'narrative' && s.tailLength > 0 && (
                              <div className="absolute pointer-events-none" style={{ left: `calc(50% + ${cosA * 55}%)`, top: `calc(50% + ${sinA * 55}%)`, transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)` }}>
                                {s.bubbleType === 'thought' ? (
                                  <div className="flex flex-col gap-2 items-center">
                                    <div className="w-4 h-4 rounded-full border-[3px] border-black bg-white"></div>
                                    <div className="w-2 h-2 rounded-full border-[2px] border-black bg-white"></div>
                                  </div>
                                ) : (
                                  <div className="relative flex flex-col items-center">
                                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-black" style={{ borderTopWidth: `${s.tailLength}px`, marginTop: '-2px' }}></div>
                                    <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-white" style={{ borderTopWidth: `${s.tailLength - 4}px` }}></div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className={getBubbleStyles(s.bubbleType)}>
                              <p className="text-black font-black text-center leading-[1.1] select-none uppercase tracking-tighter" style={{ fontSize: `${s.fontSize || 16}px` }}>{s.suggestedDialogue}</p>
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
            <div className="mt-8 grid grid-cols-2 gap-6 w-full max-w-[700px]">
              <button 
                onClick={() => { setSourceImages([]); setGeneration(p => ({...p, suggestions: []})); setActivePanelIdx(null); }} 
                className="py-4 bg-white border-4 border-black font-black uppercase italic tracking-widest hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_#000]"
              >
                Nova Página
              </button>
              <button 
                onClick={handleDownload} 
                disabled={isExporting} 
                className="py-4 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[12px_12px_0px_#ccc] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-3"
              >
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
