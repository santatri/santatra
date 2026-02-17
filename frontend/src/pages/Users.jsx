// import React, { useEffect, useState } from 'react';
// import {
//   FaUsers,
//   FaPlus,
//   FaEye,
//   FaEyeSlash,
//   FaUser,
//   FaEnvelope,
//   FaLock,
//   FaUserTag,
//   FaTrash,
//   FaEdit,
//   FaBuilding,
//   FaTimes,
//   FaKey
// } from 'react-icons/fa';
// import Droits from './Droits';
// import Modal from 'react-modal';
// // import SendMail from './SendMail';
// import { API_URL } from '../config';

// Modal.setAppElement('#root');

// const Users = () => {
//   const [users, setUsers] = useState([]);
//   const [centres, setCentres] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [formData, setFormData] = useState({
//     nom: '',
//     prenom: '',
//     email: '',
//     mdp: '',
//     confirmMdp: '',
//     role: 'gerant',
//     centre_id: '',
//   });
//   const [message, setMessage] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [currentUserId, setCurrentUserId] = useState(null);
//   const [modalIsOpen, setModalIsOpen] = useState(false);

//   const API_URL1 = `${API_URL}/api/users`;

//   // Charger données
//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const [usersRes, centresRes] = await Promise.all([
//           fetch(`${API_URL1}`),
//           fetch(`${API_URL1}/centres`)
//         ]);

//         if (!usersRes.ok || !centresRes.ok) {
//           throw new Error('Erreur lors du chargement des données');
//         }

//         const usersData = await usersRes.json();
//         const centresData = await centresRes.json();

//         setUsers(usersData);
//         setCentres(centresData);
//       } catch (error) {
//         console.error('Erreur chargement:', error);
//         setMessage('❌ Erreur lors du chargement des données');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   const refreshUsers = async () => {
//     try {
//       const res = await fetch(`${API_URL1}`);
//       if (!res.ok) throw new Error('Erreur de rafraîchissement');
//       const data = await res.json();
//       setUsers(data);
//     } catch (error) {
//       console.error('Erreur:', error);
//     }
//   };

//   const getRoleBadgeClass = (role) => {
//     switch (role) {
//       case 'admin':
//         return 'bg-purple-100 text-purple-800 border-purple-200';
//       case 'gerant':
//         return 'bg-blue-100 text-blue-800 border-blue-200';
//       default:
//         return 'bg-gray-100 text-gray-800 border-gray-200';
//     }
//   };

//   const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

//   // Ajouter ou modifier utilisateur
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setMessage('');

//     // Validation
//     if (!isEditMode && formData.mdp !== formData.confirmMdp) {
//       setMessage('⚠️ Les mots de passe ne correspondent pas');
//       setIsLoading(false);
//       return;
//     }

//     try {
//       let response;
//       const userData = {
//         nom: formData.nom,
//         prenom: formData.prenom,
//         email: formData.email,
//         role: formData.role,
//         centre_id: formData.centre_id
//       };

//       if (isEditMode) {
//         // Mise à jour
//         response = await fetch(`${API_URL1}/${currentUserId}`, {
//           method: 'PUT',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(userData)
//         });
//       } else {
//         // Création - inclure le mot de passe
//         response = await fetch(`${API_URL1}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ ...userData, mdp: formData.mdp })
//         });
//       }

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Erreur lors de l\'opération');
//       }

//       setMessage(`✅ ${data.message}`);
//       await refreshUsers();
//       closeModal();
//       resetForm();
//     } catch (err) {
//       setMessage(`❌ ${err.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Supprimer utilisateur
//   const handleDelete = async (id) => {
//     if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

//     try {
//       const response = await fetch(`${API_URL1}/${id}`, {
//         method: 'DELETE'
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Erreur lors de la suppression');
//       }

//       setUsers(users.filter((u) => u.id !== id));
//       setMessage('✅ Utilisateur supprimé avec succès');
//     } catch (error) {
//       setMessage('❌ Erreur lors de la suppression');
//     }
//   };

//   // Modifier mot de passe
//   const handleChangePassword = async (userId) => {
//     const newPassword = prompt('Entrez le nouveau mot de passe:');
//     if (!newPassword) return;

//     if (newPassword.length < 6) {
//       alert('Le mot de passe doit contenir au moins 6 caractères');
//       return;
//     }

