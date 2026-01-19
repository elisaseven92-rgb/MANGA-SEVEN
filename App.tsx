
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import { MangaImage, GenerationState, SceneSuggestion } from './types';
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
          setGeneration(prev => ({ ...prev, isAnalyzing: false, error: "Falha na análise." }));
        }
      };
      reader.readAsDataURL(file);
    }
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
      await new Promise(r => setTimeout(r, 200));
      
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const link = document.createElement('a');
      link.download = `manga-export-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar imagem:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel lateral B&W */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="manga-panel bg-white p-5 space-y-4">
            <h2 className="text-xl font-black uppercase flex items-center gap-2 border-b-4 border-black pb-2 italic">
              <i className="fa-solid fa-pen-nib"></i>
              Editor P&B
            </h2>
            
            {!sourceImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-black p-12 text-center cursor-pointer hover:bg-black hover:text-white transition-all rounded-xl group"
              >
                <i className="fa-solid fa-upload text-5xl mb-4 group-hover:scale-110 transition-transform"></i>
                <p className="font-black text-sm uppercase">Carregar Manuscrito</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {generation.suggestions.map((s, idx) => (
                  <div key={idx} className="bg-white border-2 border-black p-4 space-y-4 shadow-[4px_4px_0px_#000] relative">
                    <button onClick={() => removeBubble(idx)} className="absolute top-2 right-2 text-black hover:scale-110 transition-transform">
                      <i className="fa-solid fa-circle-xmark text-lg"></i>
                    </button>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black bg-black text-white px-3 py-0.5 italic">QUADRO #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                           <i className="fa-solid fa-font text-[10px]"></i>
                           <input 
                              type="range" 
                              min="8" max="32" 
                              value={s.fontSize || 16} 
                              onChange={(e) => handleUpdateSuggestion(idx, 'fontSize', parseInt(e.target.value))}
                              className="w-16 accent-black h-1 bg-gray-200 border border-black appearance-none"
                           />
                        </div>
                      </div>
                      <textarea
                        value={s.suggestedDialogue}
                        onChange={(e) => handleUpdateSuggestion(idx, 'suggestedDialogue', e.target.value)}
                        className="w-full text-xs font-bold border-2 border-black p-2 h-16 resize-none outline-none focus:bg-gray-50"
                        placeholder="Diálogo..."
                      />
                    </div>

                    <div className="space-y-2 border-t-2 border-black pt-3">
                      <label className="text-[10px] font-black uppercase text-black">Ajuste de Posição</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-grow space-y-3">
                           <input type="range" min="0" max="100" value={s.position.x} onChange={(e) => updatePosition(idx, parseInt(e.target.value), s.position.y)} className="w-full h-2 bg-gray-200 accent-black cursor-pointer appearance-none border border-black" />
                           <input type="range" min="0" max="100" value={s.position.y} onChange={(e) => updatePosition(idx, s.position.x, parseInt(e.target.value))} className="w-full h-2 bg-gray-200 accent-black cursor-pointer appearance-none border border-black" />
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div />
                          <button onClick={() => moveStep(idx, 0, -1)} className="w-7 h-7 bg-black text-white flex items-center justify-center hover:bg-gray-800 active:invert transition-all"><i className="fa-solid fa-chevron-up text-[10px]"></i></button>
                          <div />
                          <button onClick={() => moveStep(idx, -1, 0)} className="w-7 h-7 bg-black text-white flex items-center justify-center hover:bg-gray-800 active:invert transition-all"><i className="fa-solid fa-chevron-left text-[10px]"></i></button>
                          <button className="w-7 h-7 bg-white border border-black flex items-center justify-center text-[7px] font-black">PAD</button>
                          <button onClick={() => moveStep(idx, 1, 0)} className="w-7 h-7 bg-black text-white flex items-center justify-center hover:bg-gray-800 active:invert transition-all"><i className="fa-solid fa-chevron-right text-[10px]"></i></button>
                          <div />
                          <button onClick={() => moveStep(idx, 0, 1)} className="w-7 h-7 bg-black text-white flex items-center justify-center hover:bg-gray-800 active:invert transition-all"><i className="fa-solid fa-chevron-down text-[10px]"></i></button>
                          <div />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t-2 border-black pt-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase">Direção <span>{s.tailAngle}°</span></label>
                        <input type="range" min="0" max="360" value={s.tailAngle} onChange={(e) => handleUpdateSuggestion(idx, 'tailAngle', parseInt(e.target.value))} className="w-full accent-black appearance-none h-1 bg-gray-200 border border-black" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase">Vetor <span>{s.tailLength}px</span></label>
                        <input type="range" min="10" max="150" value={s.tailLength} onChange={(e) => handleUpdateSuggestion(idx, 'tailLength', parseInt(e.target.value))} className="w-full accent-black appearance-none h-1 bg-gray-200 border border-black" />
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                   onClick={() => setSourceImage(null)}
                   className="w-full py-4 bg-white text-black font-black uppercase text-xs border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-black hover:text-white transition-all"
                >
                  Nova Sessão de Desenho
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Canvas de Visualização Monochrome */}
        <div className="lg:col-span-8">
          <div 
            ref={exportRef}
            className="manga-panel bg-white p-2 min-h-[750px] flex items-center justify-center relative halftone-bg overflow-hidden border-4 border-black group"
          >
            {generation.isAnalyzing && (
              <div className="absolute inset-0 z-50 bg-white/98 flex flex-col items-center justify-center no-print">
                <div className="w-16 h-16 border-8 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-black italic tracking-[0.3em] uppercase">IA EM OPERAÇÃO...</h3>
              </div>
            )}

            {!sourceImage ? (
              <div className="text-center opacity-30 select-none flex flex-col items-center no-print">
                <i className="fa-solid fa-ghost text-[150px] mb-4"></i>
                <p className="text-3xl font-black uppercase italic tracking-tighter">Estúdio Virtual de Letreiramento</p>
              </div>
            ) : (
              <div className="relative inline-block w-full max-w-4xl shadow-2xl bg-black">
                <img src={sourceImage.url} alt="Manga Page" className="w-full h-auto block border-2 border-black grayscale" />
                
                <div className="absolute inset-0 pointer-events-none">
                  {generation.suggestions.map((s, idx) => {
                    const rad = (s.tailAngle - 90) * (Math.PI / 180);
                    const cosA = Math.cos(rad);
                    const sinA = Math.sin(rad);
                    
                    return (
                      <div 
                        key={idx}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 ease-out"
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: '32%', zIndex: 10 + idx }}
                      >
                        <div className="relative bg-white border-[3.5px] border-black rounded-[50%] px-6 py-8 shadow-xl flex items-center justify-center min-h-[80px] pointer-events-auto">
                          <p 
                            className="text-black font-black text-center leading-tight select-none uppercase" 
                            style={{ 
                              fontSize: `${s.fontSize || 16}px`, 
                              letterSpacing: '-0.05em' 
                            }}
                          >
                            {s.suggestedDialogue}
                          </p>
                          
                          <div 
                            className="absolute pointer-events-none"
                            style={{ 
                              left: `calc(50% + ${cosA * 50}%)`,
                              top: `calc(50% + ${sinA * 50}%)`,
                              transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)`,
                              transformOrigin: 'center center'
                            }}
                          >
                            <div className="relative flex flex-col items-center">
                              <div 
                                className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-black"
                                style={{ borderTopWidth: `${s.tailLength}px`, marginTop: '-2px' }}
                              ></div>
                              <div 
                                className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[13px] border-l-transparent border-r-[13px] border-r-transparent border-t-white"
                                style={{ borderTopWidth: `${s.tailLength - 5}px` }}
                              ></div>
                            </div>
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
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
               <div className="flex items-center gap-3 text-[10px] font-black text-black uppercase italic bg-white px-5 py-2 border-2 border-black">
                  <i className="fa-solid fa-keyboard"></i>
                  <span>Ajuste os balões para o encaixe perfeito na arte final.</span>
               </div>
               <button 
                  disabled={isExporting}
                  onClick={handleDownload} 
                  className={`bg-black text-white border-4 border-black px-12 py-3 font-black uppercase text-sm shadow-[6px_6px_0px_#ccc] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {isExporting ? (
                   <>
                     <i className="fa-solid fa-circle-notch animate-spin"></i>
                     Gerando Arquivo...
                   </>
                 ) : (
                   <>
                     <i className="fa-solid fa-download"></i>
                     Baixar Imagem (PNG)
                   </>
                 )}
               </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
