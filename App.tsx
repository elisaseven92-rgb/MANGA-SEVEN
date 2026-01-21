
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; icon: string; category: string }[] = [
  { type: 'speech', icon: 'fa-comment', category: 'Basic' },
  { type: 'capsule', icon: 'fa-ellipsis', category: 'Basic' },
  { type: 'soft-rect', icon: 'fa-square-full', category: 'Basic' },
  { type: 'bean', icon: 'fa-shapes', category: 'Basic' },
  { type: 'scream', icon: 'fa-burst', category: 'Action' },
  { type: 'shock', icon: 'fa-bolt-lightning', category: 'Action' },
  { type: 'burst', icon: 'fa-explosion', category: 'Action' },
  { type: 'starburst', icon: 'fa-bahai', category: 'Action' },
  { type: 'thought', icon: 'fa-cloud', category: 'Emotion' },
  { type: 'fear', icon: 'fa-ghost', category: 'Emotion' },
  { type: 'dripping', icon: 'fa-droplet', category: 'Emotion' },
  { type: 'impact', icon: 'fa-circle-dot', category: 'Special' },
  { type: 'narrative', icon: 'fa-square', category: 'Layout' },
  { type: 'electronic', icon: 'fa-microchip', category: 'Special' },
];

type Tab = 'text' | 'style' | 'layout';