//     try {
//       const response = await fetch(`${API_URL1}/${userId}/password`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ mdp: newPassword })
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Erreur lors du changement de mot de passe');
//       }

//       setMessage('✅ Mot de passe modifié avec succès');
//     } catch (error) {
//       setMessage('❌ Erreur lors du changement de mot de passe');
//     }
//   };

//   const openModal = (user = null) => {
//     if (user) {
//       setIsEditMode(true);
//       setCurrentUserId(user.id);
//       setFormData({
//         nom: user.nom,
//         prenom: user.prenom,
//         email: user.email,
//         mdp: '',
//         confirmMdp: '',
//         role: user.role,
//         centre_id: user.centre_id || '',
//       });
//     } else {
//       setIsEditMode(false);
//       resetForm();
//     }
//     setModalIsOpen(true);
//   };

//   const closeModal = () => {
//     setModalIsOpen(false);
//     setMessage('');
//   };

//   const resetForm = () => {
//     setFormData({
//       nom: '',
//       prenom: '',
//       email: '',
//       mdp: '',
//       confirmMdp: '',
//       role: 'gerant',
//       centre_id: '',
//     });
//     setShowPassword(false);
//     setShowConfirmPassword(false);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-3 text-gray-600 text-sm">Chargement...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-3 px-2">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4">
//           <div>
//             <h1 className="text-lg font-bold text-gray-900 flex items-center">
//               <FaUsers className="mr-2 text-blue-600 text-sm" />
//               Utilisateurs
//             </h1>
//             <p className="text-gray-600 mt-1 text-xs">
//               {users.length} utilisateur{users.length !== 1 ? 's' : ''}
//             </p>
//           </div>
//           <button
//             onClick={() => openModal()}
//             className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-medium transition duration-200 shadow-sm text-xs"
//           >
//             <FaPlus className="mr-1" />
//             Nouveau
//           </button>
//         </div>

//         {/* Message Alert */}
//         {message && (
//           <div className={`mb-3 p-2 rounded ${
//             message.includes('❌') 
//               ? 'bg-red-50 border border-red-200 text-red-700' 
//               : message.includes('⚠️')
//                 ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
//                 : 'bg-green-50 border border-green-200 text-green-700'
//           }`}>
//             <div className="flex items-center">
//               {message.includes('❌') && <FaTimes className="mr-1 flex-shrink-0 text-xs" />}
//               {message.includes('✅') && <FaUsers className="mr-1 flex-shrink-0 text-xs" />}
//               <span className="text-xs">{message}</span>
//             </div>
//           </div>
//         )}

//         {/* Desktop Table */}
//         {users.length > 0 && (
//           <>
//             <div className="hidden lg:block bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
//                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
//                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
//                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centre</th>
//                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {users.map((u) => (
//                       <tr key={u.id} className="hover:bg-gray-50 transition duration-150">
//                         <td className="px-3 py-2 whitespace-nowrap">
//                           <div className="flex items-center">
//                             <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
//                               <FaUser className="h-3 w-3 text-blue-600" />
//                             </div>
//                             <div className="ml-2">
//                               <div className="text-xs font-medium text-gray-900">
//                                 {u.prenom} {u.nom}
//                               </div>
//                               <div className="text-xs text-gray-500">
//                                 {new Date(u.created_at).toLocaleDateString()}
//                               </div>
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-3 py-2 whitespace-nowrap">
//                           <div className="text-xs text-gray-900 break-all">{u.email}</div>
//                         </td>
//                         <td className="px-3 py-2 whitespace-nowrap">
//                           <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role)}`}>
//                             {u.role === 'admin' ? 'Admin' : 'Gérant'}
//                           </span>
//                         </td>
//                         <td className="px-3 py-2 whitespace-nowrap">
//                           <div className="text-xs text-gray-600">
//                             {u.centre_nom || '-'}
//                           </div>
//                         </td>
//                         <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
//                           <div className="flex space-x-1">
//                             <button
//                               onClick={() => openModal(u)}
//                               className="text-blue-600 hover:text-blue-900 transition duration-150 flex items-center text-xs"
//                             >
//                               <FaEdit className="mr-0.5" />
//                               Modifier
//                             </button>
//                             <button
//                               onClick={() => handleChangePassword(u.id)}
//                               className="text-green-600 hover:text-green-900 transition duration-150 flex items-center text-xs"
//                             >
//                               <FaKey className="mr-0.5" />
//                               Mdp
//                             </button>
//                             <button
//                               onClick={() => handleDelete(u.id)}
//                               className="text-red-600 hover:text-red-900 transition duration-150 flex items-center text-xs"
//                             >
//                               <FaTrash className="mr-0.5" />
//                               Supprimer
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             {/* Mobile Cards */}
//             <div className="lg:hidden space-y-2">
//               {users.map((u) => (
//                 <div key={u.id} className="bg-white rounded shadow-sm border border-gray-200 p-2">
//                   <div className="flex items-start justify-between mb-1">
//                     <div className="flex items-center flex-1 min-w-0">
//                       <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
//                         <FaUser className="h-3 w-3 text-blue-600" />
//                       </div>
//                       <div className="ml-2 min-w-0 flex-1">
//                         <h3 className="text-xs font-semibold text-gray-900 truncate">
//                           {u.prenom} {u.nom}
//                         </h3>
//                         <p className="text-gray-600 text-xs truncate">{u.email}</p>
//                       </div>
//                     </div>
//                     <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role)}`}>
//                       {u.role === 'admin' ? 'Admin' : 'Gérant'}
//                     </span>
//                   </div>

