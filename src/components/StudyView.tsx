import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image as ImageIcon, ArrowRight, ChevronDown, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IMAGE_MODELS } from '../config/limits';

interface StudyViewProps {
  onExit: () => void;
  onGenerateImage: (prompt: string, model: string) => Promise<void>;
  isGenerating: boolean;
  newImageReady: boolean;
  setNewImageReady: (ready: boolean) => void;
  onViewGallery: () => void;
  selectedImageModel: string;
  onSelectImageModel: (model: string) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({ 
  onExit, 
  onGenerateImage, 
  isGenerating,
  newImageReady,
  setNewImageReady,
  onViewGallery,
  selectedImageModel,
  onSelectImageModel
}) => {
  const [prompt, setPrompt] = useState('');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await onGenerateImage(prompt, selectedImageModel);
  };

  useEffect(() => {
    // Removed auto-hide so the user can click the gallery button
  }, [newImageReady, setNewImageReady]);

  const currentModel = IMAGE_MODELS.find(m => m.id === selectedImageModel) || IMAGE_MODELS[0];

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center p-8">
      <button 
        onClick={onExit} 
        className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Estudio</h1>
        </div>

        <div className="flex flex-col gap-4">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              className="w-full flex items-center justify-between p-4 bg-[#131314] border border-white/10 rounded-2xl text-left hover:bg-white/[0.03] transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Modelo de Generación</span>
                <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{currentModel.name}</span>
                <span className="text-[10px] text-zinc-600 font-medium">{currentModel.description}</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-zinc-600 transition-transform duration-300 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#131314] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col gap-1"
                >
                  {IMAGE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelectImageModel(model.id);
                        setIsModelSelectorOpen(false);
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all flex flex-col gap-0.5 ${
                        selectedImageModel === model.id 
                          ? 'bg-purple-500/10 border border-purple-500/20' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className={`text-sm font-bold ${selectedImageModel === model.id ? 'text-purple-400' : 'text-white'}`}>
                        {model.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">{model.description}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`relative w-full min-h-[160px] rounded-3xl overflow-hidden transition-all duration-500 ${isGenerating || newImageReady ? 'bg-[#0a0a0a] border border-white/5 shadow-2xl' : 'bg-[#131314] border border-white/10'}`}>
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
                >
                  {/* Fluid background */}
                  <motion.div
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 opacity-40"
                    style={{
                      background: 'linear-gradient(-45deg, #3b82f6, #8b5cf6, #ec4899, #10b981)',
                      backgroundSize: '400% 400%',
                      filter: 'blur(20px)'
                    }}
                  />
                  
                  {/* Water ripples / blobs */}
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ rotate: { repeat: Infinity, duration: 8, ease: "linear" }, scale: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
                    className="absolute w-[150%] h-[150%] mix-blend-overlay opacity-50"
                    style={{
                      background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 50%)',
                      borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%'
                    }}
                  />

                  {/* Center Icon */}
                  <motion.div
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="relative z-30 flex flex-col items-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white/70 tracking-[0.2em] uppercase">Sintetizando</span>
                  </motion.div>
                </motion.div>
              ) : newImageReady ? (
                <motion.div 
                  key="ready"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a]"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-white tracking-wide">Creación completada</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Imagen lista en galería</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setNewImageReady(false);
                          onViewGallery();
                        }}
                        className="group relative px-6 py-2 bg-white text-black rounded-full font-medium text-sm hover:scale-105 transition-all flex items-center gap-2"
                      >
                        <span>Ver en Galería</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                      
                      <button 
                        onClick={() => {
                          setNewImageReady(false);
                          setPrompt('');
                        }}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Generar nueva imagen"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="¿Qué quieres generar hoy? (ej. 'un atardecer futurista en Marte')"
                    className="flex-1 w-full bg-transparent p-6 text-white placeholder-zinc-600 focus:outline-none resize-none"
                  />
                  <div className="absolute bottom-4 right-4">
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim()}
                      className="px-6 py-2.5 bg-white text-black rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50"
                    >
                      Generar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
