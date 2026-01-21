
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; icon: string; label: string }[] = [
  { type: 'speech', icon: 'fa-comment', label: 'Oval' },
  { type: 'scream', icon: 'fa-bolt-lightning', label: 'Explosão' },
  { type: 'thought', icon: 'fa-cloud', label: 'Nuvem' },
  { type: 'soft-rect', icon: 'fa-square-full', label: 'Suave' },
  { type: 'trapezoid', icon: 'fa-vector-square', label: 'Angular' },
  { type: 'starburst', icon: 'fa-bahai', label: 'Ação' },
  { type: 'capsule', icon: 'fa-ellipsis', label: 'Cápsula' },
  { type: 'bean', icon: 'fa-shapes', label: 'Orgânico' },
  { type: 'narrative', icon: 'fa-square', label: 'Caixa' },
  { type: 'whisper', icon: 'fa-comment-dots', label: 'Sussurro' },
  { type: 'impact', icon: 'fa-circle-dot', label: 'Impacto' },
  { type: 'electronic', icon: 'fa-microchip', label: 'Digital' },
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
      // Forçamos showTail como false por padrão para todos os balões sugeridos
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
      suggestedDialogue: "Estou pronto para sair da vila. Depois de treinar por dez anos, sinto-me forte",
      position: { x: 50, y: 50 },
      tailAngle: 180,
      tailLength: 20,
      fontSize: 16,
      bubbleScale: 40,
      bubbleType: 'speech',
      readingOrder: generation.suggestions.length + 1,
      showTail: false // Removido por padrão
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
      link.download = `seven-manga-pro-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const getBubbleStyle = (type: BubbleType) => {
    switch (type) {
      case 'speech': return 'rounded-[50%] border-[5px]';
      case 'scream': return 'clip-path-scream border-[6px] bg-white scale-110';
      case 'thought': return 'rounded-[50%] border-dashed border-[5px]';
      case 'soft-rect': return 'rounded-[24px] border-[5px]';
      case 'trapezoid': return 'rounded-[4px] border-[5px] skew-x-[-5deg]';
      case 'starburst': return 'clip-path-star border-[6px] bg-white scale-105';
      case 'capsule': return 'rounded-full border-[5px] px-10';
      case 'bean': return 'rounded-[40%_60%_70%_30%/50%_40%_60%_50%] border-[5px]';
      case 'narrative': return 'rounded-none border-[4px] bg-white shadow-[6px_6px_0_black]';
      case 'whisper': return 'rounded-[50%] border-dotted border-[3px] border-gray-400';
      case 'impact': return 'rounded-lg border-[10px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[4px] border-black animate-glitch-fast';
      default: return 'rounded-[50%] border-[5px]';
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PAINEL DE CONTROLE OTIMIZADO */}
        <div className="lg:col-span-5 space-y-6 no-print">
          <div className="manga-panel p-6 bg-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Balões de Diálogo</h2>
                <div className="h-1 w-12 bg-black mt-1"></div>
              </div>
              <button 
                onClick={addManualBubble} 
                className="bg-black text-white px-5 py-2 text-[11px] font-black uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-plus text-[8px]"></i> NOVO
              </button>
            </div>

            {sourceImages.length === 0 ? (
               <div className="py-16 text-center border-4 border-dashed border-black/10 flex flex-col items-center">
                  <i className="fa-solid fa-cloud-arrow-up text-4xl mb-4 text-black/20"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-6">Carregue sua Arte</p>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-black text-white px-8 py-3 text-[12px] font-black uppercase shadow-[6px_6px_0_#ccc] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">Selecionar Arquivo</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               </div>
            ) : (
              <div className="space-y-8">
                {/* SELETOR DE BALÕES */}
                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                  {generation.suggestions.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveBubbleIdx(i)}
                      className={`min-w-[44px] h-[44px] border-2 border-black flex items-center justify-center font-black text-sm transition-all shadow-[2px_2px_0_black] active:shadow-none ${activeBubbleIdx === i ? 'bg-black text-white scale-105' : 'bg-white text-black hover:bg-gray-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentBubble && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* GRADE DE ÍCONES OTIMIZADA */}
                    <div className="grid grid-cols-6 gap-2">
                      {BUBBLE_STYLES.map(style => (
                        <button 
                          key={style.type}
                          onClick={() => updateActiveBubble('bubbleType', style.type)}
                          className={`aspect-square border-2 border-black flex items-center justify-center text-lg transition-all ${currentBubble.bubbleType === style.type ? 'bg-black text-white scale-110 z-10' : 'bg-white hover:bg-gray-100 opacity-60'}`}
                          title={style.label}
                        >
                          <i className={`fa-solid ${style.icon}`}></i>
                        </button>
                      ))}
                    </div>

                    {/* ÁREA DE TEXTO */}
                    <div className="border-4 border-black p-4 bg-gray-50/50">
                      <textarea 
                        value={currentBubble.suggestedDialogue} 
                        onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                        className="w-full bg-transparent text-base font-bold resize-none h-28 focus:outline-none custom-scrollbar"
                        placeholder="Insira o texto do balão..."
                      />
                    </div>

                    {/* SLIDERS REFINADOS (2 COLUNAS) */}
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-[11px] font-black uppercase tracking-widest">Tamanho</label>
                          <span className="text-[10px] font-mono font-bold bg-black text-white px-2 rounded-sm">{currentBubble.bubbleScale}</span>
                        </div>
                        <input type="range" min="15" max="95" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-[11px] font-black uppercase tracking-widest">Rotação</label>
                          <span className="text-[10px] font-mono font-bold bg-black text-white px-2 rounded-sm">{currentBubble.tailAngle}°</span>
                        </div>
                        <input type="range" min="0" max="360" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-[11px] font-black uppercase tracking-widest">Posição X</label>
                          <span className="text-[10px] font-mono font-bold bg-black text-white px-2 rounded-sm">{currentBubble.position.x}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={currentBubble.position.x} onChange={e => updateActivePosition(parseInt(e.target.value), currentBubble.position.y)} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-[11px] font-black uppercase tracking-widest">Posição Y</label>
                          <span className="text-[10px] font-mono font-bold bg-black text-white px-2 rounded-sm">{currentBubble.position.y}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={currentBubble.position.y} onChange={e => updateActivePosition(currentBubble.position.x, parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-[11px] font-black uppercase tracking-widest">Texto</label>
                          <span className="text-[10px] font-mono font-bold bg-black text-white px-2 rounded-sm">{currentBubble.fontSize}px</span>
                        </div>
                        <input type="range" min="8" max="60" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                      </div>

                      <div className="flex flex-col justify-end gap-3">
                        <button 
                          onClick={() => updateActiveBubble('showTail', !currentBubble.showTail)}
                          className={`w-full py-2 border-2 border-black text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 ${currentBubble.showTail ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                          <i className={`fa-solid ${currentBubble.showTail ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                          {currentBubble.showTail ? 'Seta Ativa' : 'Seta Removida'}
                        </button>
                        <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} className="text-[9px] font-black uppercase text-red-600 hover:underline flex items-center justify-center gap-1">
                          <i className="fa-solid fa-trash-can"></i> Excluir Balão
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {sourceImages.length > 0 && (
            <button 
              onClick={handleDownload} 
              disabled={isExporting} 
              className="w-full bg-black text-white py-5 font-black uppercase italic tracking-widest shadow-[10px_10px_0_#ccc] flex items-center justify-center gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:translate-x-2 active:translate-y-2"
            >
              {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
              Exportar PNG Alta Definição
            </button>
          )}
        </div>

        {/* ÁREA DE RENDERIZAÇÃO */}
        <div className="lg:col-span-7">
          <div className="manga-panel bg-white p-6 relative halftone-bg min-h-[700px]">
            <div ref={exportRef} className="relative aspect-[1/1.4] bg-white w-full border-4 border-black overflow-hidden shadow-2xl select-none">
              {sourceImages.length > 0 ? (
                <div className="relative w-full h-full">
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.25) brightness(1.1) saturate(0)' }}
                  />
                  
                  <div className="absolute inset-0 pointer-events-none">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${activeBubbleIdx === idx ? 'z-30 scale-105' : 'z-10 opacity-90'}`} 
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale}%` }}
                      >
                        <div className="relative w-full">
                          {/* SETA (RABICHO) SHARP MANGA STYLE */}
                          {s.showTail && (
                            <div 
                              className="absolute w-10 h-10 bg-white border-2 border-black z-[-1] origin-center shadow-sm"
                              style={{ 
                                top: '50%', 
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg) translate(0, -55%) rotate(45deg)`,
                                clipPath: 'polygon(0% 0%, 100% 0%, 0% 100%)',
                                display: s.bubbleType === 'narrative' || s.bubbleType === 'impact' ? 'none' : 'block'
                              }}
                            />
                          )}

                          <div 
                            className={`bg-white p-6 flex items-center justify-center text-center border-black shadow-lg ${getBubbleStyle(s.bubbleType)}`}
                            style={{ 
                              minHeight: '80px', 
                              width: '100%', 
                              color: s.bubbleType === 'impact' ? '#fff' : '#000',
                            }}
                          >
                             <p className="font-black leading-[1.0] uppercase tracking-tighter manga-font-adjust" style={{ fontSize: `${s.fontSize}px` }}>
                               {s.suggestedDialogue}
                             </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center h-full opacity-10">
                  <i className="fa-solid fa-wand-magic-sparkles text-[120px] mb-8"></i>
                  <p className="text-4xl font-black italic uppercase tracking-tighter">Estúdio de Letreiramento</p>
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
            92% 35%, 100% 50%, 92% 65%, 100% 85%, 85% 95%, 70% 88%, 50% 100%, 30% 88%, 15% 95%, 0% 85%,
            8% 65%, 0% 50%, 8% 35%
          );
        }
        .clip-path-star {
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
        .manga-font-adjust {
          font-family: 'Noto Sans JP', sans-serif;
          font-weight: 900;
          letter-spacing: -0.05em;
        }
      `}</style>
    </Layout>
  );
}