//                   <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
//                     <div className="flex items-center">
//                       <FaBuilding className="mr-1 text-gray-400 text-xs" />
//                       <span className="truncate max-w-[100px]">{u.centre_nom || '-'}</span>
//                     </div>
//                     <div className="text-gray-500 text-xs">
//                       {new Date(u.created_at).toLocaleDateString()}
//                     </div>
//                   </div>

//                   <div className="flex justify-between pt-1 border-t border-gray-200">
//                     <button
//                       onClick={() => openModal(u)}
//                       className="flex-1 inline-flex items-center justify-center text-blue-600 hover:text-blue-800 font-medium text-xs py-0.5 mx-0.5"
//                     >
//                       <FaEdit className="mr-0.5" />
//                       Modifier
//                     </button>
//                     <div className="w-px bg-gray-300"></div>
//                     <button
//                       onClick={() => handleChangePassword(u.id)}
//                       className="flex-1 inline-flex items-center justify-center text-green-600 hover:text-green-800 font-medium text-xs py-0.5 mx-0.5"
//                     >
//                       <FaKey className="mr-0.5" />
//                       Mdp
//                     </button>
//                     <div className="w-px bg-gray-300"></div>
//                     <button
//                       onClick={() => handleDelete(u.id)}
//                       className="flex-1 inline-flex items-center justify-center text-red-600 hover:text-red-800 font-medium text-xs py-0.5 mx-0.5"
//                     >
//                       <FaTrash className="mr-0.5" />
//                       Supprimer
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}

//         {/* Empty State */}
//         {!loading && users.length === 0 && (
//           <div className="bg-white rounded shadow-sm border border-gray-200 p-4 text-center">
//             <FaUsers className="w-10 h-10 text-gray-400 mx-auto mb-2" />
//             <h3 className="text-sm font-medium text-gray-900 mb-1">Aucun utilisateur</h3>
//             <p className="text-gray-600 mb-3 text-xs">Ajoutez votre premier utilisateur</p>
//             <button
//               onClick={() => openModal()}
//               className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium text-xs"
//             >
//               <FaPlus className="mr-1" />
//               Ajouter
//             </button>
//           </div>
//         )}

//         {/* Modal */}
//         <Modal
//           isOpen={modalIsOpen}
//           onRequestClose={closeModal}
//           contentLabel="Formulaire utilisateur"
//           className="bg-white rounded shadow-lg w-full max-w-md mx-auto my-2 outline-none"
//           overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-1 z-50 overflow-y-auto"
//         >
//           <div className="p-3 border-b border-gray-200">
//             <div className="flex items-center justify-between">
//               <h2 className="text-sm font-semibold text-gray-900 flex items-center">
//                 <FaUsers className="mr-1 text-blue-600 text-xs" />
//                 {isEditMode ? 'Modifier' : 'Nouvel utilisateur'}
//               </h2>
//               <button
//                 onClick={closeModal}
//                 className="text-gray-400 hover:text-gray-600 transition duration-150 p-0.5"
//               >
//                 <FaTimes className="w-3 h-3" />
//               </button>
//             </div>
//           </div>

