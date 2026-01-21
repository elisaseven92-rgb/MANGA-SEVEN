
import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <header className="bg-black text-white p-4 sticky top-0 z-50 shadow-2xl border-b border-zinc-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white text-black p-1 px-4 font-black text-2xl skew-x-[-12deg]">
              SEVEN
            </div>
            <span className="manga-font text-3xl tracking-tighter uppercase italic text-zinc-400">Mangá</span>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] font-black tracking-[0.3em] uppercase">
            <a href="#" className="text-white hover:text-zinc-400 transition-colors">Workspace</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Library</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Export</a>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {children}
      </main>
      <footer className="bg-black text-zinc-600 p-8 mt-12 border-t border-zinc-900">
        <div className="container mx-auto text-center font-black text-[9px] tracking-widest uppercase">
          <p>© 2024 SEVEN MANGÁ - STUDIO NOIR EDITION - POWERED BY GEMINI AI</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
