
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
        setGeneration({ 
          isGenerating: false, 
          isAnalyzing: true, 
          error: null, 
          resultUrl: null, 
          suggestions: [] 
        });
        
        try {
          const analysis = await analyzeMangaPage(base64, file.type);
          setGeneration(prev => ({ 
            ...prev, 
            suggestions: analysis, 
            isAnalyzing: false,
            resultUrl: base64 
          }));
        } catch (err) {
          console.error(err);
          setGeneration(prev => ({ ...prev, isAnalyzing: false, error: "IA indisponível, use o modo manual." }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addManualBubble = () => {
    const newSug: SceneSuggestion = {
      panelNumber: 1,
      description: "Inserção Manual",
      suggestedDialogue: "Estou pronto para sair da vila. Depois de treinar por dez anos, sinto-me forte",
      position: { x: 50, y: 30 },
      tailAngle: 150,
      tailLength: 40,
      fontSize: 18,
      bubbleScale: 35,
      bubbleType: 'speech',
      readingOrder: generation.suggestions.length + 1
    };
    setGeneration(prev => ({
      ...prev,
      suggestions: [...prev.suggestions, newSug]
    }));
  };

  const handleUpdateSuggestion = (index: number, field: keyof SceneSuggestion, value: any) => {
    const newSugs = [...generation.suggestions];
    (newSugs[index] as any)[field] = value;
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const updatePosition = (index: number, x: number, y: number) => {
    const newSugs = [...generation.suggestions];
    newSugs[index].position = { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    };
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const moveStep = (index: number, dx: number, dy: number) => {
    const s = generation.suggestions[index];
    updatePosition(index, s.position.x + dx, s.position.y + dy);
  };

  const removeBubble = (index: number) => {
    const newSugs = generation.suggestions.filter((_, i) => i !== index);
    setGeneration(prev => ({ ...prev, suggestions: newSugs }));
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 300));
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3
      });
      const link = document.createElement('a');
      link.download = `seven-manga-final-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const bubbleOptions: { label: string; value: BubbleType; icon: string }[] = [
    { label: 'Fala', value: 'speech', icon: 'fa-comment' },
    { label: 'Grito', value: 'scream', icon: 'fa-bolt' },
    { label: 'Pensa', value: 'thought', icon: 'fa-cloud' },
    { label: 'Narra', value: 'narrative', icon: 'fa-square' },
    { label: 'Sussu', value: 'whisper', icon: 'fa-ellipsis' },
  ];

  const getBubbleStyles = (s: SceneSuggestion) => {
    const base = "relative bg-white flex items-center justify-center min-h-[80px] pointer-events-auto border-black transition-all";
    switch (s.bubbleType) {
      case 'scream':
        // Uso de filter drop-shadow para criar a borda preta em volta do clip-path
        return `${base} px-12 py-14 shadow-none border-none [filter:drop-shadow(3px_0_0_black)_drop-shadow(-3px_0_0_black)_drop-shadow(0_3px_0_black)_drop-shadow(0_-3px_0_black)] [clip-path:polygon(0%_20%,_5%_0%,_20%_15%,_35%_0%,_50%_15%,_65%_0%,_80%_15%,_95%_0%,_100%_20%,_85%_35%,_100%_50%,_85%_65%,_100%_80%,_95%_100%,_80%_85%,_65%_100%,_50%_85%,_35%_100%,_20%_85%,_5%_100%,_0%_80%,_15%_65%,_0%_50%,_15%_35%)]`;
      case 'thought':
        return `${base} border-[4px] rounded-[100%] border-black px-10 py-12 shadow-none`;
      case 'narrative':
        return `${base} border-[5px] px-6 py-4 rounded-none shadow-none`;
      case 'whisper':
        return `${base} border-[3px] border-dashed rounded-[50%] px-8 py-10 shadow-none`;
      default:
        return `${base} border-[4px] rounded-[50%] px-10 py-12 shadow-none`;
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="manga-panel bg-white p-5 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-xl font-black uppercase flex items-center gap-2 italic">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Editor
              </h2>
              {sourceImage && (
                <button 
                  onClick={addManualBubble}
                  className="bg-black text-white text-[10px] font-black px-3 py-1 uppercase hover:bg-gray-800"
                >
                  + Balão
                </button>
              )}
            </div>
            
            {!sourceImage ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-black p-12 text-center cursor-pointer hover:bg-black hover:text-white transition-all rounded-xl">
                <i className="fa-solid fa-cloud-arrow-up text-5xl mb-4"></i>
                <p className="font-black text-sm uppercase">Abrir Manuscrito</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                {generation.suggestions.map((s, idx) => (
                  <div key={idx} className="bg-white border-2 border-black p-4 space-y-4 shadow-[4px_4px_0px_#000] relative">
                    <button onClick={() => removeBubble(idx)} className="absolute top-2 right-2 hover:text-red-600">
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {bubbleOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleUpdateSuggestion(idx, 'bubbleType', opt.value)}
                            className={`flex-1 flex flex-col items-center p-1 border-2 border-black text-[8px] font-black uppercase transition-colors ${s.bubbleType === opt.value ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                          >
                            <i className={`fa-solid ${opt.icon} mb-1`}></i>
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase italic">Balão #{idx + 1}</span>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1">
                            <i className="fa-solid fa-text-height text-[8px]"></i>
                            <input type="range" min="10" max="40" value={s.fontSize || 16} onChange={(e) => handleUpdateSuggestion(idx, 'fontSize', parseInt(e.target.value))} className="w-12 accent-black h-1 bg-gray-200" />
                          </div>
                          <div className="flex items-center gap-1">
                            <i className="fa-solid fa-up-right-and-down-left-from-center text-[8px]"></i>
                            <input type="range" min="10" max="80" value={s.bubbleScale || 35} onChange={(e) => handleUpdateSuggestion(idx, 'bubbleScale', parseInt(e.target.value))} className="w-12 accent-black h-1 bg-gray-200" />
                          </div>
                        </div>
                      </div>

                      <textarea
                        value={s.suggestedDialogue}
                        onChange={(e) => handleUpdateSuggestion(idx, 'suggestedDialogue', e.target.value)}
                        className="w-full text-sm font-bold border-2 border-black p-2 h-16 resize-none focus:bg-yellow-50 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-3">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase block">Posição X/Y</label>
                        <input type="range" min="0" max="100" value={s.position.x} onChange={(e) => updatePosition(idx, parseInt(e.target.value), s.position.y)} className="w-full h-1 bg-gray-200 accent-black mb-1" />
                        <input type="range" min="0" max="100" value={s.position.y} onChange={(e) => updatePosition(idx, s.position.x, parseInt(e.target.value))} className="w-full h-1 bg-gray-200 accent-black" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <div />
                        <button onClick={() => moveStep(idx, 0, -2)} className="h-6 bg-black text-white flex items-center justify-center"><i className="fa-solid fa-caret-up"></i></button>
                        <div />
                        <button onClick={() => moveStep(idx, -2, 0)} className="h-6 bg-black text-white flex items-center justify-center"><i className="fa-solid fa-caret-left"></i></button>
                        <div className="h-6 flex items-center justify-center text-[8px] font-black border border-black">M</div>
                        <button onClick={() => moveStep(idx, 2, 0)} className="h-6 bg-black text-white flex items-center justify-center"><i className="fa-solid fa-caret-right"></i></button>
                        <div />
                        <button onClick={() => moveStep(idx, 0, 2)} className="h-6 bg-black text-white flex items-center justify-center"><i className="fa-solid fa-caret-down"></i></button>
                        <div />
                      </div>
                    </div>

                    {s.bubbleType !== 'narrative' && (
                      <div className="grid grid-cols-2 gap-3 border-t-2 border-black pt-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase">Ângulo Rabicho</label>
                          <input type="range" min="0" max="360" value={s.tailAngle} onChange={(e) => handleUpdateSuggestion(idx, 'tailAngle', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase">Comp. Rabicho</label>
                          <input type="range" min="0" max="100" value={s.tailLength} onChange={(e) => handleUpdateSuggestion(idx, 'tailLength', parseInt(e.target.value))} className="w-full h-1 accent-black" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => setSourceImage(null)} className="w-full py-4 bg-gray-100 text-black font-black uppercase text-[10px] border-2 border-black hover:bg-black hover:text-white transition-all">
                  Nova Página
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div ref={exportRef} className="manga-panel bg-white p-4 min-h-[800px] flex items-center justify-center relative halftone-bg overflow-hidden border-4 border-black group">
            {generation.isAnalyzing && (
              <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center no-print">
                <div className="w-16 h-16 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-black uppercase italic animate-pulse">Analizando Arte...</h3>
              </div>
            )}

            {!sourceImage ? (
              <div className="text-center opacity-20 flex flex-col items-center no-print">
                <i className="fa-solid fa-palette text-[100px] mb-6"></i>
                <p className="text-3xl font-black uppercase italic">Seven Mangá Canvas</p>
              </div>
            ) : (
              <div className="relative inline-block w-full max-w-3xl bg-white border-2 border-black">
                <img src={sourceImage.url} alt="Manga" className="w-full h-auto block grayscale contrast-125" />
                <div className="absolute inset-0 pointer-events-none">
                  {generation.suggestions.map((s, idx) => {
                    const rad = (s.tailAngle - 90) * (Math.PI / 180);
                    const cosA = Math.cos(rad);
                    const sinA = Math.sin(rad);
                    const currentScale = s.bubbleScale || 35;
                    
                    return (
                      <div 
                        key={idx}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: `${currentScale}%`, zIndex: 100 + idx }}
                      >
                        <div className={getBubbleStyles(s)}>
                          <p className="text-black font-black text-center leading-tight select-none uppercase tracking-tighter" style={{ fontSize: `${s.fontSize || 16}px`, fontFamily: 'Noto Sans JP, sans-serif' }}>
                            {s.suggestedDialogue}
                          </p>
                          
                          {s.bubbleType !== 'narrative' && s.tailLength > 0 && (
                            <div className="absolute pointer-events-none" style={{ left: `calc(50% + ${cosA * 60}%)`, top: `calc(50% + ${sinA * 60}%)`, transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)` }}>
                              <div className="relative flex flex-col items-center">
                                {s.bubbleType === 'thought' ? (
                                  <div className="flex flex-col gap-2 items-center">
                                    <div className="w-5 h-5 rounded-full border-[3px] border-black bg-white shadow-[2px_2px_0_black]"></div>
                                    <div className="w-3 h-3 rounded-full border-[2px] border-black bg-white shadow-[1px_1px_0_black]"></div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-black" style={{ borderTopWidth: `${s.tailLength}px`, marginTop: '-3px' }}></div>
                                    <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-white" style={{ borderTopWidth: `${s.tailLength - 6}px` }}></div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {sourceImage && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-6 no-print">
               <div className="flex items-center gap-3 text-[10px] font-black text-black uppercase italic bg-white px-4 py-3 border-2 border-black shadow-[4px_4px_0px_#000]">
                  <i className="fa-solid fa-circle-info"></i>
                  <span>Ajustado! Os balões de grito agora têm bordas e os de pensamento estão para fora.</span>
               </div>
               <button onClick={handleDownload} disabled={isExporting} className="bg-black text-white border-4 border-black px-12 py-4 font-black uppercase text-base shadow-[6px_6px_0px_#ccc] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2">
                 {isExporting ? <><i className="fa-solid fa-spinner animate-spin"></i> AGUARDE...</> : <><i className="fa-solid fa-download"></i> BAIXAR ARTE</>}
               </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
