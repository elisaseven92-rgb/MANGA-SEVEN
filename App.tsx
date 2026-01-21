
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; icon: string; label: string }[] = [
  { type: 'speech', icon: 'fa-circle', label: 'Oval' },
  { type: 'scream', icon: 'fa-burst', label: 'Grito' },
  { type: 'shock', icon: 'fa-bolt-lightning', label: 'Choque' },
  { type: 'burst', icon: 'fa-bahai', label: 'Impacto' },
  { type: 'thought', icon: 'fa-cloud', label: 'Nuvem' },
  { type: 'soft-rect', icon: 'fa-square-full', label: 'Suave' },
  { type: 'trapezoid', icon: 'fa-vector-square', label: 'Angular' },
  { type: 'starburst', icon: 'fa-star', label: 'Ação' },
  { type: 'capsule', icon: 'fa-ellipsis', label: 'Cápsula' },
  { type: 'bean', icon: 'fa-shapes', label: 'Orgânico' },
  { type: 'narrative', icon: 'fa-square', label: 'Caixa' },
  { type: 'whisper', icon: 'fa-comment-dots', label: 'Sussurro' },
  { type: 'impact', icon: 'fa-circle-dot', label: 'Impacto' },
  { type: 'electronic', icon: 'fa-bolt', label: 'Digital' },
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
      suggestedDialogue: "ESTOU PRONTO PARA SAIR DA VILA!",
      position: { x: 50, y: 50 },
      tailAngle: 0,
      tailLength: 20,
      fontSize: 18,
      bubbleScale: 40,
      bubbleType: 'scream',
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
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 3, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `seven-manga-shout-${Date.now()}.png`;
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
      case 'soft-rect': return 'rounded-[28px] border-[4px]';
      case 'trapezoid': return 'rounded-[4px] border-[4px] skew-x-[-4deg]';
      case 'starburst': return 'clip-path-star border-[5px] bg-white';
      case 'capsule': return 'rounded-full border-[4px] px-10';
      case 'bean': return 'rounded-[40%_60%_70%_30%/50%_40%_60%_50%] border-[4px]';
      case 'narrative': return 'rounded-none border-[3px] bg-white shadow-[6px_6px_0_black]';
      case 'whisper': return 'rounded-[50%] border-dotted border-[3px] border-gray-400';
      case 'impact': return 'rounded-lg border-[10px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[4px] border-black animate-glitch-fast';
      default: return 'rounded-[50%] border-[4px]';
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PAINEL DE CONTROLE */}
        <div className="lg:col-span-5 space-y-6 no-print">
          <div className="manga-panel p-6 bg-white border-4 border-black shadow-[8px_8px_0_black]">
            <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
              <h2 className="text-sm font-black uppercase tracking-widest italic">Estúdio de Grito</h2>
              <button 
                onClick={addManualBubble} 
                className="bg-black text-white px-5 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-all"
              >
                + NOVO BALÃO
              </button>
            </div>

            {sourceImages.length === 0 ? (
               <div className="py-20 text-center border-4 border-dotted border-gray-300 rounded-xl flex flex-col items-center">
                  <i className="fa-solid fa-volume-high text-4xl mb-4 text-gray-300"></i>
                  <p className="text-[11px] font-black uppercase text-gray-400 mb-6">Insira a cena para letreiramento</p>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-black text-white px-8 py-3 text-[12px] font-black uppercase">Fazer Upload</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               </div>
            ) : (
              <div className="space-y-8">
                {/* SELETOR DE BALÕES */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {generation.suggestions.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveBubbleIdx(i)}
                      className={`min-w-[44px] h-[44px] border-2 border-black flex items-center justify-center font-black text-sm transition-all shadow-[2px_2px_0_black] ${activeBubbleIdx === i ? 'bg-black text-white scale-105' : 'bg-white text-black'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentBubble && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* GRADE DE ESTILOS */}
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                      {BUBBLE_STYLES.map(style => (
                        <button 
                          key={style.type}
                          onClick={() => updateActiveBubble('bubbleType', style.type)}
                          className={`aspect-square border-2 border-black flex items-center justify-center text-lg transition-all ${currentBubble.bubbleType === style.type ? 'bg-black text-white scale-110 shadow-lg z-10' : 'bg-white hover:bg-gray-50 opacity-50'}`}
                          title={style.label}
                        >
                          <i className={`fa-solid ${style.icon}`}></i>
                        </button>
                      ))}
                    </div>

                    {/* TEXT AREA */}
                    <div className="border-4 border-black p-4 bg-gray-50">
                      <textarea 
                        value={currentBubble.suggestedDialogue} 
                        onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                        className="w-full bg-transparent text-sm font-black uppercase resize-none h-24 focus:outline-none"
                        placeholder="ESCREVA O GRITO..."
                      />
                    </div>

                    {/* SLIDERS */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-tighter">Escala</label>
                        <input type="range" min="15" max="95" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-tighter">Rotação Balão</label>
                        <input type="range" min="-180" max="180" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-tighter">Horizontal (X)</label>
                        <input type="range" min="0" max="100" value={currentBubble.position.x} onChange={e => updateActivePosition(parseInt(e.target.value), currentBubble.position.y)} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-tighter">Vertical (Y)</label>
                        <input type="range" min="0" max="100" value={currentBubble.position.y} onChange={e => updateActivePosition(currentBubble.position.x, parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-tighter">Tamanho Fonte</label>
                        <input type="range" min="8" max="70" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                      </div>

                      <div className="flex items-center justify-end">
                        <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} className="text-red-600 font-black text-[9px] uppercase hover:underline">
                          <i className="fa-solid fa-trash-can mr-1"></i> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {sourceImages.length > 0 && (
            <button onClick={handleDownload} disabled={isExporting} className="w-full bg-black text-white py-5 font-black uppercase italic tracking-widest shadow-[8px_8px_0_#ccc] flex items-center justify-center gap-3 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-down"></i>}
              Baixar PNG HD
            </button>
          )}
        </div>

        {/* ÁREA DE VISUALIZAÇÃO */}
        <div className="lg:col-span-7">
          <div className="manga-panel bg-white p-6 relative halftone-bg min-h-[600px]">
            <div ref={exportRef} className="relative aspect-[1/1.41] bg-white w-full border-4 border-black overflow-hidden shadow-2xl">
              {sourceImages.length > 0 ? (
                <div className="relative w-full h-full">
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.3) brightness(1.1)' }}
                  />
                  
                  <div className="absolute inset-0 pointer-events-none">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${activeBubbleIdx === idx ? 'z-20 scale-105' : 'z-10'}`} 
                        style={{ 
                          left: `${s.position.x}%`, 
                          top: `${s.position.y}%`, 
                          width: `${s.bubbleScale}%`,
                          transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)` 
                        }}
                      >
                        <div className="relative w-full">
                          <div 
                            className={`bg-white p-6 flex items-center justify-center text-center border-black shadow-lg ${getBubbleStyle(s.bubbleType)}`}
                            style={{ 
                              minHeight: '60px', 
                              width: '100%', 
                              color: s.bubbleType === 'impact' ? '#fff' : '#000',
                            }}
                          >
                             <p className="font-black leading-[1.0] uppercase tracking-tighter" style={{ fontSize: `${s.fontSize}px` }}>
                               {s.suggestedDialogue}
                             </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-10">
                   <i className="fa-solid fa-microphone-lines text-8xl mb-4"></i>
                   <p className="text-3xl font-black italic uppercase">Modo Grito Ativado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .clip-path-scream {
          clip-path: polygon(
            0% 20%, 10% 0%, 25% 15%, 40% 0%, 55% 15%, 75% 0%, 90% 15%, 100% 30%,
            92% 50%, 100% 70%, 90% 85%, 75% 100%, 55% 85%, 40% 100%, 25% 85%, 10% 100%, 0% 80%,
            8% 50%, 0% 30%
          );
        }
        .clip-path-shock {
          clip-path: polygon(
            50% 0%, 55% 35%, 90% 10%, 65% 45%, 100% 50%, 65% 55%, 90% 90%, 55% 65%, 50% 100%, 45% 65%, 10% 90%, 35% 55%, 0% 50%, 35% 45%, 10% 10%, 45% 35%
          );
        }
        .clip-path-burst {
          clip-path: polygon(
            0% 0%, 20% 5%, 40% 0%, 60% 5%, 80% 0%, 100% 0%, 95% 20%, 100% 40%, 95% 60%, 100% 80%, 100% 100%, 80% 95%, 60% 100%, 40% 95%, 20% 100%, 0% 100%, 5% 80%, 0% 60%, 5% 40%, 0% 20%
          );
        }
        .clip-path-star {
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
      `}</style>
    </Layout>
  );
}
