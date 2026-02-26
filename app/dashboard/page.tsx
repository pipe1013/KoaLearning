"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";
import { toast } from "sonner";
import { 
  UploadCloud, PlayCircle, Clock, 
  Trash2, AlertTriangle, Edit, Users, Search,
  FolderOpen, ChevronRight, ArrowLeft, FolderPlus, Video, FileText, X
} from "lucide-react";

// Importamos nuestros nuevos componentes modulares
import UserManagement from "./components/UserManagement";
import CapacitacionForm from "./components/CapacitacionForm";

interface Carpeta { id: string; name: string; description: string; created_at: string; }
interface Capacitacion { 
  id: string; 
  title: string; 
  description: string; 
  video_urls: string[]; 
  pdf_urls: string[]; 
  carpeta_id: string | null; 
  archivos: { name: string, url: string }[] | null; // <-- ESTA LÍNEA ES NUEVA
  created_at: string; 
}

export default function DashboardPage() {
  const router = useRouter();
  
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Estados de Modales Extraídos
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [isCapacitacionFormOpen, setIsCapacitacionFormOpen] = useState(false);
  const [capToEdit, setCapToEdit] = useState<Capacitacion | null>(null);

  // Estados de Carpetas
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);

  // Estado Eliminar Capacitación
  const [capacitacionToDelete, setCapacitacionToDelete] = useState<string | null>(null);

  // 1. PRIMERO declaramos la función
  const fetchUserDataAndContent = async () => {
    setIsLoadingData(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile) setUserRole(profile.role);
    }
    const [carpetasRes, capRes] = await Promise.all([
      supabase.from("carpetas").select("*").order("created_at", { ascending: false }),
      supabase.from("capacitaciones").select("*").order("created_at", { ascending: false })
    ]);
    if (carpetasRes.data) setCarpetas(carpetasRes.data);
    if (capRes.data) setCapacitaciones(capRes.data);
    setIsLoadingData(false);
  };

  // 2. DESPUÉS usamos el useEffect con el timer para evitar el error del linter
  useEffect(() => { 
    const timer = setTimeout(() => {
      fetchUserDataAndContent(); 
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const canManageContent = userRole === 'admin' || userRole === 'superadmin';
  const canManageUsers = userRole === 'superadmin';

  const currentFolder = carpetas.find(c => c.id === currentFolderId);
  const filteredCarpetas = carpetas.filter(c => (currentFolderId === null) && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCapacitaciones = capacitaciones.filter(cap => {
    if (searchTerm !== "") return cap.title.toLowerCase().includes(searchTerm.toLowerCase()) || (cap.description && cap.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return cap.carpeta_id === currentFolderId;
  });

  // Funciones de Carpeta
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingFolder(true);
    const promise = async () => {
      await supabase.from("carpetas").insert([{ name: folderName, description: folderDescription }]);
      setFolderName(""); setFolderDescription(""); setIsFolderModalOpen(false); fetchUserDataAndContent(); return "¡Carpeta creada!";
    };
    toast.promise(promise(), { loading: "Creando...", success: (d) => d, error: "Error", finally: () => setIsCreatingFolder(false) });
  };

  const executeDeleteFolder = async () => {
    if (!folderToDelete) return;
    const promise = async () => {
      await supabase.from("carpetas").delete().eq("id", folderToDelete.id);
      fetchUserDataAndContent(); return "Carpeta eliminada";
    };
    toast.promise(promise(), { loading: "Eliminando...", success: (d) => d, error: "Error" });
    setFolderToDelete(null);
    setIsDeleteFolderModalOpen(false);
  };

  // Función Eliminar Capacitación
  // Función Eliminar Capacitación (Mejorada para borrar archivos físicos)
  // Función Eliminar Capacitación (Mejorada con decodificación de rutas)
  const executeDeleteCapacitacion = async () => {
    if (!capacitacionToDelete) return;

    const promise = async () => {
      // 1. Buscamos el curso para saber qué archivos físicos tiene
      const { data: cap } = await supabase
        .from("capacitaciones")
        .select("video_urls, archivos, pdf_urls")
        .eq("id", capacitacionToDelete)
        .single();

      if (cap) {
        // Función mágica para extraer la ruta exacta decodificando la URL
        const extractPath = (url: string) => {
          try {
            const parts = url.split('/capacitaciones-archivos/');
            return parts.length > 1 ? decodeURIComponent(parts[1].split('?')[0]) : null;
          } catch { return null; }
        };

        const rutasParaBorrar: string[] = [];

        if (cap.video_urls) cap.video_urls.forEach((url: string) => {
          const path = extractPath(url);
          if (path) rutasParaBorrar.push(path);
        });

        if (cap.archivos) cap.archivos.forEach((doc: { url: string }) => {
          const path = extractPath(doc.url);
          if (path) rutasParaBorrar.push(path);
        });

        if (cap.pdf_urls) cap.pdf_urls.forEach((url: string) => {
          const path = extractPath(url);
          if (path) rutasParaBorrar.push(path);
        });

        // 2. Le pedimos a Supabase que destruya físicamente los archivos
        if (rutasParaBorrar.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("capacitaciones-archivos")
            .remove(rutasParaBorrar);
            
          if (storageError) console.error("Error borrando archivos físicos:", storageError);
        }
      }

      // 3. Borramos el texto de la base de datos
      const { error } = await supabase.from("capacitaciones").delete().eq("id", capacitacionToDelete);
      if (error) throw new Error(error.message);
      
      fetchUserDataAndContent(); 
      return "Capacitación y archivos eliminados";
    };

    toast.promise(promise(), { loading: "Eliminando...", success: (d) => d, error: (err) => err.message });
    setCapacitacionToDelete(null);
  };
  const formatearFecha = (fechaString: string) => new Date(fechaString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-brand-light">
      {/* NAVBAR */}
      <nav className="bg-brand-navy text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Portal<span className="text-brand-green">Capacitaciones</span></h1>
          <div className="flex items-center gap-4">
            {userRole === 'superadmin' && <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">Super Admin</span>}
            {userRole === 'admin' && <span className="bg-brand-green text-brand-navy text-xs font-bold px-2 py-1 rounded">Administrador</span>}
            <button onClick={handleLogout} className="text-sm hover:text-brand-green transition-colors cursor-pointer">Cerrar Sesión</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {/* HEADER Y BOTONES */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-brand-navy">Catálogo</h2>
            <div className="flex items-center text-gray-500 mt-2 text-sm font-medium">
              <span onClick={() => setCurrentFolderId(null)} className={`cursor-pointer transition-colors ${currentFolderId === null ? 'text-brand-green font-bold' : 'hover:text-brand-navy'}`}>Inicio</span>
              {currentFolderId && (<><ChevronRight size={16} className="mx-1" /><span className="text-brand-green font-bold flex items-center gap-1"><FolderOpen size={14} /> {currentFolder?.name}</span></>)}
            </div>
          </div>
          
          <div className="flex gap-3">
            {canManageUsers && (
              <button onClick={() => setIsManageUsersOpen(true)} className="cursor-pointer bg-white border-2 border-brand-navy text-brand-navy font-bold py-2 px-4 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><Users size={18} /><span>Usuarios</span></button>
            )}
            {canManageContent && currentFolderId === null && (
               <button onClick={() => setIsFolderModalOpen(true)} className="cursor-pointer bg-blue-100 text-blue-800 font-bold py-2 px-4 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-blue-200"><FolderPlus size={18} /><span>Nueva Carpeta</span></button>
            )}
            {canManageContent && (
              <button onClick={() => { setCapToEdit(null); setIsCapacitacionFormOpen(true); }} className="cursor-pointer bg-brand-green text-brand-navy font-bold py-2 px-4 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><UploadCloud size={18} /><span>Subir Capacitación</span></button>
            )}
          </div>
        </div>

        <div className="relative w-full md:w-96 mb-8 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
          <input type="text" className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green outline-none shadow-sm cursor-text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {currentFolderId !== null && (
          <button onClick={() => setCurrentFolderId(null)} className="mb-6 flex items-center gap-2 text-brand-navy bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 hover:scale-105 transition-all cursor-pointer font-semibold"><ArrowLeft size={18} /> Volver</button>
        )}

        {isLoadingData ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-green"></div></div>
        ) : (
          <>
            {/* CARPETAS */}
            {filteredCarpetas.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-bold text-gray-600 mb-4 uppercase text-sm">Carpetas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredCarpetas.map(carpeta => (
                    <div key={carpeta.id} onClick={() => setCurrentFolderId(carpeta.id)} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer flex items-center gap-3 group relative hover:shadow-md transition-all">
                      {canManageContent && (
                        <button onClick={(e) => { e.stopPropagation(); setFolderToDelete({id: carpeta.id, name: carpeta.name}); setIsDeleteFolderModalOpen(true); }} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all cursor-pointer"><Trash2 size={14} /></button>
                      )}
                      <div className="bg-blue-50 p-3 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><FolderOpen size={24} /></div>
                      <div className="overflow-hidden"><h4 className="font-bold truncate">{carpeta.name}</h4><p className="text-xs text-gray-400 truncate">{carpeta.description}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAPACITACIONES */}
            <h3 className="text-lg font-bold text-gray-600 mb-4 uppercase text-sm">{currentFolderId ? `En ${currentFolder?.name}` : 'Capacitaciones'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCapacitaciones.map((cap) => (
                <div key={cap.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col relative cursor-pointer" onClick={() => router.push(`/capacitacion/${cap.id}`)}>
                  {canManageContent && (
                    <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setCapToEdit(cap); setIsCapacitacionFormOpen(true); }} className="cursor-pointer bg-blue-500 text-white p-2 rounded-full hover:scale-110"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setCapacitacionToDelete(cap.id); }} className="cursor-pointer bg-red-500 text-white p-2 rounded-full hover:scale-110"><Trash2 size={16} /></button>
                    </div>
                  )}
                  <div className="h-40 bg-brand-navy relative flex items-center justify-center group-hover:bg-opacity-90 transition-all"><PlayCircle size={48} className="text-white opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-transform" /></div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-brand-navy line-clamp-1">{cap.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 mb-4 flex-grow">{cap.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-3">
                      <span className="flex items-center gap-1"><Clock size={14} /> {formatearFecha(cap.created_at)}</span>
                      <span className="flex items-center gap-1"><Video size={12} /> {cap.video_urls?.length || 0} | <FileText size={12} /> {cap.archivos?.length || cap.pdf_urls?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCapacitaciones.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500">
                  No hay capacitaciones para mostrar.
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* COMPONENTES MODULARES */}
      <UserManagement isOpen={isManageUsersOpen} onClose={() => setIsManageUsersOpen(false)} />
      
      <CapacitacionForm 
        isOpen={isCapacitacionFormOpen} 
        onClose={() => setIsCapacitacionFormOpen(false)} 
        onSuccess={fetchUserDataAndContent}
        carpetas={carpetas} 
        initialFolderId={currentFolderId} 
        capToEdit={capToEdit} 
      />

      {/* MODALES PEQUEÑOS DE CONFIRMACIÓN */}
      {isDeleteFolderModalOpen && folderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm">
            <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-bold">¿Borrar carpeta?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setFolderToDelete(null); setIsDeleteFolderModalOpen(false); }} className="cursor-pointer flex-1 bg-gray-100 py-2 rounded-lg font-bold hover:bg-gray-200">Cancelar</button>
              <button onClick={executeDeleteFolder} className="cursor-pointer flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600">Sí</button>
            </div>
          </div>
        </div>
      )}

      {capacitacionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm">
            <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-bold">¿Borrar capacitación?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setCapacitacionToDelete(null)} className="cursor-pointer flex-1 bg-gray-100 py-2 rounded-lg font-bold hover:bg-gray-200">Cancelar</button>
              <button onClick={executeDeleteCapacitacion} className="cursor-pointer flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600">Sí</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Nueva Carpeta */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border-t-4 border-blue-500">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold">Nueva Carpeta</h3>
              <button type="button" onClick={() => setIsFolderModalOpen(false)} className="cursor-pointer hover:text-red-500"><X /></button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input type="text" placeholder="Nombre" value={folderName} onChange={(e) => setFolderName(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 cursor-text" required/>
              <input type="text" placeholder="Descripción" value={folderDescription} onChange={(e) => setFolderDescription(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 cursor-text"/>
              <button type="submit" disabled={isCreatingFolder} className="cursor-pointer w-full bg-blue-500 text-white p-2 rounded font-bold hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:scale-100">{isCreatingFolder ? "Creando..." : "Crear"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}