//           <form onSubmit={handleSubmit} className="p-3 space-y-2">
//             <div className="space-y-2">
//               {/* Nom */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                   Nom <span className="text-red-500">*</span>
//                 </label>
//                 <div className="relative">
//                   <FaUser className="absolute left-2 top-2 text-gray-400 text-xs" />
//                   <input
//                     type="text"
//                     name="nom"
//                     placeholder="Nom"
//                     value={formData.nom}
//                     onChange={handleChange}
//                     required
//                     className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
//                   />
//                 </div>
//               </div>

//               {/* Prénom */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                   Prénom <span className="text-red-500">*</span>
//                 </label>
//                 <div className="relative">
//                   <FaUser className="absolute left-2 top-2 text-gray-400 text-xs" />
//                   <input
//                     type="text"
//                     name="prenom"
//                     placeholder="Prénom"
//                     value={formData.prenom}
//                     onChange={handleChange}
//                     required
//                     className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
//                   />
//                 </div>
//               </div>

//               {/* Email */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                   Email <span className="text-red-500">*</span>
//                 </label>
//                 <div className="relative">
//                   <FaEnvelope className="absolute left-2 top-2 text-gray-400 text-xs" />
//                   <input
//                     type="email"
//                     name="email"
//                     placeholder="email@exemple.com"
//                     value={formData.email}
//                     onChange={handleChange}
//                     required
//                     className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
//                   />
//                 </div>
//               </div>

//               {/* Mot de passe (uniquement en création) */}
//               {!isEditMode && (
//                 <>
//                   <div>
//                     <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                       Mot de passe <span className="text-red-500">*</span>
//                     </label>
//                     <div className="relative">
//                       <FaLock className="absolute left-2 top-2 text-gray-400 text-xs" />
//                       <input
//                         type={showPassword ? 'text' : 'password'}
//                         name="mdp"
//                         placeholder="Mot de passe (min. 6 caractères)"
//                         value={formData.mdp}
//                         onChange={handleChange}
//                         required
//                         minLength="6"
//                         className="pl-7 pr-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
//                       />
//                       <button
//                         type="button"
//                         className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition duration-150 text-xs"
//                         onClick={() => setShowPassword(!showPassword)}
//                       >
//                         {showPassword ? <FaEyeSlash /> : <FaEye />}
//                       </button>
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                       Confirmer <span className="text-red-500">*</span>
//                     </label>
//                     <div className="relative">
//                       <FaKey className="absolute left-2 top-2 text-gray-400 text-xs" />
//                       <input
//                         type={showConfirmPassword ? 'text' : 'password'}
//                         name="confirmMdp"
//                         placeholder="Confirmer mot de passe"
//                         value={formData.confirmMdp}
//                         onChange={handleChange}
//                         required
//                         className="pl-7 pr-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
//                       />
//                       <button
//                         type="button"
//                         className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition duration-150 text-xs"
//                         onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                       >
//                         {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
//                       </button>
//                     </div>
//                   </div>
//                 </>
//               )}

//               {/* Rôle */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                   Rôle <span className="text-red-500">*</span>
//                 </label>
//                 <div className="relative">
//                   <FaUserTag className="absolute left-2 top-2 text-gray-400 text-xs" />
//                   <select
//                     name="role"
//                     value={formData.role}
//                     onChange={handleChange}
//                     className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 appearance-none bg-white text-xs"
//                   >
//                     <option value="gerant">Gérant</option>
//                     <option value="admin">Administrateur</option>
//                   </select>
//                 </div>
//               </div>

//               {/* Centre */}
//               {formData.role === 'gerant' && (
//                 <div>
//                   <label className="block text-xs font-medium text-gray-700 mb-0.5">
//                     Centre <span className="text-red-500">*</span>
//                   </label>
//                   <div className="relative">
//                     <FaBuilding className="absolute left-2 top-2 text-gray-400 text-xs" />
//                     <select
//                       name="centre_id"
//                       value={formData.centre_id}
//                       onChange={handleChange}
//                       required={formData.role === 'gerant'}
//                       className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 appearance-none bg-white text-xs"
//                     >
//                       <option value="">Sélectionner</option>
//                       {centres.map((c) => (
//                         <option key={c.id} value={c.id}>
//                           {c.nom}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Action Buttons */}
//             <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
//               <button
//                 type="submit"
//                 disabled={isLoading}
//                 className="flex-1 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-1.5 px-2 rounded transition duration-200 shadow-sm text-xs"
//               >
//                 {isLoading ? (
//                   <>
//                     <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-white mr-1"></div>
//                     Enregistrement...
//                   </>
//                 ) : isEditMode ? (
//                   <>
//                     <FaEdit className="mr-1" />
//                     Modifier
//                   </>
//                 ) : (
//                   <>
//                     <FaPlus className="mr-1" />
//                     Ajouter
//                   </>
//                 )}
//               </button>

