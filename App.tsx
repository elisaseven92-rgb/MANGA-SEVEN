
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; icon: string }[] = [
  { type: 'speech', icon: 'fa-circle' },
  { type: 'scream', icon: 'fa-certificate' },
  { type: 'thought', icon: 'fa-cloud' },
  { type: 'soft-rect', icon: 'fa-square' },
  { type: 'trapezoid', icon: 'fa-shapes' },
  { type: 'starburst', icon: 'fa-sun' },
  { type: 'capsule', icon: 'fa-minus' },
  { type: 'bean', icon: 'fa-egg' },
  { type: 'narrative', icon: 'fa-stop' },
  { type: 'whisper', icon: 'fa-ellipsis' },
  { type: 'impact', icon: 'fa-circle-dot' },
  { type: 'electronic', icon: 'fa-bolt' },
];

export default function App() {
  const [sourceImages, setSourceImages] = useState<MangaImage[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activeBubbleIdx, setActiveBubbleIdx] = useState<number>(0);
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
        zoom: 1,
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
      const formatted = analysis.map(s => ({ ...s, showTail: false }));
      setGeneration(prev => ({ ...prev, suggestions: formatted, isAnalyzing: false }));
      if (formatted.length > 0) setActiveBubbleIdx(0);
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const addManualBubble = () => {
    const newSug: SceneSuggestion = {
      panelNumber: 1,
      description: "Novo Balão",
      suggestedDialogue: "Estou pronto para sair da vila...",
      position: { x: 50, y: 50 },
      tailAngle: 180,
      tailLength: 20,
      fontSize: 16,
      bubbleScale: 35,
      bubbleType: 'speech',
      readingOrder: generation.suggestions.length + 1,
      showTail: false
    };
    setGeneration(prev => ({ ...prev, suggestions: [...prev.suggestions, newSug] }));
    setActiveBubbleIdx(generation.suggestions.length);
  };

  const updateActiveBubble = (field: keyof SceneSuggestion, val: any) => {
    const newSugs = [...generation.suggestions];
    (newSugs[activeBubbleIdx] as any)[field] = val;
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const updateActivePosition = (x: number, y: number) => {
    const newSugs = [...generation.suggestions];
    newSugs[activeBubbleIdx].position = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 3, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `seven-manga-export-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const getBubbleStyle = (type: BubbleType) => {
    switch (type) {
      case 'speech': return 'rounded-[50%] border-[4px]';
      case 'scream': return 'clip-path-scream border-[5px] bg-white scale-110';
      case 'thought': return 'rounded-[50%] border-dashed border-[4px]';
      case 'soft-rect': return 'rounded-[16px] border-[4px]';
      case 'trapezoid': return 'rounded-[2px] border-[4px] skew-x-[-3deg]';
      case 'starburst': return 'clip-path-star border-[5px] bg-white scale-105';
      case 'capsule': return 'rounded-full border-[4px] px-6';
      case 'bean': return 'rounded-[40%_60%_60%_40%/60%_30%_70%_40%] border-[4px]';
      case 'narrative': return 'rounded-none border-[3px] bg-white shadow-[4px_4px_0_black]';
      case 'whisper': return 'rounded-[50%] border-dotted border-[2.5px] border-gray-400';
      case 'impact': return 'rounded-lg border-[8px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[3px] border-black animate-glitch-fast';
      default: return 'rounded-[50%] border-[4px]';
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* EDITOR PAREDE ESQUERDA (ESTILO REFERÊNCIA) */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="manga-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest italic">Balões de Diálogo</h2>
              <button 
                onClick={addManualBubble} 
                className="bg-black text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-white hover:text-black border-2 border-black transition-all"
              >
                + Novo
              </button>
            </div>

            {sourceImages.length === 0 ? (
               <div className="py-10 text-center border-2 border-dashed border-gray-200">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-4">Carregue sua arte para começar</p>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-black text-white px-6 py-2 text-[11px] font-black uppercase">Fazer Upload</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               </div>
            ) : (
              <div className="space-y-6">
                {/* LISTA DE BALÕES ATIVOS */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {generation.suggestions.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveBubbleIdx(i)}
                      className={`min-w-[40px] h-[40px] border-2 border-black flex items-center justify-center font-black text-xs transition-all ${activeBubbleIdx === i ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentBubble && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* GRADE DE TIPOS (ESTILO REFERÊNCIA) */}
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                      {BUBBLE_STYLES.map(style => (
                        <button 
                          key={style.type}
                          onClick={() => updateActiveBubble('bubbleType', style.type)}
                          className={`aspect-square border border-black/20 flex items-center justify-center text-sm transition-all ${currentBubble.bubbleType === style.type ? 'bg-black text-white border-black scale-105 shadow-md' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <i className={`fa-solid ${style.icon}`}></i>
                        </button>
                      ))}
                    </div>

                    {/* CAIXA DE TEXTO */}
                    <div className="border-2 border-black p-4">
                      <textarea 
                        value={currentBubble.suggestedDialogue} 
                        onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                        placeholder="Digite o diálogo aqui..."
                        className="w-full bg-transparent text-sm font-bold resize-none h-24 focus:outline-none"
                      />
                    </div>

                    {/* CONTROLES EM DUAS COLUNAS (ESTILO REFERÊNCIA) */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-tighter">Tamanho</label>
                          <span className="text-[9px] font-mono">{currentBubble.bubbleScale}%</span>
                        </div>
                        <input type="range" min="15" max="90" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-tighter">Rotação Seta</label>
                          <span className="text-[9px] font-mono">{currentBubble.tailAngle}°</span>
                        </div>
                        <input type="range" min="0" max="360" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-tighter">Posição X</label>
                          <span className="text-[9px] font-mono">{currentBubble.position.x}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={currentBubble.position.x} onChange={e => updateActivePosition(parseInt(e.target.value), currentBubble.position.y)} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-tighter">Posição Y</label>
                          <span className="text-[9px] font-mono">{currentBubble.position.y}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={currentBubble.position.y} onChange={e => updateActivePosition(currentBubble.position.x, parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-tighter">Tamanho Fonte</label>
                          <span className="text-[9px] font-mono">{currentBubble.fontSize}px</span>
                        </div>
                        <input type="range" min="8" max="50" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-5 h-5 border-2 border-black flex items-center justify-center transition-all ${currentBubble.showTail ? 'bg-black' : 'bg-white'}`}>
                            {currentBubble.showTail && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                          </div>
                          <input type="checkbox" checked={currentBubble.showTail} onChange={e => updateActiveBubble('showTail', e.target.checked)} className="hidden" />
                          <span className="text-[10px] font-black uppercase">Mostrar Seta</span>
                        </label>
                        <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} className="text-red-500 hover:text-red-700 ml-auto">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {sourceImages.length > 0 && (
            <div className="manga-panel p-6 bg-yellow-50">
               <h3 className="text-[10px] font-black uppercase mb-4">Opções de Exportação</h3>
               <button onClick={handleDownload} disabled={isExporting} className="w-full bg-black text-white py-4 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-800 transition-all">
                  {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
                  Gerar PNG Final
               </button>
            </div>
          )}
        </div>

        {/* CANVAS DE VISUALIZAÇÃO */}
        <div className="lg:col-span-7">
          <div className="manga-panel bg-white p-6 relative halftone-bg">
            <div ref={exportRef} className="relative aspect-[1/1.4] bg-white w-full border-2 border-black overflow-hidden select-none">
              {sourceImages.length > 0 ? (
                <div className="relative w-full h-full">
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                  />
                  
                  <div className="absolute inset-0 pointer-events-none">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${activeBubbleIdx === idx ? 'z-20 scale-105' : 'z-10 opacity-90'}`} 
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale}%` }}
                      >
                        <div className="relative w-full">
                          {/* SETA (RABICHO) */}
                          {s.showTail && (
                            <div 
                              className="absolute w-6 h-6 bg-white border-2 border-black z-[-1] origin-center"
                              style={{ 
                                top: '50%', 
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg) translate(0, -50%) rotate(45deg)`,
                                clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
                                display: s.bubbleType === 'narrative' || s.bubbleType === 'impact' ? 'none' : 'block'
                              }}
                            />
                          )}

                          <div 
                            className={`bg-white p-5 flex items-center justify-center text-center border-black ${getBubbleStyle(s.bubbleType)}`}
                            style={{ 
                              minHeight: '60px', 
                              width: '100%', 
                              color: s.bubbleType === 'impact' ? '#fff' : '#000',
                            }}
                          >
                             <p className="font-black leading-[1.1] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
                               {s.suggestedDialogue}
                             </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center h-full opacity-20">
                  <i className="fa-solid fa-pen-nib text-9xl mb-6"></i>
                  <p className="text-3xl font-black italic uppercase">Editor de Balões</p>
                </div>
              )}
            </div>
          </div>
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
        .clip-path-star {
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
      `}</style>
    </Layout>
  );
}
