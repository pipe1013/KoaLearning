"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { 
  ArrowLeft, PlayCircle, Download, FileText, Video, Info, CheckCircle, Eye 
} from "lucide-react";

interface ArchivoGuardado {
  name: string;
  url: string;
}

interface Capacitacion {
  id: string;
  title: string;
  description: string;
  video_urls: string[];
  pdf_urls: string[];
  archivos: ArchivoGuardado[] | null;
  created_at: string;
}

export default function CapacitacionViewer() {
  const { id } = useParams();
  const router = useRouter();
  
  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Controles de qué estamos viendo
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchCapacitacion = async () => {
      if (!id) return;
      setIsLoading(true);
      const { data, error } = await supabase.from("capacitaciones").select("*").eq("id", id).single();
        
      if (data) {
        setCapacitacion(data);
        // Si hay documentos, abrimos el primero por defecto en la vista previa
        const tieneArchivosNuevos = data.archivos && data.archivos.length > 0;
        const tieneArchivosViejos = data.pdf_urls && data.pdf_urls.length > 0;
        if (tieneArchivosNuevos || tieneArchivosViejos) {
          setActiveDocIndex(0);
        }
      }
      if (error) console.error("Error al cargar:", error);
      setIsLoading(false);
    };

    fetchCapacitacion();
  }, [id]);

  if (isLoading) return <div className="min-h-screen bg-brand-light flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-green"></div></div>;
  if (!capacitacion) return <div className="min-h-screen flex flex-col justify-center items-center"><h2 className="text-2xl font-bold mb-4">Capacitación no encontrada</h2><button onClick={() => router.push("/dashboard")} className="bg-brand-green font-bold py-2 px-6 rounded-lg">Volver</button></div>;

  // Normalizamos los archivos para que siempre tengan el formato nuevo
  let documentosFinales: ArchivoGuardado[] = [];
  if (capacitacion.archivos && capacitacion.archivos.length > 0) {
    documentosFinales = capacitacion.archivos;
  } else if (capacitacion.pdf_urls && capacitacion.pdf_urls.length > 0) {
    documentosFinales = capacitacion.pdf_urls.map((url, i) => ({ name: `Documento adjunto ${i + 1}`, url }));
  }

  // --- HERRAMIENTAS MÁGICAS PARA ARCHIVOS ---
  
  const getFileExtension = (url: string) => url.split('?')[0].split('.').pop() || '';

  // 1. Forzar el nombre correcto de descarga
  const getDownloadUrl = (url: string, customName: string) => {
    const ext = getFileExtension(url);
    const hasExt = customName.toLowerCase().endsWith(`.${ext.toLowerCase()}`);
    const finalName = hasExt ? customName : `${customName}.${ext}`; // Aseguramos que tenga el .pdf, .docx, etc.
    return `${url}?download=${encodeURIComponent(finalName)}`;
  };

  // 2. Crear URL para la Vista Previa (Microsoft para Office, nativo para PDF/TXT)
  const getPreviewUrl = (url: string) => {
    const ext = getFileExtension(url).toLowerCase();
    
    // Archivos nativos del navegador
    if (['pdf', 'txt', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return url; 
    }
    
    // Archivos de Office (Excel, Word) -> Usamos el visor súper estable de Microsoft
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    
    // Plan B (Cualquier otra cosa) -> Google Docs Viewer
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* NAVBAR */}
      <nav className="bg-brand-navy text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="cursor-pointer p-2 hover:bg-white/10 rounded-full transition-colors" title="Volver al Catálogo"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">Portal<span className="text-brand-green">Capacitaciones</span></h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* HEADER */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-brand-navy mb-2">{capacitacion.title}</h2>
          <p className="text-gray-600 max-w-3xl flex items-start gap-2">
            <Info size={20} className="text-brand-green flex-shrink-0 mt-0.5" /> 
            {capacitacion.description || "Sin descripción proporcionada."}
          </p>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA (CONTENIDO PRINCIPAL) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. REPRODUCTOR DE VIDEO */}
            <div className="space-y-4">
              <div className="bg-black rounded-2xl overflow-hidden shadow-lg aspect-video relative group">
                {capacitacion.video_urls && capacitacion.video_urls.length > 0 ? (
                  <video 
                  key={capacitacion.video_urls[activeVideoIndex]} 
                  src={capacitacion.video_urls[activeVideoIndex]} 
                  controls 
                  controlsList="nodownload" 
                  preload="metadata" 
                  playsInline
                  className="w-full h-full object-contain bg-black" 
                />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500"><Video size={48} className="mb-4 opacity-50" /><p>Esta capacitación no contiene videos.</p></div>
                )}
              </div>

              {/* Descargar Video */}
              {capacitacion.video_urls && capacitacion.video_urls.length > 0 && (
                <div className="flex justify-end">
                  <a href={getDownloadUrl(capacitacion.video_urls[activeVideoIndex], `Video_${activeVideoIndex + 1}_${capacitacion.title.replace(/\s+/g, '_')}`)} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-gray-200 text-brand-navy px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 hover:border-brand-green hover:text-brand-green transition-all cursor-pointer font-semibold text-sm">
                    <Download size={16} /> Descargar esta parte
                  </a>
                </div>
              )}
            </div>

            {/* 2. VISTA PREVIA DE DOCUMENTOS */}
            {activeDocIndex !== null && documentosFinales[activeDocIndex] && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                  <h3 className="font-bold text-brand-navy flex items-center gap-2">
                    <Eye size={18} className="text-blue-500" /> Vista Previa: <span className="text-blue-600 truncate max-w-[200px] sm:max-w-md">{documentosFinales[activeDocIndex].name}</span>
                  </h3>
                  <a href={getDownloadUrl(documentosFinales[activeDocIndex].url, documentosFinales[activeDocIndex].name)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-500 hover:text-white transition-colors cursor-pointer font-bold">
                    <Download size={14} /> Descargar
                  </a>
                </div>
                <div className="h-[600px] w-full bg-gray-100 relative">
                  <iframe 
                    src={getPreviewUrl(documentosFinales[activeDocIndex].url)} 
                    className="w-full h-full border-none absolute inset-0" 
                    title={`Vista previa de ${documentosFinales[activeDocIndex].name}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA (PLAYLIST Y ARCHIVOS) */}
          <div className="space-y-6">
            
            {/* MÓDULOS DE VIDEO */}
            {capacitacion.video_urls && capacitacion.video_urls.length > 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="font-bold text-brand-navy flex items-center gap-2"><PlayCircle size={18} className="text-brand-green" /> Módulos del Curso</h3></div>
                <div className="p-2 max-h-60 overflow-y-auto">
                  {capacitacion.video_urls.map((_, index) => (
                    <button key={index} onClick={() => setActiveVideoIndex(index)} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer mb-1 ${activeVideoIndex === index ? "bg-brand-green/10 text-brand-navy font-bold border border-brand-green/20" : "hover:bg-gray-50 text-gray-600 border border-transparent"}`}>
                      {activeVideoIndex === index ? <PlayCircle size={20} className="text-brand-green flex-shrink-0" /> : <CheckCircle size={20} className="text-gray-300 flex-shrink-0" />}
                      <span className="truncate">Parte {index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MATERIAL DE APOYO */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="font-bold text-brand-navy flex items-center gap-2"><FileText size={18} className="text-blue-500" /> Material de Apoyo</h3></div>
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {documentosFinales.length > 0 ? (
                  documentosFinales.map((doc, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${activeDocIndex === index ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}>
                      
                      {/* Botón para Ver Vista Previa */}
                      <div onClick={() => setActiveDocIndex(index)} className="flex items-center gap-3 overflow-hidden pr-2 flex-grow cursor-pointer group">
                        <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${activeDocIndex === index ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-500'}`}>
                          <FileText size={16} />
                        </div>
                        <span className={`text-sm truncate ${activeDocIndex === index ? 'font-bold text-brand-navy' : 'font-medium text-gray-600'}`} title={doc.name}>
                          {doc.name}
                        </span>
                      </div>
                      
                      {/* Botón para Descargar */}
                      <a href={getDownloadUrl(doc.url, doc.name)} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors cursor-pointer flex-shrink-0" title="Descargar archivo">
                        <Download size={16} />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No hay material descargable.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}