
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
  { type: 'double', icon: 'fa-clone', category: 'Action' },
  { type: 'thought', icon: 'fa-cloud', category: 'Emotion' },
  { type: 'whisper', icon: 'fa-comment-dots', category: 'Emotion' },
  { type: 'heart', icon: 'fa-heart', category: 'Emotion' },
  { type: 'fear', icon: 'fa-ghost', category: 'Emotion' },
  { type: 'dripping', icon: 'fa-droplet', category: 'Emotion' },
  { type: 'cloud-puffy', icon: 'fa-cloud-meatball', category: 'Emotion' },
  { type: 'ice', icon: 'fa-icicles', category: 'Special' },
  { type: 'radio', icon: 'fa-radio', category: 'Special' },
  { type: 'electronic', icon: 'fa-microchip', category: 'Special' },
  { type: 'mechanical', icon: 'fa-gear', category: 'Special' },
  { type: 'narrative', icon: 'fa-square', category: 'Layout' },
  { type: 'scroll', icon: 'fa-scroll', category: 'Layout' },
  { type: 'trapezoid', icon: 'fa-vector-square', category: 'Layout' },
  { type: 'impact', icon: 'fa-circle-dot', category: 'Special' },
];

type Tab = 'text' | 'style' | 'layout';

export default function App() {
  const [sourceImages, setSourceImages] = useState<MangaImage[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [isExporting, setIsExporting] = useState(false);
  const [activeBubbleIdx, setActiveBubbleIdx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [generation, setGeneration] = useState<GenerationState>({
    isGenerating: false,
    isAnalyzing: false,
    statusMessage: '',
    error: null,
    resultUrl: null,
    suggestions: [
      {
        id: 'demo-1',
        panelNumber: 1,
        description: "Início da Jornada",
        suggestedDialogue: "ESTOU PRONTO PARA SAIR DA VILA. DEPOIS DE TREINAR POR DEZ ANOS, SINTO-ME FORTE!",
        position: { x: 50, y: 30 },
        tailAngle: 0,
        tailLength: 20,
        fontSize: 24,
        bubbleScale: 40,
        bubbleType: 'speech',
        readingOrder: 1,
        zIndex: 10,
        showTail: false
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
      
      setSourceImages([{
        id: Math.random().toString(36).substr(2, 9),
        url: base64,
        base64: base64,
        mimeType: files[0].type,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
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
        showTail: false, 
        zIndex: 10 
      }));
      setGeneration(prev => ({ ...prev, suggestions: formatted, isAnalyzing: false }));
      if (formatted.length > 0) setActiveBubbleIdx(0);
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false, error: 'Erro na análise.' }));
    }
  };

  const addManualBubble = () => {
    const newSug: SceneSuggestion = {
      id: Math.random().toString(36).substr(2, 9),
      panelNumber: 1,
      description: "Novo",
      suggestedDialogue: "DIGITE AQUI...",
      position: { x: 50, y: 50 },
      tailAngle: 0,
      tailLength: 20,
      fontSize: 22,
      bubbleScale: 30,
      bubbleType: 'speech',
      readingOrder: generation.suggestions.length + 1,
      zIndex: 10 + generation.suggestions.length,
      showTail: false
    };
    setGeneration(prev => ({ ...prev, suggestions: [...prev.suggestions, newSug] }));
    setActiveBubbleIdx(generation.suggestions.length);
  };

  const updateActiveBubble = (field: keyof SceneSuggestion, val: any) => {
    const newSugs = [...generation.suggestions];
    if (newSugs[activeBubbleIdx]) {
      (newSugs[activeBubbleIdx] as any)[field] = val;
      setGeneration(prev => ({ ...prev, suggestions: newSugs }));
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || activeBubbleIdx === -1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    updateActiveBubble('position', { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 3, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `manga-final-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const getBubbleStyle = (type: BubbleType) => {
    switch (type) {
      case 'speech': return 'rounded-[50%] border-[4px]';
      case 'scream': return 'clip-path-scream border-[6px] bg-white';
      case 'shock': return 'clip-path-shock border-[5px] bg-white';
      case 'burst': return 'clip-path-burst border-[8px] bg-white';
      case 'thought': return 'rounded-[50%] border-dashed border-[4px]';
      case 'soft-rect': return 'rounded-[20px] border-[4px]';
      case 'trapezoid': return 'rounded-[4px] border-[4px] skew-x-[-4deg]';
      case 'starburst': return 'clip-path-star border-[5px] bg-white';
      case 'capsule': return 'rounded-full border-[4px] px-8';
      case 'bean': return 'rounded-[40%_60%_70%_30%/50%_40%_60%_50%] border-[4px]';
      case 'narrative': return 'rounded-none border-[3px] bg-white shadow-[4px_4px_0_black]';
      case 'whisper': return 'rounded-[50%] border-dotted border-[2px] border-gray-400';
      case 'impact': return 'rounded-lg border-[10px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[4px] border-black animate-glitch-fast';
      case 'heart': return 'clip-path-heart border-[4px] bg-white';
      case 'fear': return 'clip-path-fear border-[3px] bg-white';
      case 'ice': return 'clip-path-ice border-[4px] bg-white';
      case 'radio': return 'clip-path-radio border-[4px] bg-white';
      case 'flower': return 'clip-path-flower border-[4px] bg-white';
      case 'double': return 'rounded-[50%] border-[6px] outline outline-2 outline-black bg-white';
      case 'dripping': return 'clip-path-dripping border-[4px] bg-white';
      case 'mechanical': return 'clip-path-mechanical border-[4px] bg-white';
      case 'sharp': return 'clip-path-sharp border-[5px] bg-white';
      case 'cloud-puffy': return 'rounded-[40%_60%] border-[4px] border-black';
      case 'spiky-thought': return 'clip-path-scream border-[2px] border-dashed bg-white';
      case 'shojo-spark': return 'clip-path-star border-[1px] bg-white/90 backdrop-blur-sm';
      case 'double-oval': return 'rounded-[50%] border-[4px] border-black bg-white shadow-[-4px_-2px_0_black]';
      case 'comic-boom': return 'clip-path-shock border-[10px] border-black bg-white scale-110';
      case 'scroll': return 'rounded-sm border-y-[6px] border-x-[1px] border-black bg-white';
      case 'zig-zag': return 'clip-path-radio border-[2px] bg-white';
      default: return 'rounded-[50%] border-[4px]';
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative max-w-[1600px] mx-auto">
        
        {/* SIDEBAR TOOLBOX */}
        <div className="lg:col-span-4 space-y-4 no-print sticky top-24">
          <div className="manga-panel p-0 bg-black border border-zinc-800 overflow-hidden flex flex-col min-h-[650px] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* TABS STYLING */}
            <div className="flex border-b border-zinc-800">
              {(['text', 'style', 'layout'] as Tab[]).map(t => (
                <button 
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-white text-black' : 'text-zinc-500 hover:text-white bg-zinc-900/20'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0a0a0b] to-[#050505]">
              
              <div className="space-y-8">
                {/* LAYER LIST */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Bubble Layers</label>
                    <button onClick={addManualBubble} className="bg-white text-black px-3 py-1 text-[8px] font-black uppercase hover:bg-zinc-200 transition-colors rounded-full">
                      + NEW
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {generation.suggestions.map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setActiveBubbleIdx(i)}
                        className={`aspect-square border flex items-center justify-center font-black text-[11px] transition-all rounded-sm ${activeBubbleIdx === i ? 'bg-white text-black border-white scale-110 z-10' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-500'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {currentBubble && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                    
                    {activeTab === 'text' && (
                      <div className="space-y-5">
                        <div className="bg-[#0f0f11] border border-zinc-700 p-5 rounded-sm focus-within:border-white transition-colors">
                          <textarea 
                            value={currentBubble.suggestedDialogue} 
                            onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                            className="w-full bg-transparent text-[13px] font-bold text-white uppercase resize-none h-40 focus:outline-none placeholder-zinc-800 leading-relaxed"
                            placeholder="DIÁLOGO..."
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500"><span>TAMANHO FONTE</span><span className="text-white">{currentBubble.fontSize}pt</span></div>
                          <input type="range" min="8" max="120" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                        </div>
                      </div>
                    )}

                    {activeTab === 'style' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-6 gap-2">
                          {BUBBLE_STYLES.map(style => (
                            <button 
                              key={style.type}
                              onClick={() => updateActiveBubble('bubbleType', style.type)}
                              className={`aspect-square border flex items-center justify-center text-sm transition-all rounded-sm ${currentBubble.bubbleType === style.type ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                              title={style.type}
                            >
                              <i className={`fa-solid ${style.icon}`}></i>
                            </button>
                          ))}
                        </div>
                        <div className="text-[8px] font-black uppercase text-center text-zinc-600 tracking-[0.3em]">MANGA ASSETS V3.0</div>
                      </div>
                    )}

                    {activeTab === 'layout' && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500"><span>VOLUME BALÃO</span><span className="text-white">{currentBubble.bubbleScale}%</span></div>
                          <input type="range" min="5" max="98" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500"><span>ROTAÇÃO</span><span className="text-white">{currentBubble.tailAngle}°</span></div>
                          <input type="range" min="-180" max="180" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <button 
                            onClick={() => updateActiveBubble('zIndex', (currentBubble.zIndex || 10) + 1)}
                            className="bg-zinc-900 border border-zinc-700 py-3 text-[8px] font-black uppercase text-zinc-400 hover:bg-white hover:text-black transition-all rounded-sm"
                           >
                             Trazer p/ Frente
                           </button>
                           <button 
                            onClick={() => updateActiveBubble('zIndex', Math.max(1, (currentBubble.zIndex || 10) - 1))}
                            className="bg-zinc-900 border border-zinc-700 py-3 text-[8px] font-black uppercase text-zinc-400 hover:bg-white hover:text-black transition-all rounded-sm"
                           >
                             Enviar p/ Trás
                           </button>
                        </div>
                        <button 
                          onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} 
                          className="w-full py-3 bg-red-950/10 text-red-500 border border-red-900/20 text-[8px] font-black uppercase hover:bg-red-600 hover:text-white transition-all rounded-sm"
                        >
                          Eliminar Balão Selecionado
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-black border-t border-zinc-800">
               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               <div className="flex gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-zinc-900 text-white py-4 text-[9px] font-black uppercase tracking-[0.2em] border border-zinc-700 hover:bg-zinc-800 transition-all">
                   Importar Arte
                 </button>
                 <button onClick={handleDownload} disabled={isExporting} className="flex-1 bg-white text-black py-4 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all">
                   {isExporting ? 'GERANDO...' : 'EXPORTAR'}
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* WORKSPACE CANVAS */}
        <div className="lg:col-span-8 group">
          <div className="manga-panel bg-[#09090b] p-6 lg:p-16 relative halftone-bg min-h-[850px] border border-zinc-800 flex justify-center items-start overflow-hidden rounded-sm">
            
            {/* LOADING OVERLAY */}
            {generation.isAnalyzing && (
              <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-12 text-center text-white backdrop-blur-md">
                <div className="w-64 h-[2px] bg-zinc-900 mb-10 overflow-hidden border border-white/5">
                   <div className="h-full bg-white animate-[loading_1.2s_infinite_linear]" style={{ width: '40%' }}></div>
                </div>
                <p className="manga-font text-3xl italic tracking-[0.2em] uppercase text-zinc-100 animate-pulse">{generation.statusMessage}</p>
                <p className="text-[9px] font-black uppercase text-zinc-600 mt-4 tracking-widest">AI STUDIO ENGINE</p>
              </div>
            )}

            <div 
              ref={exportRef} 
              className={`relative aspect-[1/1.41] bg-white w-full border-[1px] border-black overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div className="relative w-full h-full select-none" ref={canvasRef}>
                {sourceImages.length > 0 ? (
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.5) brightness(1.05) saturate(0)' }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#f8f8f8] flex flex-col items-center justify-center p-10 text-center opacity-40">
                     <i className="fa-solid fa-image text-8xl mb-6 text-zinc-300"></i>
                     <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Aguardando Imagem Original</p>
                  </div>
                )}
                
                <div className="absolute inset-0 pointer-events-none">
                  {generation.suggestions.map((s, idx) => (
                    <div 
                      key={s.id} 
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveBubbleIdx(idx);
                        setIsDragging(true);
                      }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto transition-transform ${activeBubbleIdx === idx ? 'z-40' : 'opacity-90'}`} 
                      style={{ 
                        left: `${s.position.x}%`, 
                        top: `${s.position.y}%`, 
                        width: `${s.bubbleScale}%`,
                        zIndex: s.zIndex || 10,
                        transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg) ${isDragging && activeBubbleIdx === idx ? 'scale(1.05)' : 'scale(1)'}` 
                      }}
                    >
                      <div className="relative w-full group/bubble">
                        <div 
                          className={`bg-white p-5 flex items-center justify-center text-center border-black shadow-2xl ${getBubbleStyle(s.bubbleType)} ${activeBubbleIdx === idx ? 'ring-4 ring-black ring-offset-4 ring-offset-white' : ''}`}
                          style={{ 
                            minHeight: '40px', 
                            width: '100%', 
                            color: s.bubbleType === 'impact' ? '#fff' : '#000',
                          }}
                        >
                           <p className="font-black leading-[0.85] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
                             {s.suggestedDialogue}
                           </p>
                        </div>
                        
                        {/* SELECTION GUIDES */}
                        {activeBubbleIdx === idx && !isExporting && (
                          <div className="absolute -inset-6 border border-black/10 border-dashed rounded-full animate-[spin_20s_linear_infinite] pointer-events-none"></div>
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
        .clip-path-ice { clip-path: polygon(50% 0%, 70% 20%, 100% 10%, 85% 50%, 100% 90%, 70% 80%, 50% 100%, 30% 80%, 0% 90%, 15% 50%, 0% 10%, 30% 20%); }
        .clip-path-radio { clip-path: polygon(0% 0%, 40% 0%, 50% 15%, 60% 0%, 100% 0%, 100% 40%, 85% 50%, 100% 60%, 100% 100%, 60% 100%, 50% 85%, 40% 100%, 0% 100%, 0% 60%, 15% 50%, 0% 40%); }
        .clip-path-flower { clip-path: polygon(50% 0%, 65% 10%, 85% 0%, 95% 20%, 100% 40%, 90% 55%, 100% 70%, 95% 90%, 75% 100%, 50% 90%, 25% 100%, 5% 90%, 0% 70%, 10% 55%, 0% 40%, 5% 20%, 25% 0%, 35% 10%); }
        .clip-path-dripping { clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 90% 100%, 80% 70%, 70% 100%, 60% 70%, 50% 100%, 40% 70%, 30% 100%, 20% 70%, 10% 100%, 0% 70%); }
        .clip-path-mechanical { clip-path: polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%); }
        .clip-path-sharp { clip-path: polygon(0% 50%, 10% 10%, 50% 0%, 90% 10%, 100% 50%, 90% 90%, 50% 100%, 10% 90%); }
      `}</style>
    </Layout>
  );
}