export default function App() {
  const [sourceImages, setSourceImages] = useState<MangaImage[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [isExporting, setIsExporting] = useState(false);
  const [activeBubbleIdx, setActiveBubbleIdx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs para controle fino de performance no arraste
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generation, setGeneration] = useState<GenerationState>({
    isGenerating: false,
    isAnalyzing: false,
    statusMessage: '',
    error: null,
    resultUrl: null,
    suggestions: [
      {
        id: 'story-start',
        panelNumber: 1,
        description: "Protagonista pronto",
        suggestedDialogue: "Estou pronto para sair da vila. Depois de treinar por dez anos, sinto-me forte.",
        position: { x: 50, y: 45 },
        tailAngle: 0,
        tailLength: 20,
        fontSize: 26,
        bubbleScale: 40,
        bubbleType: 'speech',
        readingOrder: 1,
        zIndex: 10,
      }
    ],
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(files[0]);
      });
      setSourceImages([{ 
        id: Date.now().toString(), 
        url: base64, 
        base64: base64, 
        mimeType: files[0].type, 
        zoom: 1, 
        offsetX: 0, 
        offsetY: 0 
      }]);
      triggerAIAnalysis(base64, files[0].type);
    }
  };

  const triggerAIAnalysis = async (base64: string, mime: string) => {
    setGeneration(prev => ({ ...prev, isAnalyzing: true, statusMessage: 'ANALISANDO COMPOSIÇÃO...' }));
    try {
      const analysis = await analyzeMangaPage(base64, mime);
      const formatted = analysis.map((s: any) => ({ 
        ...s, 
        id: Math.random().toString(36).substr(2, 9), 
        zIndex: 10 
      }));
      setGeneration(prev => ({ ...prev, suggestions: formatted, isAnalyzing: false }));
      if (formatted.length > 0) setActiveBubbleIdx(0);
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false, error: 'Erro ao analisar imagem.' }));
    }
  };

  const updateActiveBubble = (field: keyof SceneSuggestion, val: any) => {
    setGeneration(prev => {
      const newSugs = [...prev.suggestions];
      if (newSugs[activeBubbleIdx]) {
        (newSugs[activeBubbleIdx] as any)[field] = val;
      }
      return { ...prev, suggestions: newSugs };
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setActiveBubbleIdx(idx);
    setIsDragging(true);
    
    const bubble = generation.suggestions[idx];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
      dragOffset.current = { x: mouseX - bubble.position.x, y: mouseY - bubble.position.y };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || activeBubbleIdx === -1) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
    
    updateActiveBubble('position', { 
      x: Math.max(0, Math.min(100, mouseX - dragOffset.current.x)), 
      y: Math.max(0, Math.min(100, mouseY - dragOffset.current.y)) 
    });
  };

  const autoFitBubble = () => {
    const bubble = generation.suggestions[activeBubbleIdx];
    if (!bubble) return;
    
    // Algoritmo simples de ajuste baseado no tamanho do texto
    const textLen = bubble.suggestedDialogue.length;
    const recommendedScale = Math.max(25, Math.min(85, (textLen * 0.7) + 15));
    const recommendedFont = Math.max(16, Math.min(48, 1000 / (textLen + 10)));
    
    setGeneration(prev => {
      const newSugs = [...prev.suggestions];
      newSugs[activeBubbleIdx].bubbleScale = recommendedScale;
      newSugs[activeBubbleIdx].fontSize = recommendedFont;
      return { ...prev, suggestions: newSugs };
    });
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `seven-manga-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getBubbleStyle = (type: BubbleType) => {
    const base = "transition-all duration-200";
    switch (type) {
      case 'speech': return `${base} rounded-[50%] border-[4px]`;
      case 'scream': return `${base} clip-path-scream border-[6px] bg-white`;
      case 'shock': return `${base} clip-path-shock border-[5px] bg-white`;
      case 'burst': return `${base} clip-path-burst border-[8px] bg-white`;
      case 'thought': return `${base} rounded-[50%] border-dashed border-[4px]`;
      case 'soft-rect': return `${base} rounded-[15px] border-[4px]`;
      case 'capsule': return `${base} rounded-full border-[4px] px-8`;
      case 'narrative': return `${base} rounded-none border-[4px] bg-white shadow-[8px_8px_0_black]`;
      case 'impact': return `${base} rounded-lg border-[14px] bg-black text-white border-black`;
      case 'electronic': return `${base} rounded-none border-[4px] border-black animate-glitch-fast`;
      default: return `${base} rounded-[50%] border-[4px]`;
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1600px] mx-auto">
        
        {/* SIDEBAR - CONTROLES NOIR */}
        <div className="lg:col-span-4 space-y-4 no-print sticky top-24">
          <div className="manga-panel p-0 bg-[#050505] border-2 border-zinc-800 flex flex-col min-h-[750px] shadow-2xl">
            
            {/* TABS DE ALTO CONTRASTE */}
            <div className="flex border-b-2 border-zinc-800">
              {(['text', 'style', 'layout'] as Tab[]).map(t => (
                <button 
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === t ? 'bg-white text-black' : 'text-zinc-600 hover:text-white hover:bg-zinc-900'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
              <div className="space-y-10">
                
                {/* LISTA DE CAMADAS / BALÕES */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Balões Ativos</span>
                    <button 
                      onClick={() => setGeneration(p => ({...p, suggestions: [...p.suggestions, {...p.suggestions[0], id: Date.now().toString(), position: {x: 50, y: 50}}] }))} 
                      className="bg-zinc-800 text-white px-4 py-1.5 text-[9px] font-black uppercase hover:bg-white hover:text-black transition-colors rounded-sm border border-zinc-700"
                    >
                      + NOVO
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {generation.suggestions.map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setActiveBubbleIdx(i)}
                        className={`aspect-square border-2 flex items-center justify-center font-black text-sm transition-all ${activeBubbleIdx === i ? 'bg-white text-black border-white scale-110' : 'bg-black text-zinc-700 border-zinc-900 hover:border-zinc-500'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {currentBubble && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {activeTab === 'text' && (
                      <div className="space-y-6">
                        <div className="bg-black border-2 border-zinc-800 p-6 rounded-sm focus-within:border-white transition-all shadow-inner">
                          <textarea 
                            value={currentBubble.suggestedDialogue} 
                            onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                            className="w-full bg-transparent text-xl font-bold text-white uppercase resize-none h-40 focus:outline-none leading-tight placeholder-zinc-800"
                            placeholder="DIÁLOGO DO MANGÁ..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-zinc-600">Fonte ({currentBubble.fontSize}pt)</label>
                            <input type="range" min="8" max="180" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                          </div>
                          <button 
                            onClick={autoFitBubble} 
                            className="bg-zinc-900 border-2 border-zinc-800 text-white text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                          >
                            <i className="fa-solid fa-arrows-to-dot"></i> Ajustar Escala
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'style' && (
                      <div className="grid grid-cols-4 gap-3">
                        {BUBBLE_STYLES.map(style => (
                          <button 
                            key={style.type}
                            onClick={() => updateActiveBubble('bubbleType', style.type)}
                            className={`aspect-square border-2 flex flex-col items-center justify-center gap-2 transition-all ${currentBubble.bubbleType === style.type ? 'bg-white text-black border-white' : 'bg-black border-zinc-900 text-zinc-600 hover:border-zinc-500'}`}
                            title={style.type}
                          >
                            <i className={`fa-solid ${style.icon} text-lg`}></i>
                            <span className="text-[8px] font-black uppercase">{style.type}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeTab === 'layout' && (
                      <div className="space-y-8">
                        <div className="space-y-5">
                          <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-zinc-600">Volume</span><span className="text-white">{currentBubble.bubbleScale}%</span></div>
                          <input type="range" min="10" max="98" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-5">
                          <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-zinc-600">Ângulo</span><span className="text-white">{currentBubble.tailAngle}°</span></div>
                          <input type="range" min="-180" max="180" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                           <button 
                            onClick={() => updateActiveBubble('zIndex', (currentBubble.zIndex || 10) + 1)}
                            className="bg-black border-2 border-zinc-800 py-4 text-[9px] font-black uppercase text-zinc-500 hover:text-white hover:border-white transition-all"
                           >
                             Trazer p/ Frente
                           </button>
                           <button 
                            onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} 
                            className="bg-red-950/20 border-2 border-red-900/40 text-red-500 py-4 text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"
                           >
                             Apagar Balão
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 bg-black border-t-2 border-zinc-800 flex flex-col gap-3">
               <button onClick={() => fileInputRef.current?.click()} className="w-full bg-zinc-900 text-white py-5 text-[11px] font-black uppercase tracking-[0.4em] border-2 border-zinc-800 hover:bg-white hover:text-black transition-all">
                 IMPORTAR ARTE
               </button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               <button onClick={handleDownload} disabled={isExporting} className="w-full bg-white text-black py-5 text-[11px] font-black uppercase tracking-[0.4em] border-2 border-white hover:bg-zinc-200 transition-all flex items-center justify-center gap-3">
                 {isExporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-download"></i>}
                 {isExporting ? 'GERANDO...' : 'EXPORTAR FINAL'}
               </button>
            </div>
          </div>
        </div>

        {/* WORKSPACE - O CANVAS PRINCIPAL */}
        <div className="lg:col-span-8 group relative">
          <div className="manga-panel bg-black p-4 lg:p-12 relative halftone-bg min-h-[850px] border-2 border-zinc-800 flex justify-center items-start overflow-hidden rounded-sm">
            
            {/* OVERLAY DE ANÁLISE AI */}
            {generation.isAnalyzing && (
              <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-12 text-center backdrop-blur-sm">
                <div className="w-64 h-[2px] bg-zinc-900 mb-10 overflow-hidden border border-white/5">
                   <div className="h-full bg-white animate-[loading_1.5s_infinite_linear]" style={{ width: '40%' }}></div>
                </div>
                <p className="manga-font text-5xl italic tracking-[0.2em] uppercase text-white animate-pulse">{generation.statusMessage}</p>
                <p className="text-[10px] font-black text-zinc-700 mt-6 tracking-[1em] uppercase">Processing via Gemini-3-Pro</p>
              </div>
            )}

            <div 
              ref={exportRef} 
              className={`relative aspect-[1/1.414] bg-white w-full border-[4px] border-black overflow-hidden shadow-[0_0_150px_rgba(0,0,0,0.5)] ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div className="relative w-full h-full select-none" ref={canvasRef}>
                {sourceImages.length > 0 ? (
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.45) brightness(1.05) saturate(0)' }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-20 text-center border-[20px] border-[#f0f0f0]">
                     <i className="fa-solid fa-pen-nib text-[12rem] text-black opacity-10 mb-10"></i>
                     <p className="text-[14px] font-black uppercase text-black tracking-[0.6em] opacity-30 italic">Studio Canvas Monochrome</p>
                  </div>
                )}
                
                <div className="absolute inset-0 pointer-events-none">
                  {generation.suggestions.map((s, idx) => (
                    <div 
                      key={s.id} 
                      onMouseDown={(e) => handleCanvasMouseDown(e, idx)}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto transition-opacity ${activeBubbleIdx === idx ? 'z-40' : 'opacity-90'}`} 
                      style={{ 
                        left: `${s.position.x}%`, 
                        top: `${s.position.y}%`, 
                        width: `${s.bubbleScale}%`,
                        zIndex: s.zIndex || 10,
                        transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg) ${isDragging && activeBubbleIdx === idx ? 'scale(1.06)' : 'scale(1)'}` 
                      }}
                    >
                      <div className="relative w-full group/bubble">
                        <div 
                          className={`bg-white p-6 flex items-center justify-center text-center border-black shadow-[0_15px_60px_rgba(0,0,0,0.4)] ${getBubbleStyle(s.bubbleType)} ${activeBubbleIdx === idx ? 'ring-[6px] ring-black ring-offset-[8px] ring-offset-white' : ''}`}
                          style={{ 
                            minHeight: '80px', 
                            width: '100%', 
                            color: s.bubbleType === 'impact' ? '#fff' : '#000',
                          }}
                        >
                           <p className="font-black leading-[0.82] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
                             {s.suggestedDialogue}
                           </p>
                        </div>
                        
                        {/* EFEITO DE ÍMÃ VISUAL DURANTE O ARRASTE */}
                        {activeBubbleIdx === idx && isDragging && (
                          <div className="absolute -inset-12 border-[2px] border-black/10 border-dashed rounded-full animate-[spin_10s_linear_infinite]"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
        .clip-path-scream { clip-path: polygon(0% 20%, 10% 0%, 25% 15%, 40% 0%, 55% 15%, 75% 0%, 90% 15%, 100% 30%, 92% 50%, 100% 70%, 90% 85%, 75% 100%, 55% 85%, 40% 100%, 25% 85%, 10% 100%, 0% 80%, 8% 50%, 0% 30%); }
        .clip-path-shock { clip-path: polygon(50% 0%, 55% 35%, 90% 10%, 65% 45%, 100% 50%, 65% 55%, 90% 90%, 55% 65%, 50% 100%, 45% 65%, 10% 90%, 35% 55%, 0% 50%, 35% 45%, 10% 10%, 45% 35%); }
        .clip-path-burst { clip-path: polygon(0% 0%, 20% 5%, 40% 0%, 60% 5%, 80% 0%, 100% 0%, 95% 20%, 100% 40%, 95% 60%, 100% 80%, 100% 100%, 80% 95%, 60% 100%, 40% 95%, 20% 100%, 0% 100%, 5% 80%, 0% 60%, 5% 40%, 0% 20%); }
        .clip-path-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
      `}</style>
    </Layout>
  );
}
