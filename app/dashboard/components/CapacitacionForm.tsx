"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, FileText, Video } from "lucide-react"; 
import { supabase } from "../../../src/lib/supabase";

interface Carpeta { id: string; name: string; }
interface ArchivoGuardado { name: string; url: string; }
interface Capacitacion { id: string; title: string; description: string; video_urls: string[]; pdf_urls: string[]; archivos: ArchivoGuardado[] | null; carpeta_id: string | null; }

export default function CapacitacionForm({ 
  isOpen, onClose, onSuccess, carpetas, initialFolderId, capToEdit 
}: { 
  isOpen: boolean; onClose: () => void; onSuccess: () => void; carpetas: Carpeta[]; initialFolderId: string | null; capToEdit: Capacitacion | null;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");

  // Estados de Videos
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [videosToDelete, setVideosToDelete] = useState<string[]>([]); // NUEVO: Rastrea videos borrados al editar

  // Estados de Archivos Multi-formato
  const [newDocs, setNewDocs] = useState<{file: File, name: string}[]>([]);
  const [existingDocs, setExistingDocs] = useState<ArchivoGuardado[]>([]);
  const [docsToDelete, setDocsToDelete] = useState<string[]>([]); // NUEVO: Rastrea documentos borrados al editar

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (capToEdit) {
          setTitle(capToEdit.title); 
          setDescription(capToEdit.description || "");
          setExistingVideos(capToEdit.video_urls || []); 
          setSelectedFolderId(capToEdit.carpeta_id || "");
          
          if (capToEdit.archivos && capToEdit.archivos.length > 0) {
            setExistingDocs(capToEdit.archivos);
          } else if (capToEdit.pdf_urls && capToEdit.pdf_urls.length > 0) {
            setExistingDocs(capToEdit.pdf_urls.map((url, i) => ({ url, name: `Documento adjunto ${i+1}` })));
          } else {
            setExistingDocs([]);
          }
        } else {
          setTitle(""); setDescription(""); setExistingVideos([]); setExistingDocs([]); setSelectedFolderId(initialFolderId || "");
        }
        // Reseteamos las listas de borrado cada vez que se abre el modal
        setVideoFiles([]); setNewDocs([]); setVideosToDelete([]); setDocsToDelete([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [capToEdit, initialFolderId, isOpen]);

  if (!isOpen) return null;

  const handleAddDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const addedFiles = Array.from(e.target.files).map(f => {
        const nameWithoutExt = f.name.split('.').slice(0, -1).join('.') || f.name;
        return { file: f, name: nameWithoutExt };
      });
      setNewDocs(prev => [...prev, ...addedFiles]);
    }
    setTimeout(() => { e.target.value = ''; }, 1);
  };

  // Función mágica para limpiar URLs y sacar la ruta exacta del archivo
  const extractPath = (url: string) => {
    try {
      const parts = url.split('/capacitaciones-archivos/');
      return parts.length > 1 ? decodeURIComponent(parts[1].split('?')[0]) : null;
    } catch { return null; }
  };

  const uploadFiles = async () => {
    const vUrls = [];
    const uploadedDocs: ArchivoGuardado[] = [];
    
    for (const f of videoFiles) {
      const name = `videos/${Date.now()}_${Math.random().toString(36).substring(7)}.${f.name.split('.').pop()}`;
      await supabase.storage.from("capacitaciones-archivos").upload(name, f);
      vUrls.push(supabase.storage.from("capacitaciones-archivos").getPublicUrl(name).data.publicUrl);
    }
    
    for (const doc of newDocs) {
      const ext = doc.file.name.split('.').pop();
      const nameInStorage = `documentos/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      await supabase.storage.from("capacitaciones-archivos").upload(nameInStorage, doc.file);
      const publicUrl = supabase.storage.from("capacitaciones-archivos").getPublicUrl(nameInStorage).data.publicUrl;
      uploadedDocs.push({ name: doc.name, url: publicUrl });
    }
    return { vUrls, uploadedDocs };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (existingVideos.length + videoFiles.length === 0)) return toast.error("Se requiere título y al menos 1 video.");
    setIsUploading(true);
    
    const promise = async () => {
      // 1. Borramos físicamente de Supabase los archivos que el usuario eliminó en esta edición
      const pathsToRemove = [...videosToDelete, ...docsToDelete].map(extractPath).filter(Boolean) as string[];
      if (pathsToRemove.length > 0) {
        await supabase.storage.from("capacitaciones-archivos").remove(pathsToRemove);
      }

      // 2. Subimos los nuevos
      const { vUrls, uploadedDocs } = await uploadFiles();
      const folder = selectedFolderId === "" ? null : selectedFolderId;
      const archivosFinales = [...existingDocs, ...uploadedDocs];

      // 3. Actualizamos la base de datos
      if (capToEdit) {
        await supabase.from("capacitaciones").update({ 
          title, description, carpeta_id: folder,
          video_urls: [...existingVideos, ...vUrls], 
          archivos: archivosFinales 
        }).eq("id", capToEdit.id);
      } else {
        await supabase.from("capacitaciones").insert([{ 
          title, description, carpeta_id: folder,
          video_urls: vUrls, archivos: archivosFinales 
        }]);
      }
      onSuccess(); onClose(); return capToEdit ? "¡Actualizada y archivos limpiados!" : "¡Creada!";
    };
    
    toast.promise(promise(), { loading: "Guardando...", success: (d) => d, error: "Error", finally: () => setIsUploading(false) });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border-t-4 border-brand-green max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-brand-navy">{capToEdit ? "Editar" : "Nueva"} Capacitación</h3>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-red-500 transition-all"><X size={24}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="text" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-green" disabled={isUploading} required/>
          <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-white cursor-pointer focus:ring-2 focus:ring-brand-green" disabled={isUploading}>
            <option value="">Raíz (Inicio)</option>{carpetas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none h-20 focus:ring-2 focus:ring-brand-green" disabled={isUploading}/>
          
          <div className="grid grid-cols-2 gap-4">
            {/* --- ZONA VIDEOS --- */}
            <div>
              <div className="border-2 border-dashed p-3 text-center relative h-24 flex flex-col justify-center cursor-pointer group hover:border-brand-green rounded-lg">
                <input type="file" accept="video/*" multiple onChange={(e) => { if(e.target.files) setVideoFiles(prev => [...prev, ...Array.from(e.target.files!)]); setTimeout(()=>e.target.value='',1);}} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading}/>
                <Video className="mx-auto mb-1 text-gray-400" size={20} /><span className="text-xs font-semibold underline text-brand-navy">Añadir Videos</span>
              </div>
              <div className="mt-2 space-y-1">
                {/* Videos Existentes */}
                {existingVideos.map((url, i) => (
                  <div key={`ev-${i}`} className="flex justify-between items-center text-xs bg-blue-50 p-1.5 rounded border border-blue-100">
                    <span className="font-medium">Video {i+1}</span>
                    <button type="button" onClick={() => { setVideosToDelete(p => [...p, url]); setExistingVideos(p => p.filter((_, idx) => idx !== i)); }} className="text-red-500 cursor-pointer hover:scale-110"><X size={14}/></button>
                  </div>
                ))}
                {/* Nuevos Videos */}
                {videoFiles.map((f, i) => (
                  <div key={`nv-${i}`} className="flex justify-between items-center text-xs bg-green-50 p-1.5 rounded border border-green-100">
                    <span className="truncate w-20 font-medium text-green-800">{f.name}</span>
                    <button type="button" onClick={()=>setVideoFiles(p=>p.filter((_,idx)=>idx!==i))} className="text-red-500 cursor-pointer hover:scale-110"><X size={14}/></button>
                  </div>
                ))}
              </div>
            </div>

             {/* --- ZONA ARCHIVOS MULTI-FORMATO --- */}
             <div>
              <div className="border-2 border-dashed p-3 text-center relative h-24 flex flex-col justify-center cursor-pointer group hover:border-brand-green rounded-lg bg-gray-50">
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" multiple onChange={handleAddDocs} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading}/>
                <FileText className="mx-auto mb-1 text-gray-400" size={20} />
                <span className="text-xs font-semibold underline text-brand-navy">Añadir Archivos</span>
              </div>
              
              <div className="mt-2 space-y-2">
                {/* Documentos Existentes */}
                {existingDocs.map((doc, i) => (
                  <div key={`ed-${i}`} className="flex flex-col gap-1 text-xs bg-blue-50 p-2 rounded border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-800">Guardado:</span>
                      <button type="button" onClick={() => { setDocsToDelete(p => [...p, doc.url]); setExistingDocs(p => p.filter((_, idx) => idx !== i)); }} className="text-red-500 cursor-pointer hover:scale-110"><X size={14}/></button>
                    </div>
                    <input type="text" value={doc.name} onChange={(e) => { const updated = [...existingDocs]; updated[i].name = e.target.value; setExistingDocs(updated); }} className="w-full px-2 py-1 border border-blue-200 rounded outline-none" disabled={isUploading} />
                  </div>
                ))}

                {/* Documentos Nuevos */}
                {newDocs.map((doc, i) => (
                  <div key={`nd-${i}`} className="flex flex-col gap-1 text-xs bg-green-50 p-2 rounded border border-green-100">
                     <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-800 truncate w-24">{doc.file.name}</span>
                      <button type="button" onClick={()=>setNewDocs(p=>p.filter((_,idx)=>idx!==i))} className="text-red-500 cursor-pointer hover:scale-110"><X size={14}/></button>
                    </div>
                    <input type="text" value={doc.name} onChange={(e) => { const updated = [...newDocs]; updated[i].name = e.target.value; setNewDocs(updated); }} className="w-full px-2 py-1 border border-green-200 rounded outline-none" disabled={isUploading} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" disabled={isUploading} className="w-full bg-brand-navy text-white font-bold py-3 rounded-lg cursor-pointer hover:bg-opacity-90 active:scale-95 transition-all">{isUploading ? "Guardando..." : "Guardar Capacitación"}</button>
        </form>
      </div>
    </div>
  );
}