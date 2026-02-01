"use client";

import { useState } from "react";

interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
}

const initialArtwork: GalleryItem[] = [
  //{ id: "1", imageUrl: "https://i.imgur.com/placeholder1.jpg", title: "Bond Sketch" },
  //{ id: "1", imageUrl: "https://drive.google.com/uc?export=view&id=1C_kkvCLFNR9drlsyNs_y8WRGY_N_87g7", title: "Resume" },
  { id: "2", imageUrl: "https://i.imgur.com/KM42G22.jpeg", title: "Chromakopia" },
  //{ id: "3", imageUrl: "https://i.imgur.com/placeholder3.jpg", title: "Verso" },
  //{ id: "4", imageUrl: "https://i.imgur.com/placeholder4.jpg", title: "WhatsApp Icon" },
  //{ id: "5", imageUrl: "https://i.imgur.com/placeholder5.jpg", title: "Dragon Fantasy" },
  //{ id: "6", imageUrl: "https://i.imgur.com/placeholder6.jpg", title: "Portrait Study" },
  { id: "7", imageUrl: "https://i.imgur.com/OsiQAhZ.jpeg", title: "Pan'Din'Monium Part 1" },
  { id: "8", imageUrl: "https://i.imgur.com/DI7NsZv.jpeg", title: "Pan'Din'Monium Part 2" },
  { id: "9", imageUrl: "https://i.imgur.com/sVMSKpf.jpeg", title: "Pan'Din'Monium Part 3" },
  { id: "10", imageUrl: "https://i.imgur.com/L7nc7nc.jpeg", title: "Pan'Din'Monium Part 4" },
  { id: "11", imageUrl: "https://i.imgur.com/egkukMr.jpeg", title: "...And Justice For All" },
  { id: "12", imageUrl: "https://i.imgur.com/chBfZDT.jpeg", title: "Seaweed" },
];

export default function KauanLimaPage() {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient">
              KAUAN LIMA
            </h1>
            <nav className="flex gap-8 text-sm uppercase tracking-wide text-gray-300">
              <a href="#gallery" className="hover:text-purple-400 transition-all duration-300 hover:scale-110">Gallery</a>
              <a href="#about" className="hover:text-purple-400 transition-all duration-300 hover:scale-110">About</a>
              <a href="#contact" className="hover:text-purple-400 transition-all duration-300 hover:scale-110">Contact</a>
            </nav>
          </div>
          {/* Social Links */}
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-400">
            <a 
              href="https://www.linkedin.com/in/thekauanlima/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-purple-400 transition-all duration-300 hover:scale-110"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn
            </a>
            <a 
              href="https://github.com/TheKauanLima" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-purple-400 transition-all duration-300 hover:scale-110"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <a 
              href="/resume.pdf" 
              download
              className="flex items-center gap-2 hover:text-purple-400 transition-all duration-300 hover:scale-110"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Resume
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-6 py-16">
        {/* Gallery Grid */}
        <div id="gallery" className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {initialArtwork.map((item, index) => (
            <div 
              key={item.id} 
              className="group relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-lg blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
              
              {/* Image container */}
              <div 
                className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-800 ring-1 ring-gray-700/50 cursor-pointer"
                onClick={() => setSelectedImage(item)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              {/* Title */}
              <h3 className="relative z-10 mt-4 text-center text-lg font-light uppercase tracking-wide text-gray-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                {item.title}
              </h3>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-20 border-t border-gray-800/50 bg-gray-950/80 backdrop-blur-sm py-8 text-center text-sm text-gray-400">
        <p>© 2026 Kauan Lima Portfolio. All rights reserved.</p>
      </footer>

      {/* Image Modal/Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl font-light transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <h3 className="mt-6 text-2xl font-light uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {selectedImage.title}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}
