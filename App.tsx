
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion, BubbleType } from './types';
import { analyzeMangaPage } from './services/gemini';
import { toPng } from 'html-to-image';

export default function App() {
  const [sourceImage, setSourceImage] = useState<MangaImage | null>(null);
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
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const newImg = {
          id: Date.now().toString(),
          url: base64,
          base64: base64,
          mimeType: file.type,
        };
        setSourceImage(newImg);
        setGeneration({ isGenerating: false, isAnalyzing: true, error: null, resultUrl: null, suggestions: [] });
        try {
          const analysis = await analyzeMangaPage(base64, file.type);
          setGeneration(prev => ({ ...prev, suggestions: analysis, isAnalyzing: false, resultUrl: base64 }));
        } catch (err) {
          setGeneration(prev => ({ ...prev, isAnalyzing: false, error: "Modo manual ativado." }));
        }
      };
      reader.readAsDataURL(file);
    }
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
    try {
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `manga-final-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const bubbleOptions: { label: string; value: BubbleType; icon: string }[] = [
    { label: 'Speech', value: 'speech', icon: 'fa-comment' },
    { label: 'Thought', value: 'thought', icon: 'fa-cloud' },
    { label: 'Scream', value: 'scream', icon: 'fa-bolt' },
    { label: 'Wavy', value: 'wavy', icon: 'fa-cloud-meatball' },
    { label: 'Modern', value: 'modern', icon: 'fa-window-maximize' },
    { label: 'Sharp', value: 'sharp', icon: 'fa-caret-up' },
    { label: 'Organic', value: 'organic', icon: 'fa-circle-nodes' },
    { label: 'Narrative', value: 'narrative', icon: 'fa-square' },
    { label: 'Whisper', value: 'whisper', icon: 'fa-ellipsis' },
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
        return `${base} border-[5px] px-6 py-4 rounded-none`;
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

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 no-print space-y-6">
          <div className="manga-panel p-5 bg-white space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Estúdio Pro</h2>
              <button onClick={addManualBubble} className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">+ Balão</button>
            </div>
            {!sourceImage ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-black p-12 text-center cursor-pointer hover:bg-black hover:text-white transition-all rounded-xl">
                <i className="fa-solid fa-cloud-arrow-up text-4xl mb-2"></i>
                <p className="font-black text-xs uppercase">Carregar Arte</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {generation.suggestions.map((s, i) => (
                  <div key={i} className="border-2 border-black p-4 space-y-3 bg-white shadow-[4px_4px_0px_#000]">
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
                    <textarea value={s.suggestedDialogue} onChange={e => updateSuggestion(i, 'suggestedDialogue', e.target.value)} className="w-full text-xs font-bold border-2 border-black p-2 h-16 resize-none focus:bg-yellow-50 outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase block">Tamanho/Escala</label>
                        <input type="range" min="10" max="80" value={s.bubbleScale} onChange={e => updateSuggestion(i, 'bubbleScale', parseInt(e.target.value))} className="w-full accent-black h-1" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase block">Ang/Comp Rabicho</label>
                        <input type="range" min="0" max="360" value={s.tailAngle} onChange={e => updateSuggestion(i, 'tailAngle', parseInt(e.target.value))} className="w-full accent-black h-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col items-center">
          <div ref={exportRef} className="manga-panel bg-white p-4 min-h-[700px] w-full relative halftone-bg flex items-center justify-center overflow-hidden border-4 border-black">
            {generation.isAnalyzing && <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center font-black uppercase italic animate-pulse">Letreirando via IA...</div>}
            {sourceImage && (
              <div className="relative inline-block bg-white shadow-2xl border-2 border-black">
                <img src={sourceImage.url} alt="Manga" className="w-full h-auto block grayscale contrast-125" />
                <div className="absolute inset-0 pointer-events-none">
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
                            <p className="text-black font-black text-center leading-tight select-none uppercase tracking-tighter" style={{ fontSize: `${s.fontSize || 16}px` }}>{s.suggestedDialogue}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {sourceImage && (
            <div className="mt-6 flex gap-4 w-full">
              <button onClick={() => setSourceImage(null)} className="flex-1 py-4 bg-white border-4 border-black font-black uppercase italic tracking-widest hover:bg-black hover:text-white transition-all">Trocar Arte</button>
              <button onClick={handleDownload} disabled={isExporting} className="flex-1 py-4 bg-black text-white border-4 border-black font-black uppercase italic tracking-widest shadow-[8px_8px_0px_#ccc] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                {isExporting ? 'Processando...' : 'Exportar Página'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
