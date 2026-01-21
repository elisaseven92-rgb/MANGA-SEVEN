
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

const BUBBLE_STYLES: { type: BubbleType; label: string; icon: string }[] = [
  { type: 'speech', label: 'Oval', icon: 'fa-comment' },
  { type: 'scream', label: 'Explosão', icon: 'fa-burst' },
  { type: 'thought', label: 'Nuvem', icon: 'fa-cloud' },
  { type: 'soft-rect', label: 'Arredondado', icon: 'fa-square-check' },
  { type: 'trapezoid', label: 'Angular', icon: 'fa-vector-square' },
  { type: 'starburst', label: 'Ação', icon: 'fa-star' },
  { type: 'capsule', label: 'Cápsula', icon: 'fa-capsules' },
  { type: 'bean', label: 'Orgânico', icon: 'fa-shapes' },
  { type: 'narrative', label: 'Caixa', icon: 'fa-square' },
  { type: 'whisper', label: 'Sussurro', icon: 'fa-ellipsis' },
  { type: 'impact', label: 'Sólido', icon: 'fa-circle-dot' },
  { type: 'electronic', label: 'Rádio', icon: 'fa-bolt' },
];

export default function App() {
  const [sourceImages, setSourceImages] = useState<MangaImage[]>([]);
  const [isExporting, setIsExporting] = useState(false);
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
        zoom: 1.1,
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
      const analysisWithTailControl = analysis.map(s => ({ ...s, showTail: false }));
      setGeneration(prev => ({ ...prev, suggestions: analysisWithTailControl, isAnalyzing: false }));
    } catch (err) {
      setGeneration(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const addManualBubble = () => {
    const newSug: SceneSuggestion = {
      panelNumber: 1,
      description: "Novo Balão",
      suggestedDialogue: "Estou pronto para sair da vila. Depois de treinar por dez anos, sinto-me forte",
      position: { x: 50, y: 30 },
      tailAngle: 180,
      tailLength: 20,
      fontSize: 18,
      bubbleScale: 40,
      bubbleType: 'speech',
      readingOrder: generation.suggestions.length + 1,
      showTail: false
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

  const updateImageTransform = (id: string, field: keyof MangaImage, val: number) => {
    setSourceImages(prev => prev.map(img => img.id === id ? { ...img, [field]: val } : img));
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `seven-manga-pro-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const getBubbleStyleClass = (type: BubbleType) => {
    switch (type) {
      case 'speech': return 'rounded-[50%] border-[5px]';
      case 'scream': return 'clip-path-scream border-[6px] bg-white scale-110';
      case 'thought': return 'rounded-[50%] border-dashed border-[5px] bubble-thought-bg';
      case 'soft-rect': return 'rounded-[20px] border-[5px]';
      case 'trapezoid': return 'rounded-[5px] border-[5px] skew-x-[-4deg]';
      case 'starburst': return 'clip-path-star border-[6px] bg-white scale-105';
      case 'capsule': return 'rounded-full border-[5px] px-8 py-4';
      case 'bean': return 'rounded-[40%_60%_60%_40%/60%_30%_70%_40%] border-[5px]';
      case 'narrative': return 'rounded-none border-[4px] bg-white shadow-[6px_6px_0_black]';
      case 'whisper': return 'rounded-[50%] border-dotted border-[3px] border-gray-400 opacity-80';
      case 'impact': return 'rounded-lg border-[10px] bg-black text-white border-black';
      case 'electronic': return 'rounded-none border-[4px] border-black animate-glitch';
      default: return 'rounded-[50%] border-[5px]';
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CONTROLES */}
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-6 bg-white border-4 border-black shadow-[8px_8px_0_black]">
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Seven Studio</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modelos da Imagem</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-black hover:bg-white hover:text-black transition-all">Arte</button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {sourceImages.length > 0 && (
              <div className="space-y-4 mt-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                <button onClick={addManualBubble} className="w-full bg-black text-white py-3 font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-colors">Novo Balão</button>
                
                {generation.suggestions.map((s, i) => (
                  <div key={i} className="border-2 border-black p-4 bg-white shadow-[4px_4px_0_black] space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5">Balão {i+1}</span>
                       <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={s.showTail} onChange={e => updateSuggestion(i, 'showTail', e.target.checked)} className="w-3 h-3 accent-black" />
                            <span className="text-[9px] font-black uppercase">Seta</span>
                          </label>
                          <button onClick={() => setGeneration(p => ({...p, suggestions: p.suggestions.filter((_, idx) => idx !== i)}))} className="text-red-600">
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                       </div>
                    </div>

                    <textarea 
                      value={s.suggestedDialogue} 
                      onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} 
                      className="w-full text-[11px] font-bold border-2 border-black p-2 h-16 resize-none focus:bg-yellow-50"
                    />

                    <div className="grid grid-cols-6 gap-1">
                      {BUBBLE_STYLES.map(style => (
                        <button 
                          key={style.type}
                          onClick={() => updateSuggestion(i, 'bubbleType', style.type)}
                          className={`p-2 border border-black text-[10px] flex items-center justify-center transition-all ${s.bubbleType === style.type ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
                          title={style.label}
                        >
                          <i className={`fa-solid ${style.icon}`}></i>
                        </button>
                      ))}
                    </div>

                    {s.showTail && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-gray-400">Direção da Seta</span>
                        <input type="range" min="0" max="360" value={s.tailAngle} onChange={e => updateSuggestion(i, 'tailAngle', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-gray-400">Escala</span>
                        <input type="range" min="15" max="80" value={s.bubbleScale} onChange={e => updateSuggestion(i, 'bubbleScale', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-gray-400">Fonte</span>
                        <input type="range" min="10" max="40" value={s.fontSize} onChange={e => updateSuggestion(i, 'fontSize', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <input type="range" min="0" max="100" value={s.position.x} onChange={e => updatePosition(i, parseInt(e.target.value), s.position.y)} className="w-full h-1 accent-black" />
                       <input type="range" min="0" max="100" value={s.position.y} onChange={e => updatePosition(i, s.position.x, parseInt(e.target.value))} className="w-full h-1 accent-black" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CANVAS */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="manga-panel bg-white p-8 min-h-[850px] w-full max-w-[650px] relative halftone-bg border-4 border-black">
            <div ref={exportRef} className="relative aspect-[3/4] bg-white w-full border-2 border-black overflow-hidden shadow-2xl">
              {sourceImages.length > 0 ? (
                <div className="relative w-full h-full">
                  <div className="w-full h-full bg-black overflow-hidden">
                     <img 
                        src={sourceImages[0].url} 
                        className="w-full h-full grayscale object-cover opacity-95"
                        style={{
                          transform: `scale(${sourceImages[0].zoom}) translate(${sourceImages[0].offsetX}%, ${sourceImages[0].offsetY}%)`,
                          filter: 'contrast(1.3) brightness(1.1)'
                        }}
                      />
                  </div>
                  
                  <div className="absolute inset-0 pointer-events-none">
                    {generation.suggestions.map((s, idx) => (
                      <div 
                        key={idx} 
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" 
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${s.bubbleScale}%` }}
                      >
                        <div className="relative w-full">
                          {/* RABICHO ADAPTATIVO */}
                          {s.showTail && (
                            <div 
                              className={`absolute w-8 h-8 z-[-1] origin-center ${s.bubbleType === 'thought' ? 'bg-white rounded-full' : 'bg-white border-2 border-black'}`}
                              style={{ 
                                top: '50%', 
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg) translate(0, -50%) ${s.bubbleType === 'thought' ? 'scale(0.4)' : 'rotate(45deg)'}`,
                                clipPath: s.bubbleType === 'thought' ? 'none' : 'polygon(0% 0%, 100% 0%, 0% 100%)',
                                display: s.bubbleType === 'narrative' || s.bubbleType === 'impact' ? 'none' : 'block'
                              }}
                            />
                          )}

                          <div 
                            className={`bg-white p-6 flex items-center justify-center text-center transition-all border-black ${getBubbleStyleClass(s.bubbleType)}`}
                            style={{ 
                              minHeight: '80px', 
                              width: '100%', 
                              color: s.bubbleType === 'impact' ? '#fff' : '#000',
                              borderStyle: s.bubbleType === 'whisper' ? 'dotted' : 'solid'
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
                <div className="flex-grow flex flex-col items-center justify-center h-full opacity-10">
                  <i className="fa-solid fa-cloud-upload-alt text-9xl mb-8"></i>
                  <p className="text-4xl font-black italic uppercase">Selecione uma Arte</p>
                </div>
              )}
            </div>
          </div>

          {sourceImages.length > 0 && (
            <button onClick={handleDownload} disabled={isExporting} className="mt-8 w-full max-w-[650px] py-5 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[10px_10px_0_#ccc] flex items-center justify-center gap-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              {isExporting ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-download"></i>}
              Exportar para PNG
            </button>
          )}
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
          clip-path: polygon(
            50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%
          );
        }
        @keyframes glitch {
          0% { transform: skew(0deg); }
          50% { transform: skew(3deg); }
          100% { transform: skew(-2deg); }
        }
        .animate-glitch { animation: glitch 0.4s infinite alternate; }
        .bubble-thought-bg {
          background-image: radial-gradient(circle at center, #fff 70%, transparent 71%);
          background-size: 24px 24px;
        }
      `}</style>
    </Layout>
  );
}
