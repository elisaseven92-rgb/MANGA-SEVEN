
import React, { useState, useRef } from 'react';
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
          console.error(err);
          // Mesmo com erro na IA, permitimos que o usuário use as ferramentas manuais
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
      tailLength: 60,
      fontSize: 18,
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

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel lateral de ferramentas */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="manga-panel bg-white p-5 space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-2">
              <h2 className="text-xl font-black uppercase flex items-center gap-2 italic">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Ferramentas
              </h2>
              {sourceImage && (
                <button 
                  onClick={addManualBubble}
                  className="bg-black text-white text-[10px] font-black px-3 py-1 uppercase hover:bg-gray-800 transition-colors"
                >
                  + Add Balão
                </button>
              )}
            </div>
            
            {!sourceImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-black p-12 text-center cursor-pointer hover:bg-black hover:text-white transition-all rounded-xl group"
              >
                <i className="fa-solid fa-cloud-arrow-up text-5xl mb-4 group-hover:scale-110 transition-transform"></i>
                <p className="font-black text-sm uppercase">Abrir Manuscrito (PNG/JPG)</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                {generation.suggestions.length === 0 && !generation.isAnalyzing && (
                  <div className="text-center py-8 border-2 border-black border-dashed">
                    <p className="text-[10px] font-black uppercase text-gray-400">Nenhum balão adicionado ainda.</p>
                    <button onClick={addManualBubble} className="mt-2 text-xs font-black underline hover:text-blue-600 transition-colors">ADICIONAR AGORA</button>
                  </div>
                )}
                
                {generation.suggestions.map((s, idx) => (
                  <div key={idx} className="bg-white border-2 border-black p-4 space-y-4 shadow-[4px_4px_0px_#000] relative animate-in fade-in slide-in-from-right-4 duration-300">
                    <button onClick={() => removeBubble(idx)} className="absolute top-2 right-2 text-black hover:text-red-600 transition-colors">
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 italic">CAMADA #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                           <i className="fa-solid fa-text-height text-[10px]"></i>
                           <input 
                              type="range" 
                              min="10" max="40" 
                              value={s.fontSize || 16} 
                              onChange={(e) => handleUpdateSuggestion(idx, 'fontSize', parseInt(e.target.value))}
                              className="w-20 accent-black h-1 bg-gray-200 appearance-none border border-black"
                           />
                        </div>
                      </div>
                      <textarea
                        value={s.suggestedDialogue}
                        onChange={(e) => handleUpdateSuggestion(idx, 'suggestedDialogue', e.target.value)}
                        className="w-full text-sm font-bold border-2 border-black p-2 h-20 resize-none outline-none focus:bg-yellow-50 leading-tight"
                        placeholder="Insira o diálogo aqui..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase block">Posição X ({s.position.x}%)</label>
                        <input type="range" min="0" max="100" value={s.position.x} onChange={(e) => updatePosition(idx, parseInt(e.target.value), s.position.y)} className="w-full h-1 bg-gray-200 accent-black appearance-none border border-black" />
                        <label className="text-[9px] font-black uppercase block">Posição Y ({s.position.y}%)</label>
                        <input type="range" min="0" max="100" value={s.position.y} onChange={(e) => updatePosition(idx, s.position.x, parseInt(e.target.value))} className="w-full h-1 bg-gray-200 accent-black appearance-none border border-black" />
                      </div>
                      <div className="grid grid-cols-3 gap-1 h-fit">
                        <div />
                        <button onClick={() => moveStep(idx, 0, -2)} className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-all"><i className="fa-solid fa-caret-up"></i></button>
                        <div />
                        <button onClick={() => moveStep(idx, -2, 0)} className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-all"><i className="fa-solid fa-caret-left"></i></button>
                        <div className="w-8 h-8 flex items-center justify-center text-[8px] font-black border border-black">MOVE</div>
                        <button onClick={() => moveStep(idx, 2, 0)} className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-all"><i className="fa-solid fa-caret-right"></i></button>
                        <div />
                        <button onClick={() => moveStep(idx, 0, 2)} className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-all"><i className="fa-solid fa-caret-down"></i></button>
                        <div />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t-2 border-black pt-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase">Ângulo do Rabicho: {s.tailAngle}°</label>
                        <input type="range" min="0" max="360" value={s.tailAngle} onChange={(e) => handleUpdateSuggestion(idx, 'tailAngle', parseInt(e.target.value))} className="w-full accent-black appearance-none h-1 bg-gray-200 border border-black" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase">Comprimento: {s.tailLength}px</label>
                        <input type="range" min="0" max="200" value={s.tailLength} onChange={(e) => handleUpdateSuggestion(idx, 'tailLength', parseInt(e.target.value))} className="w-full accent-black appearance-none h-1 bg-gray-200 border border-black" />
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                   onClick={() => setSourceImage(null)}
                   className="w-full py-4 bg-gray-100 text-black font-black uppercase text-[10px] border-2 border-black hover:bg-black hover:text-white transition-all tracking-widest"
                >
                  Nova Sessão de Desenho
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Canvas de Visualização */}
        <div className="lg:col-span-8">
          <div 
            ref={exportRef}
            className="manga-panel bg-white p-4 min-h-[800px] flex items-center justify-center relative halftone-bg overflow-hidden border-4 border-black group"
          >
            {generation.isAnalyzing && (
              <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center no-print">
                <div className="w-20 h-20 border-8 border-gray-100 border-t-black rounded-full animate-spin mb-6"></div>
                <h3 className="text-2xl font-black italic tracking-[0.5em] uppercase animate-pulse">Analizando Arte...</h3>
              </div>
            )}

            {!sourceImage ? (
              <div className="text-center opacity-20 select-none flex flex-col items-center no-print">
                <i className="fa-solid fa-palette text-[120px] mb-6"></i>
                <p className="text-4xl font-black uppercase italic tracking-tighter">Bancada de Edição P&B</p>
                <p className="mt-4 font-bold text-sm tracking-widest">CARREGUE UMA PÁGINA PARA COMEÇAR</p>
              </div>
            ) : (
              <div className="relative inline-block w-full max-w-4xl bg-white border-2 border-black">
                <img src={sourceImage.url} alt="Manga Page" className="w-full h-auto block grayscale contrast-125" />
                
                <div className="absolute inset-0 pointer-events-none">
                  {generation.suggestions.map((s, idx) => {
                    const rad = (s.tailAngle - 90) * (Math.PI / 180);
                    const cosA = Math.cos(rad);
                    const sinA = Math.sin(rad);
                    
                    return (
                      <div 
                        key={idx}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${s.position.x}%`, top: `${s.position.y}%`, width: '35%', zIndex: 100 + idx }}
                      >
                        <div className="relative bg-white border-[4px] border-black rounded-[50%] px-8 py-10 shadow-2xl flex items-center justify-center min-h-[100px] pointer-events-auto">
                          <p 
                            className="text-black font-black text-center leading-tight select-none uppercase tracking-tighter" 
                            style={{ 
                              fontSize: `${s.fontSize || 16}px`,
                              fontFamily: 'Noto Sans JP, sans-serif'
                            }}
                          >
                            {s.suggestedDialogue}
                          </p>
                          
                          {/* Rabicho do Balão */}
                          {s.tailLength > 0 && (
                            <div 
                              className="absolute pointer-events-none"
                              style={{ 
                                left: `calc(50% + ${cosA * 48}%)`,
                                top: `calc(50% + ${sinA * 48}%)`,
                                transform: `translate(-50%, -50%) rotate(${s.tailAngle}deg)`,
                                transformOrigin: 'center center'
                              }}
                            >
                              <div className="relative flex flex-col items-center">
                                <div 
                                  className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-black"
                                  style={{ borderTopWidth: `${s.tailLength}px`, marginTop: '-3px' }}
                                ></div>
                                <div 
                                  className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-white"
                                  style={{ borderTopWidth: `${s.tailLength - 6}px` }}
                                ></div>
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
               <div className="flex items-center gap-4 text-[11px] font-black text-black uppercase italic bg-white px-6 py-3 border-4 border-black shadow-[4px_4px_0px_#000]">
                  <i className="fa-solid fa-circle-info text-lg"></i>
                  <span>DICA: Use os controles laterais para posicionar o texto nos espaços vazios.</span>
               </div>
               <button 
                  disabled={isExporting}
                  onClick={handleDownload} 
                  className={`bg-black text-white border-4 border-black px-14 py-4 font-black uppercase text-base shadow-[8px_8px_0px_#ccc] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-3 ${isExporting ? 'opacity-50' : ''}`}
               >
                 {isExporting ? (
                   <><i className="fa-solid fa-spinner animate-spin"></i> EXPORTANDO...</>
                 ) : (
                   <><i className="fa-solid fa-floppy-disk"></i> FINALIZAR ARTE (PNG)</>
                 )}
               </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
