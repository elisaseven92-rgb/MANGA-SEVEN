
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
  { type: 'comic-boom', icon: 'fa-meteor', category: 'Action' },
  { type: 'thought', icon: 'fa-cloud', category: 'Emotion' },
  { type: 'whisper', icon: 'fa-comment-dots', category: 'Emotion' },
  { type: 'heart', icon: 'fa-heart', category: 'Emotion' },
  { type: 'fear', icon: 'fa-ghost', category: 'Emotion' },
  { type: 'dripping', icon: 'fa-droplet', category: 'Emotion' },
  { type: 'electronic', icon: 'fa-microchip', category: 'Special' },
  { type: 'narrative', icon: 'fa-square', category: 'Layout' },
  { type: 'impact', icon: 'fa-circle-dot', category: 'Special' },
];

type Tab = 'text' | 'style' | 'layout';

export default function App() {
  const [sourceImages, setSourceImages] = useState<MangaImage[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [isExporting, setIsExporting] = useState(false);
  const [activeBubbleIdx, setActiveBubbleIdx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [generation, setGeneration] = useState<GenerationState>({
    isGenerating: false,
    isAnalyzing: false,
    statusMessage: '',
    error: null,
    resultUrl: null,
    suggestions: [
      {
        id: 'initial-story',
        panelNumber: 1,
        description: "Protagonista",
        suggestedDialogue: "ESTOU PRONTO PARA SAIR DA VILA. DEPOIS DE TREINAR POR DEZ ANOS, SINTO-ME FORTE!",
        position: { x: 50, y: 40 },
        tailAngle: 0,
        tailLength: 20,
        fontSize: 24,
        bubbleScale: 45,
        bubbleType: 'speech',
        readingOrder: 1,
        zIndex: 10,
      }
    ],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(files[0]);
      });
      setSourceImages([{ id: Date.now().toString(), url: base64, base64: base64, mimeType: files[0].type, zoom: 1, offsetX: 0, offsetY: 0 }]);
      triggerAIAnalysis(base64, files[0].type);
    }
  };

  const triggerAIAnalysis = async (base64: string, mime: string) => {
    setGeneration(prev => ({ ...prev, isAnalyzing: true, statusMessage: 'STUDIO ENGINE: ANALISANDO...' }));
    try {
      const analysis = await analyzeMangaPage(base64, mime);
      const formatted = analysis.map((s: any) => ({ ...s, id: Math.random().toString(36).substr(2, 9), zIndex: 10 }));
      setGeneration(prev => ({ ...prev, suggestions: formatted, isAnalyzing: false }));
      if (formatted.length > 0) setActiveBubbleIdx(0);
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false, error: 'Erro na análise AI.' }));
    }
  };

  /**
   * Fix for error: Cannot find name 'handleDownload'.
   * Uses toPng from html-to-image to capture the exportRef element and download it.
   */
  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `manga-page-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const updateActiveBubble = (field: keyof SceneSuggestion, val: any) => {
    const newSugs = [...generation.suggestions];
    if (newSugs[activeBubbleIdx]) {
      (newSugs[activeBubbleIdx] as any)[field] = val;
      setGeneration(prev => ({ ...prev, suggestions: newSugs }));
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, idx: number) => {
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

  const autoFitScale = () => {
    const bubble = generation.suggestions[activeBubbleIdx];
    if (!bubble) return;
    const textLength = bubble.suggestedDialogue.length;
    const estimatedScale = Math.max(20, Math.min(80, textLength * 0.8 + 15));
    updateActiveBubble('bubbleScale', estimatedScale);
  };

  const getBubbleStyle = (type: BubbleType) => {
    switch (type) {
      case 'speech': return 'rounded-[50%] border-[4px]';
      case 'scream': return 'clip-path-scream border-[6px] bg-white';
      case 'shock': return 'clip-path-shock border-[5px] bg-white';
      case 'burst': return 'clip-path-burst border-[8px] bg-white';
      case 'thought': return 'rounded-[50%] border-dashed border-[4px]';
      case 'soft-rect': return 'rounded-[15px] border-[4px]';
      case 'capsule': return 'rounded-full border-[4px] px-8';
      case 'narrative': return 'rounded-none border-[4px] bg-white shadow-[6px_6px_0_black]';
      case 'impact': return 'rounded-lg border-[12px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[4px] border-black animate-glitch-fast';
      default: return 'rounded-[50%] border-[4px]';
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative max-w-[1500px] mx-auto">
        
        {/* LEFT TOOLBOX - THE STUDIO */}
        <div className="lg:col-span-4 space-y-4 no-print sticky top-24">
          <div className="manga-panel p-0 bg-[#0a0a0c] border-2 border-zinc-800 overflow-hidden flex flex-col min-h-[700px]">
            
            <div className="flex border-b-2 border-zinc-800">
              {(['text', 'style', 'layout'] as Tab[]).map(t => (
                <button 
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === t ? 'bg-white text-black' : 'text-zinc-500 hover:bg-zinc-900'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
              <div className="space-y-10">
                {/* BUBBLE NAV */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Ativos em Cena</span>
                    <button onClick={() => setGeneration(p => ({...p, suggestions: [...p.suggestions, {...p.suggestions[0], id: Date.now().toString(), position: {x: 50, y: 50}}] }))} className="text-[9px] font-black uppercase bg-zinc-800 px-3 py-1 rounded-sm">+ Novo</button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {generation.suggestions.map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setActiveBubbleIdx(i)}
                        className={`aspect-square border-2 flex items-center justify-center font-black transition-all ${activeBubbleIdx === i ? 'bg-white text-black border-white scale-110 shadow-lg' : 'bg-black text-zinc-600 border-zinc-800 hover:border-zinc-500'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {currentBubble && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    {activeTab === 'text' && (
                      <div className="space-y-6">
                        <div className="bg-black border-2 border-zinc-800 p-6 focus-within:border-white transition-all">
                          <textarea 
                            value={currentBubble.suggestedDialogue} 
                            onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                            className="w-full bg-transparent text-lg font-bold text-white uppercase resize-none h-48 focus:outline-none placeholder-zinc-900 leading-tight"
                            placeholder="DIÁLOGO..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase text-zinc-500">Tamanho Fonte</label>
                            <input type="range" min="10" max="150" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                          </div>
                          <button onClick={autoFitScale} className="bg-zinc-800 hover:bg-white hover:text-black text-[9px] font-black uppercase border border-zinc-700 transition-all">
                            Auto-Fit Scale
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
                            className={`aspect-square border-2 flex flex-col items-center justify-center gap-2 transition-all ${currentBubble.bubbleType === style.type ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-500'}`}
                          >
                            <i className={`fa-solid ${style.icon} text-lg`}></i>
                            <span className="text-[7px] font-black uppercase">{style.type}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeTab === 'layout' && (
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-zinc-500">Escala Global</span><span className="text-white">{currentBubble.bubbleScale}%</span></div>
                          <input type="range" min="10" max="95" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-zinc-500">Rotação</span><span className="text-white">{currentBubble.tailAngle}°</span></div>
                          <input type="range" min="-180" max="180" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                        </div>
                        <button 
                          onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} 
                          className="w-full py-4 bg-red-950/20 text-red-500 border-2 border-red-900/30 text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"
                        >
                          Eliminar Balão
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 bg-black border-t-2 border-zinc-800 flex flex-col gap-3">
               <button onClick={() => fileInputRef.current?.click()} className="w-full bg-zinc-900 text-white py-5 text-[10px] font-black uppercase tracking-[0.3em] border-2 border-zinc-700 hover:bg-white hover:text-black transition-all">
                 Importar Arte Base
               </button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               <button onClick={handleDownload} disabled={isExporting} className="w-full bg-white text-black py-5 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                 {isExporting ? 'GERANDO PNG...' : 'FINALIZAR PROJETO'}
               </button>
            </div>
          </div>
        </div>

        {/* MAIN CANVAS - THE WORKSPACE */}
        <div className="lg:col-span-8 group">
          <div className="manga-panel bg-black p-4 lg:p-12 relative halftone-bg min-h-[850px] border-2 border-zinc-800 flex justify-center items-start overflow-hidden rounded-sm">
            
            {generation.isAnalyzing && (
              <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-12 text-center">
                <div className="w-64 h-[2px] bg-zinc-900 mb-8 overflow-hidden">
                   <div className="h-full bg-white animate-[loading_1s_infinite_linear]" style={{ width: '40%' }}></div>
                </div>
                <p className="manga-font text-4xl italic tracking-[0.2em] uppercase text-white animate-pulse">{generation.statusMessage}</p>
              </div>
            )}

            <div 
              ref={exportRef} 
              className={`relative aspect-[1/1.41] bg-white w-full border-[2px] border-black overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div className="relative w-full h-full select-none" ref={canvasRef}>
                {sourceImages.length > 0 ? (
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.4) brightness(1.1) saturate(0)' }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-20 text-center">
                     <div className="border-[8px] border-black p-10 opacity-10">
                        <i className="fa-solid fa-pen-nib text-[10rem] text-black"></i>
                     </div>
                     <p className="text-[12px] font-black uppercase text-black mt-8 tracking-[0.5em] opacity-30 italic">Studio Canvas Ready</p>
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
                        transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg) ${isDragging && activeBubbleIdx === idx ? 'scale(1.08)' : 'scale(1)'}` 
                      }}
                    >
                      <div className="relative w-full">
                        <div 
                          className={`bg-white p-6 flex items-center justify-center text-center border-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all ${getBubbleStyle(s.bubbleType)} ${activeBubbleIdx === idx ? 'ring-[6px] ring-black ring-offset-[6px] ring-offset-white' : ''}`}
                          style={{ 
                            minHeight: '60px', 
                            width: '100%', 
                            color: s.bubbleType === 'impact' ? '#fff' : '#000',
                          }}
                        >
                           <p className="font-black leading-[0.8] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
                             {s.suggestedDialogue}
                           </p>
                        </div>
                        
                        {activeBubbleIdx === idx && !isExporting && (
                          <div className="absolute -inset-10 border-2 border-black/5 border-dashed rounded-full animate-[spin_30s_linear_infinite] pointer-events-none"></div>
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
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .clip-path-scream { clip-path: polygon(0% 20%, 10% 0%, 25% 15%, 40% 0%, 55% 15%, 75% 0%, 90% 15%, 100% 30%, 92% 50%, 100% 70%, 90% 85%, 75% 100%, 55% 85%, 40% 100%, 25% 85%, 10% 100%, 0% 80%, 8% 50%, 0% 30%); }
        .clip-path-shock { clip-path: polygon(50% 0%, 55% 35%, 90% 10%, 65% 45%, 100% 50%, 65% 55%, 90% 90%, 55% 65%, 50% 100%, 45% 65%, 10% 90%, 35% 55%, 0% 50%, 35% 45%, 10% 10%, 45% 35%); }
        .clip-path-burst { clip-path: polygon(0% 0%, 20% 5%, 40% 0%, 60% 5%, 80% 0%, 100% 0%, 95% 20%, 100% 40%, 95% 60%, 100% 80%, 100% 100%, 80% 95%, 60% 100%, 40% 95%, 20% 100%, 0% 100%, 5% 80%, 0% 60%, 5% 40%, 0% 20%); }
        .clip-path-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
        .clip-path-heart { clip-path: polygon(50% 15%, 75% 0%, 100% 25%, 50% 100%, 0% 25%, 25% 0%); }
        .clip-path-fear { clip-path: polygon(0% 10%, 10% 0%, 20% 15%, 30% 5%, 40% 15%, 50% 0%, 60% 15%, 70% 5%, 80% 15%, 90% 0%, 100% 10%, 95% 30%, 100% 50%, 95% 70%, 100% 90%, 90% 100%, 80% 85%, 70% 95%, 60% 85%, 50% 100%, 40% 85%, 30% 95%, 20% 85%, 10% 100%, 0% 90%, 5% 70%, 0% 50%, 5% 30%); }
        .clip-path-dripping { clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 90% 100%, 80% 70%, 70% 100%, 60% 70%, 50% 100%, 40% 70%, 30% 100%, 20% 70%, 10% 100%, 0% 70%); }
      `}</style>
    </Layout>
  );
}
