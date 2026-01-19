
import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white text-black p-4 sticky top-0 z-50 shadow-md border-b-4 border-black">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1 px-4 font-black text-2xl skew-x-[-12deg] border-2 border-black">
              SEVEN
            </div>
            <span className="manga-font text-3xl tracking-tighter uppercase italic">Mangá</span>
          </div>
          <div className="hidden md:flex gap-8 text-[11px] font-black tracking-[0.2em] uppercase">
            <a href="#" className="border-b-2 border-transparent hover:border-black transition-all">Editor</a>
            <a href="#" className="border-b-2 border-transparent hover:border-black transition-all">Arquivo</a>
            <a href="#" className="border-b-2 border-transparent hover:border-black transition-all">Sobre</a>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {children}
      </main>
      <footer className="bg-black text-white p-8 mt-12 border-t-8 border-gray-900">
        <div className="container mx-auto text-center font-black text-[10px] tracking-widest uppercase">
          <p>© 2024 SEVEN MANGÁ - MONOCHROME INTERFACE - POWERED BY GEMINI AI</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