//               <button
//                 type="button"
//                 onClick={closeModal}
//                 disabled={isLoading}
//                 className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-1.5 px-2 border border-gray-300 rounded transition duration-200 text-xs"
//               >
//                 <FaTimes className="mr-1" />
//                 Annuler
//               </button>
//             </div>
//           </form>
//         </Modal>
//       </div>
//       <div>
//         <Droits />
//         {/* <SendMail /> */}
//       </div>
//     </div>
//   );
// };

// export default Users;

import React, { useEffect, useState } from 'react';
import {
  FaUsers,
  FaPlus,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserTag,
  FaTrash,
  FaEdit,
  FaBuilding,
  FaTimes,
  FaKey
} from 'react-icons/fa';
import Droits from './Droits';
import Modal from 'react-modal';
// import SendMail from './SendMail';
import { API_URL } from '../config';

Modal.setAppElement('#root');

const Users = () => {
  const [users, setUsers] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    mdp: '',
    confirmMdp: '',
    role: 'gerant',
    centre_id: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  // États pour le changement de mot de passe
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const API_URL1 = `${API_URL}/api/users`;

  // Charger données
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, centresRes] = await Promise.all([
          fetch(`${API_URL1}`),
          fetch(`${API_URL1}/centres`)
        ]);

        if (!usersRes.ok || !centresRes.ok) {
          throw new Error('Erreur lors du chargement des données');
        }

        const usersData = await usersRes.json();
        const centresData = await centresRes.json();

        setUsers(usersData);
        setCentres(centresData);
      } catch (error) {
        console.error('Erreur chargement:', error);
        setMessage('❌ Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshUsers = async () => {
    try {
      const res = await fetch(`${API_URL1}`);
      if (!res.ok) throw new Error('Erreur de rafraîchissement');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'dir':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'gerant':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Ajouter ou modifier utilisateur
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // Validation
    if (!isEditMode && formData.mdp !== formData.confirmMdp) {
      setMessage('⚠️ Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    try {
      let response;
      const userData = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        role: formData.role,
        centre_id: formData.centre_id
      };

      if (isEditMode) {
        // Mise à jour
        response = await fetch(`${API_URL1}/${currentUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
      } else {
        // Création - inclure le mot de passe
        response = await fetch(`${API_URL1}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, mdp: formData.mdp })
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'opération');
      }

      setMessage(`✅ ${data.message}`);
      await refreshUsers();
      closeModal();
      resetForm();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer utilisateur
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const response = await fetch(`${API_URL1}/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression');
      }

      setUsers(users.filter((u) => u.id !== id));
      setMessage('✅ Utilisateur supprimé avec succès');
    } catch (error) {
      setMessage('❌ Erreur lors de la suppression');
    }
  };

  // Ouvrir modal pour changer le mot de passe
  const handleChangePassword = (userId) => {
    const user = users.find(u => u.id === userId);
    setSelectedUserId(userId);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setMessage('');
    setChangePasswordModal(true);
  };

  // Soumettre le nouveau mot de passe
  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setChangePasswordLoading(true);
    setMessage('');

    if (newPassword !== confirmNewPassword) {
      setMessage('⚠️ Les mots de passe ne correspondent pas');
      setChangePasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('⚠️ Le mot de passe doit contenir au moins 6 caractères');
      setChangePasswordLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL1}/${selectedUserId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mdp: newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors du changement de mot de passe');
      }

      setMessage('✅ Mot de passe modifié avec succès');
      closeChangePasswordModal();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setIsEditMode(true);
      setCurrentUserId(user.id);
      setFormData({
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        mdp: '',
        confirmMdp: '',
        role: user.role,
        centre_id: user.centre_id || '',
      });
    } else {
      setIsEditMode(false);
      resetForm();
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setMessage('');
  };

  const closeChangePasswordModal = () => {
    setChangePasswordModal(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setSelectedUserId(null);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      mdp: '',
      confirmMdp: '',
      role: 'gerant',
      centre_id: '',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3 px-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <FaUsers className="mr-2 text-blue-600 text-sm" />
              Utilisateurs
            </h1>
            <p className="text-gray-600 mt-1 text-xs">
              {users.length} utilisateur{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-medium transition duration-200 shadow-sm text-xs"
          >
            <FaPlus className="mr-1" />
            Nouveau
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-3 p-2 rounded ${message.includes('❌')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : message.includes('⚠️')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
              : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
            <div className="flex items-center">
              {message.includes('❌') && <FaTimes className="mr-1 flex-shrink-0 text-xs" />}
              {message.includes('✅') && <FaUsers className="mr-1 flex-shrink-0 text-xs" />}
              {message.includes('⚠️') && <FaEye className="mr-1 flex-shrink-0 text-xs" />}
              <span className="text-xs">{message}</span>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        {users.length > 0 && (
          <>
            <div className="hidden lg:block bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <FaUser className="h-3 w-3 text-blue-600" />
                            </div>
                            <div className="ml-2">
                              <div className="text-xs font-medium text-gray-900">
                                {u.prenom} {u.nom}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(u.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs text-gray-900 break-all">{u.email}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role)}`}>
                            {u.role === 'admin' ? 'Admin' : u.role === 'dir' ? 'Direction' : 'Gérant'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs text-gray-600">
                            {u.centre_nom || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openModal(u)}
                              className="text-blue-600 hover:text-blue-900 transition duration-150 flex items-center text-xs"
                            >
                              <FaEdit className="mr-0.5" />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleChangePassword(u.id)}
                              className="text-green-600 hover:text-green-900 transition duration-150 flex items-center text-xs"
                            >
                              <FaKey className="mr-0.5" />
                              Mdp
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="text-red-600 hover:text-red-900 transition duration-150 flex items-center text-xs"
                            >
                              <FaTrash className="mr-0.5" />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-2">
              {users.map((u) => (
                <div key={u.id} className="bg-white rounded shadow-sm border border-gray-200 p-2">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="ml-2 min-w-0 flex-1">
                        <h3 className="text-xs font-semibold text-gray-900 truncate">
                          {u.prenom} {u.nom}
                        </h3>
                        <p className="text-gray-600 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(u.role)}`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'dir' ? 'Direction' : 'Gérant'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <div className="flex items-center">
                      <FaBuilding className="mr-1 text-gray-400 text-xs" />
                      <span className="truncate max-w-[100px]">{u.centre_nom || '-'}</span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-gray-200">
                    <button
                      onClick={() => openModal(u)}
                      className="flex-1 inline-flex items-center justify-center text-blue-600 hover:text-blue-800 font-medium text-xs py-0.5 mx-0.5"
                    >
                      <FaEdit className="mr-0.5" />
                      Modifier
                    </button>
                    <div className="w-px bg-gray-300"></div>
                    <button
                      onClick={() => handleChangePassword(u.id)}
                      className="flex-1 inline-flex items-center justify-center text-green-600 hover:text-green-800 font-medium text-xs py-0.5 mx-0.5"
                    >
                      <FaKey className="mr-0.5" />
                      Mdp
                    </button>
                    <div className="w-px bg-gray-300"></div>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="flex-1 inline-flex items-center justify-center text-red-600 hover:text-red-800 font-medium text-xs py-0.5 mx-0.5"
                    >
                      <FaTrash className="mr-0.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && users.length === 0 && (
          <div className="bg-white rounded shadow-sm border border-gray-200 p-4 text-center">
            <FaUsers className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">Aucun utilisateur</h3>
            <p className="text-gray-600 mb-3 text-xs">Ajoutez votre premier utilisateur</p>
            <button
              onClick={() => openModal()}
              className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium text-xs"
            >
              <FaPlus className="mr-1" />
              Ajouter
            </button>
          </div>
        )}

        {/* Modal pour créer/modifier un utilisateur */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          contentLabel="Formulaire utilisateur"
          className="bg-white rounded shadow-lg w-full max-w-md mx-auto my-2 outline-none"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-1 z-50 overflow-y-auto"
        >
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                <FaUsers className="mr-1 text-blue-600 text-xs" />
                {isEditMode ? 'Modifier' : 'Nouvel utilisateur'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition duration-150 p-0.5"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-2">
            <div className="space-y-2">
              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-2 top-2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    name="nom"
                    placeholder="Nom"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                  />
                </div>
              </div>

              {/* Prénom */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-2 top-2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    name="prenom"
                    placeholder="Prénom"
                    value={formData.prenom}
                    onChange={handleChange}
                    required
                    className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-2 top-2 text-gray-400 text-xs" />
                  <input
                    type="email"
                    name="email"
                    placeholder="email@exemple.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                  />
                </div>
              </div>

              {/* Mot de passe (uniquement en création) */}
              {!isEditMode && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaLock className="absolute left-2 top-2 text-gray-400 text-xs" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="mdp"
                        placeholder="Mot de passe (min. 6 caractères)"
                        value={formData.mdp}
                        onChange={handleChange}
                        required
                        minLength="6"
                        className="pl-7 pr-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition duration-150 text-xs"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Confirmer <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaKey className="absolute left-2 top-2 text-gray-400 text-xs" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmMdp"
                        placeholder="Confirmer mot de passe"
                        value={formData.confirmMdp}
                        onChange={handleChange}
                        required
                        className="pl-7 pr-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition duration-150 text-xs"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Rôle */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUserTag className="absolute left-2 top-2 text-gray-400 text-xs" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 appearance-none bg-white text-xs"
                  >
                    <option value="gerant">Gérant</option>
                    <option value="dir">Direction</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>

              {/* Centre */}
              {formData.role === 'gerant' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Centre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FaBuilding className="absolute left-2 top-2 text-gray-400 text-xs" />
                    <select
                      name="centre_id"
                      value={formData.centre_id}
                      onChange={handleChange}
                      required={formData.role === 'gerant'}
                      className="pl-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 appearance-none bg-white text-xs"
                    >
                      <option value="">Sélectionner</option>
                      {centres.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-1.5 px-2 rounded transition duration-200 shadow-sm text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-white mr-1"></div>
                    Enregistrement...
                  </>
                ) : isEditMode ? (
                  <>
                    <FaEdit className="mr-1" />
                    Modifier
                  </>
                ) : (
                  <>
                    <FaPlus className="mr-1" />
                    Ajouter
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-1.5 px-2 border border-gray-300 rounded transition duration-200 text-xs"
              >
                <FaTimes className="mr-1" />
                Annuler
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal pour changer le mot de passe */}
        <Modal
          isOpen={changePasswordModal}
          onRequestClose={closeChangePasswordModal}
          contentLabel="Changer le mot de passe"
          className="bg-white rounded shadow-lg w-full max-w-md mx-auto my-2 outline-none"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-1 z-50 overflow-y-auto"
        >
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                <FaKey className="mr-1 text-green-600 text-xs" />
                Changer le mot de passe
              </h2>
              <button
                onClick={closeChangePasswordModal}
                className="text-gray-400 hover:text-gray-600 transition duration-150 p-0.5"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Pour l'utilisateur : {selectedUserId && users.find(u => u.id === selectedUserId)?.email}
            </p>
          </div>

          <form onSubmit={handleSubmitNewPassword} className="p-3 space-y-2">
            <div className="space-y-2">
              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-2 top-2 text-gray-400 text-xs" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength="6"
                    className="pl-7 pr-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition duration-150 text-xs"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirmer le nouveau mot de passe */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaKey className="absolute left-2 top-2 text-gray-400 text-xs" />
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    placeholder="Confirmer le mot de passe"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="pl-7 pr-7 w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent transition duration-200 text-xs"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-gray-400 hover:text-blue-600 transition duration-150 text-xs"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  >
                    {showConfirmNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col gap-1 pt-2 border-t border-gray-200">
              <button
                type="submit"
                disabled={changePasswordLoading}
                className="flex-1 inline-flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-1.5 px-2 rounded transition duration-200 shadow-sm text-xs"
              >
                {changePasswordLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-white mr-1"></div>
                    Modification...
                  </>
                ) : (
                  <>
                    <FaKey className="mr-1" />
                    Changer le mot de passe
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={closeChangePasswordModal}
                disabled={changePasswordLoading}
                className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-1.5 px-2 border border-gray-300 rounded transition duration-200 text-xs"
              >
                <FaTimes className="mr-1" />
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      </div>
      <div>
        <Droits />
        {/* <SendMail /> */}
      </div>
    </div>
  );
};

export default Users;