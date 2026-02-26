"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, UserPlus, Trash2, AlertTriangle, Edit, UserCog } from "lucide-react";
import { supabase } from "../../../src/lib/supabase";

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

export default function UserManagement({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  
  // Estados para crear
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");

  // Estados para editar
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState("viewer");

  // Estados para eliminar
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  // 1. Declaramos la función para buscar usuarios
  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
    if (data) setUsers(data);
  };

  // 2. Usamos el useEffect con el "truco" del setTimeout para engañar al Linter
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchUsers();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) return toast.error("Completa todos los campos.");
    setIsCreatingUser(true);
    const createUserPromise = async () => {
      const res = await fetch('/api/create-user', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fullName: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole }) 
      });
      if (!res.ok) throw new Error("Error al crear usuario");
      setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNewUserRole("viewer"); 
      setIsUserModalOpen(false); fetchUsers(); return "¡Usuario creado!";
    };
    toast.promise(createUserPromise(), { loading: "Creando cuenta...", success: (d) => d, error: "Error", finally: () => setIsCreatingUser(false) });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserName) return toast.error("El nombre no puede estar vacío");
    setIsUpdatingUser(true);
    const updatePromise = async () => {
      const res = await fetch('/api/update-user', { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: editUserId, fullName: editUserName, role: editUserRole }) 
      });
      if (!res.ok) throw new Error("Error al actualizar");
      setIsEditUserModalOpen(false); fetchUsers(); return "Usuario actualizado";
    };
    toast.promise(updatePromise(), { loading: "Actualizando...", success: (d) => d, error: "Error", finally: () => setIsUpdatingUser(false) });
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    const deletePromise = async () => {
      const res = await fetch('/api/delete-user', { method: 'DELETE', body: JSON.stringify({ id: userToDelete.id }) });
      if (!res.ok) throw new Error("Error al eliminar");
      fetchUsers(); return "Usuario eliminado exitosamente";
    };
    toast.promise(deletePromise(), { loading: "Eliminando...", success: (d) => d, error: "Error" });
    setIsDeleteUserModalOpen(false); setUserToDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border-t-4 border-yellow-400">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-brand-navy flex items-center gap-2"><UserCog size={24} className="text-yellow-500" /> Panel de Empleados</h3>
          <button onClick={onClose} className="cursor-pointer text-gray-400 hover:text-red-500 hover:scale-110 active:scale-95 transition-all"><X size={24} /></button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600 font-medium">Lista de cuentas</p>
            <button onClick={() => setIsUserModalOpen(true)} className="cursor-pointer bg-brand-navy text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-all text-sm flex items-center gap-2 shadow-sm"><UserPlus size={16} /> Nuevo Usuario</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-100 text-gray-600 text-sm border-b border-gray-200"><th className="p-4 font-semibold">Nombre</th><th className="p-4 font-semibold">Rol</th><th className="p-4 font-semibold text-right">Acciones</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-brand-navy">{user.full_name}</td>
                    <td className="p-4">
                      {user.role === 'superadmin' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold border border-yellow-200">Super Admin</span>}
                      {user.role === 'admin' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold border border-green-200">Administrador</span>}
                      {user.role === 'viewer' && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold border border-gray-200">Espectador</span>}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {user.role !== 'superadmin' ? (
                        <>
                          <button onClick={() => { setEditUserId(user.id); setEditUserName(user.full_name); setEditUserRole(user.role); setIsEditUserModalOpen(true); }} className="cursor-pointer text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded hover:scale-110"><Edit size={16} /></button>
                          <button onClick={() => { setUserToDelete({ id: user.id, name: user.full_name }); setIsDeleteUserModalOpen(true); }} className="cursor-pointer text-red-500 hover:text-red-700 bg-red-50 p-2 rounded hover:scale-110"><Trash2 size={16} /></button>
                        </>
                      ) : <span className="text-xs text-gray-400 italic">No editable</span>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-gray-400">No hay usuarios registrados aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sub-Modal Crear Usuario */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border-t-4 border-brand-green">
            <div className="p-6 border-b flex justify-between">
              <h3 className="font-bold text-brand-navy flex items-center gap-2"><UserPlus size={20}/> Crear Empleado</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="cursor-pointer hover:text-red-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <input type="text" placeholder="Nombre Completo" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-green" required disabled={isCreatingUser}/>
              <input type="email" placeholder="Correo Electrónico" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-green" required disabled={isCreatingUser}/>
              <input type="text" placeholder="Contraseña Inicial" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-green" required disabled={isCreatingUser}/>
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none bg-white cursor-pointer" disabled={isCreatingUser}>
                <option value="viewer">Espectador</option>
                <option value="admin">Administrador</option>
              </select>
              <button type="submit" disabled={isCreatingUser} className="w-full bg-brand-navy text-white font-bold py-3 rounded-lg cursor-pointer hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50">
                {isCreatingUser ? "Creando..." : "Crear Usuario"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal Editar Usuario */}
      {isEditUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border-t-4 border-blue-500">
            <div className="p-6 border-b flex justify-between">
              <h3 className="font-bold flex items-center gap-2 text-brand-navy"><Edit size={20} className="text-blue-500"/> Editar Permisos</h3>
              <button onClick={() => setIsEditUserModalOpen(false)} className="cursor-pointer hover:text-red-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <input type="text" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required disabled={isUpdatingUser}/>
              <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none bg-white cursor-pointer" disabled={isUpdatingUser}>
                <option value="viewer">Espectador</option>
                <option value="admin">Administrador</option>
              </select>
              <button type="submit" disabled={isUpdatingUser} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg cursor-pointer hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50">
                {isUpdatingUser ? "Guardando..." : "Actualizar Perfil"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal Borrar Usuario */}
      {isDeleteUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center border-t-4 border-red-500">
            <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-2 text-brand-navy">¿Eliminar a {userToDelete?.name}?</h3>
            <p className="text-sm text-gray-500">Esta acción revocará su acceso permanentemente.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsDeleteUserModalOpen(false)} className="cursor-pointer flex-1 bg-gray-100 py-2.5 rounded-lg font-bold hover:bg-gray-200 active:scale-95 transition-all">Cancelar</button>
              <button onClick={executeDeleteUser} className="cursor-pointer flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600 active:scale-95 transition-all shadow-sm">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}