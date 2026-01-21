
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; icon: string; label: string }[] = [
  { type: 'speech', icon: 'fa-comment', label: 'Oval' },
  { type: 'scream', icon: 'fa-burst', label: 'Grito' },
  { type: 'shock', icon: 'fa-bolt-lightning', label: 'Choque' },
  { type: 'burst', icon: 'fa-explosion', label: 'Impacto' },
  { type: 'thought', icon: 'fa-cloud', label: 'Nuvem' },
  { type: 'soft-rect', icon: 'fa-square-full', label: 'Suave' },
  { type: 'trapezoid', icon: 'fa-vector-square', label: 'Angular' },
  { type: 'starburst', icon: 'fa-bahai', label: 'Ação' },
  { type: 'capsule', icon: 'fa-ellipsis', label: 'Cápsula' },
  { type: 'bean', icon: 'fa-shapes', label: 'Orgânico' },
  { type: 'narrative', icon: 'fa-square', label: 'Caixa' },
  { type: 'whisper', icon: 'fa-comment-dots', label: 'Sussurro' },
  { type: 'impact', icon: 'fa-circle-dot', label: 'Sólido' },
  { type: 'electronic', icon: 'fa-microchip', label: 'Digital' },
  { type: 'heart', icon: 'fa-heart', label: 'Amor' },
  { type: 'fear', icon: 'fa-ghost', label: 'Pavor' },
  { type: 'ice', icon: 'fa-icicles', label: 'Frio' },
  { type: 'radio', icon: 'fa-radio', label: 'Rádio' },
  { type: 'flower', icon: 'fa-seedling', label: 'Flor' },
  { type: 'double', icon: 'fa-clone', label: 'Duplo' },
  { type: 'dripping', icon: 'fa-droplet', label: 'Derretendo' },
  { type: 'mechanical', icon: 'fa-gear', label: 'Mecânico' },
  { type: 'sharp', icon: 'fa-shredder', label: 'Afiado' },
  { type: 'cloud-puffy', icon: 'fa-cloud-meatball', label: 'Fofura' },
  { type: 'spiky-thought', icon: 'fa-brain', label: 'Neurose' },
  { type: 'shojo-spark', icon: 'fa-wand-magic-sparkles', label: 'Brilho' },
  { type: 'double-oval', icon: 'fa-layer-group', label: 'Sobreposto' },
  { type: 'comic-boom', icon: 'fa-meteor', label: 'Boom' },
  { type: 'scroll', icon: 'fa-scroll', label: 'Pergaminho' },
  { type: 'zig-zag', icon: 'fa-wave-square', label: 'ZigZag' },
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
      suggestedDialogue: "INSIRA SEU TEXTO AQUI!",
      position: { x: 50, y: 50 },
      tailAngle: 0,
      tailLength: 20,
      fontSize: 20,
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
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 3, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `seven-manga-master-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const getBubbleStyle = (type: BubbleType) => {
    switch (type) {
      case 'speech': return 'rounded-[50%] border-[5px]';
      case 'scream': return 'clip-path-scream border-[6px] bg-white';
      case 'shock': return 'clip-path-shock border-[5px] bg-white';
      case 'burst': return 'clip-path-burst border-[8px] bg-white';
      case 'thought': return 'rounded-[50%] border-dashed border-[5px]';
      case 'soft-rect': return 'rounded-[28px] border-[5px]';
      case 'trapezoid': return 'rounded-[4px] border-[5px] skew-x-[-4deg]';
      case 'starburst': return 'clip-path-star border-[5px] bg-white';
      case 'capsule': return 'rounded-full border-[5px] px-10';
      case 'bean': return 'rounded-[40%_60%_70%_30%/50%_40%_60%_50%] border-[5px]';
      case 'narrative': return 'rounded-none border-[4px] bg-white shadow-[6px_6px_0_black]';
      case 'whisper': return 'rounded-[50%] border-dotted border-[3px] border-gray-400';
      case 'impact': return 'rounded-lg border-[12px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[4px] border-black animate-glitch-fast';
      case 'heart': return 'clip-path-heart border-[5px] bg-white';
      case 'fear': return 'clip-path-fear border-[4px] bg-white';
      case 'ice': return 'clip-path-ice border-[5px] bg-white';
      case 'radio': return 'clip-path-radio border-[5px] bg-white';
      case 'flower': return 'clip-path-flower border-[5px] bg-white';
      case 'double': return 'rounded-[50%] border-[8px] outline outline-2 outline-black bg-white';
      case 'dripping': return 'clip-path-dripping border-[5px] bg-white';
      case 'mechanical': return 'clip-path-mechanical border-[4px] bg-white';
      case 'sharp': return 'clip-path-sharp border-[6px] bg-white';
      case 'cloud-puffy': return 'rounded-[40%_60%_40%_60%/60%_40%_60%_40%] border-[5px] border-black';
      case 'spiky-thought': return 'clip-path-scream border-[3px] border-dashed bg-white';
      case 'shojo-spark': return 'clip-path-star border-[2px] bg-white/80 backdrop-blur-sm';
      case 'double-oval': return 'rounded-[50%] border-[4px] border-black bg-white shadow-[-8px_-4px_0_black]';
      case 'comic-boom': return 'clip-path-shock border-[12px] border-black bg-white scale-110';
      case 'scroll': return 'rounded-sm border-y-[6px] border-x-[2px] border-black bg-white';
      case 'zig-zag': return 'clip-path-radio border-[2px] bg-white';
      default: return 'rounded-[50%] border-[5px]';
    }
  };

  const currentBubble = generation.suggestions[activeBubbleIdx];

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PAINEL DE CONTROLE OTIMIZADO */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="manga-panel p-6 bg-white border-4 border-black shadow-[8px_8px_0_black]">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] italic">Manga Studio Master</h2>
              <button 
                onClick={addManualBubble} 
                className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-all shadow-[2px_2px_0_black]"
              >
                + ADD BUBBLE
              </button>
            </div>

            {sourceImages.length === 0 ? (
               <div className="py-20 text-center border-4 border-dotted border-gray-300 rounded-xl flex flex-col items-center">
                  <i className="fa-solid fa-cloud-arrow-up text-4xl mb-4 text-gray-200"></i>
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-6">Arraste sua página de mangá aqui</p>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-black text-white px-10 py-4 text-[12px] font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0_black]">Carregar Arquivo</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
               </div>
            ) : (
              <div className="space-y-6">
                {/* SELETOR DE BALÕES - ESTILO GRID COMPACTO */}
                <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
                  {generation.suggestions.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveBubbleIdx(i)}
                      className={`min-w-[40px] h-[40px] border-2 border-black flex items-center justify-center font-black text-xs transition-all ${activeBubbleIdx === i ? 'bg-black text-white scale-110 shadow-[3px_3px_0_gray]' : 'bg-white text-black opacity-50 hover:opacity-100'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {currentBubble && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* GRADE DE ESTILOS (6 COLUNAS PARA ALTA DENSIDADE) */}
                    <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 border-2 border-black rounded-sm">
                      {BUBBLE_STYLES.map(style => (
                        <button 
                          key={style.type}
                          onClick={() => updateActiveBubble('bubbleType', style.type)}
                          className={`aspect-square border-2 border-black flex items-center justify-center text-xs transition-all ${currentBubble.bubbleType === style.type ? 'bg-black text-white scale-110 z-10 shadow-md' : 'bg-white hover:bg-gray-200 opacity-60'}`}
                          title={style.label}
                        >
                          <i className={`fa-solid ${style.icon}`}></i>
                        </button>
                      ))}
                    </div>

                    <div className="border-4 border-black p-4 bg-white shadow-inner">
                      <textarea 
                        value={currentBubble.suggestedDialogue} 
                        onChange={e => updateActiveBubble('suggestedDialogue', e.target.value)} 
                        className="w-full bg-transparent text-sm font-black uppercase resize-none h-28 focus:outline-none placeholder-gray-300"
                        placeholder="ESCREVA O TEXTO..."
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase"><span>Volume do Balão</span><span>{currentBubble.bubbleScale}%</span></div>
                        <input type="range" min="10" max="98" value={currentBubble.bubbleScale} onChange={e => updateActiveBubble('bubbleScale', parseInt(e.target.value))} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase"><span>Inclinação</span><span>{currentBubble.tailAngle}°</span></div>
                        <input type="range" min="-180" max="180" value={currentBubble.tailAngle} onChange={e => updateActiveBubble('tailAngle', parseInt(e.target.value))} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase">PosX</label>
                          <input type="range" min="0" max="100" value={currentBubble.position.x} onChange={e => updateActivePosition(parseInt(e.target.value), currentBubble.position.y)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase">PosY</label>
                          <input type="range" min="0" max="100" value={currentBubble.position.y} onChange={e => updateActivePosition(currentBubble.position.x, parseInt(e.target.value))} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase"><span>Tipografia</span><span>{currentBubble.fontSize}px</span></div>
                        <input type="range" min="6" max="120" value={currentBubble.fontSize} onChange={e => updateActiveBubble('fontSize', parseInt(e.target.value))} />
                      </div>

                      <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== activeBubbleIdx)}))} className="text-red-500 font-black text-[9px] uppercase hover:bg-red-50 py-2 border border-transparent hover:border-red-200 transition-all rounded text-center">
                        <i className="fa-solid fa-trash mr-1"></i> Eliminar este balão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {sourceImages.length > 0 && (
            <button onClick={handleDownload} disabled={isExporting} className="w-full bg-black text-white py-6 font-black uppercase italic tracking-[0.3em] shadow-[10px_10px_0_#ddd] flex items-center justify-center gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all border-2 border-black">
              {isExporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-export"></i>}
              Gerar Arte Final
            </button>
          )}
        </div>

        {/* ÁREA DE VISUALIZAÇÃO MASTER */}
        <div className="lg:col-span-8">
          <div className="manga-panel bg-[#f0f0f0] p-8 relative halftone-bg min-h-[700px] border-4 border-black">
            <div ref={exportRef} className="relative aspect-[1/1.41] bg-white w-full border-[6px] border-black overflow-hidden shadow-[30px_30px_0_rgba(0,0,0,0.05)]">
              {sourceImages.length > 0 ? (
                <div className="relative w-full h-full">
                  <img 
                    src={sourceImages[0].url} 
                    className="w-full h-full grayscale object-cover"
                    style={{ filter: 'contrast(1.3) brightness(1.05) saturate(0)' }}
                  />
                  
                  <div className="absolute inset-0 pointer-events-none">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${activeBubbleIdx === idx ? 'z-30 scale-105' : 'z-20 opacity-95'}`} 
                        style={{ 
                          left: `${s.position.x}%`, 
                          top: `${s.position.y}%`, 
                          width: `${s.bubbleScale}%`,
                          transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)` 
                        }}
                      >
                        <div className="relative w-full">
                          <div 
                            className={`bg-white p-6 flex items-center justify-center text-center border-black shadow-xl ${getBubbleStyle(s.bubbleType)}`}
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
                          {activeBubbleIdx === idx && (
                            <div className="absolute -inset-2 border-2 border-black border-dashed rounded-lg animate-pulse opacity-20 pointer-events-none"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-5 select-none">
                   <i className="fa-solid fa-pen-nib text-[12rem] mb-8"></i>
                   <p className="text-5xl font-black italic uppercase tracking-tighter">Studio Edition</p>
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
        .clip-path-heart {
          clip-path: polygon(50% 15%, 75% 0%, 100% 25%, 50% 100%, 0% 25%, 25% 0%);
        }
        .clip-path-fear {
          clip-path: polygon(0% 10%, 10% 0%, 20% 15%, 30% 5%, 40% 15%, 50% 0%, 60% 15%, 70% 5%, 80% 15%, 90% 0%, 100% 10%, 95% 30%, 100% 50%, 95% 70%, 100% 90%, 90% 100%, 80% 85%, 70% 95%, 60% 85%, 50% 100%, 40% 85%, 30% 95%, 20% 85%, 10% 100%, 0% 90%, 5% 70%, 0% 50%, 5% 30%);
        }
        .clip-path-ice {
          clip-path: polygon(50% 0%, 70% 20%, 100% 10%, 85% 50%, 100% 90%, 70% 80%, 50% 100%, 30% 80%, 0% 90%, 15% 50%, 0% 10%, 30% 20%);
        }
        .clip-path-radio {
          clip-path: polygon(0% 0%, 40% 0%, 50% 15%, 60% 0%, 100% 0%, 100% 40%, 85% 50%, 100% 60%, 100% 100%, 60% 100%, 50% 85%, 40% 100%, 0% 100%, 0% 60%, 15% 50%, 0% 40%);
        }
        .clip-path-flower {
          clip-path: polygon(50% 0%, 65% 10%, 85% 0%, 95% 20%, 100% 40%, 90% 55%, 100% 70%, 95% 90%, 75% 100%, 50% 90%, 25% 100%, 5% 90%, 0% 70%, 10% 55%, 0% 40%, 5% 20%, 25% 0%, 35% 10%);
        }
        .clip-path-dripping {
          clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 90% 100%, 80% 70%, 70% 100%, 60% 70%, 50% 100%, 40% 70%, 30% 100%, 20% 70%, 10% 100%, 0% 70%);
        }
        .clip-path-mechanical {
          clip-path: polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%);
        }
        .clip-path-sharp {
          clip-path: polygon(0% 50%, 10% 10%, 50% 0%, 90% 10%, 100% 50%, 90% 90%, 50% 100%, 10% 90%);
        }
      `}</style>
    </Layout>
  );
}
