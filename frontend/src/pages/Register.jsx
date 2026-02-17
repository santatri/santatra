import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const Register = () => {
  const [centres, setCentres] = useState([]);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', mdp: '', confirmMdp: '', role: 'gerant', centre_id: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCentres = async () => {
      const res = await fetch(`${API_URL}/api/users/centres`);
      const data = await res.json();
      setCentres(data);
    };
    fetchCentres();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (formData.mdp !== formData.confirmMdp) {
      setMessage("⚠️ Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur');

      setMessage("✅ Inscription réussie !");
      setFormData({ nom: '', prenom: '', email: '', mdp: '', confirmMdp: '', role: 'gerant', centre_id: '' });
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-200 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Créer un compte</h2>

        <input type="text" name="nom" placeholder="Nom" value={formData.nom} onChange={handleChange} required className="w-full p-2 mb-2 border rounded" />
        <input type="text" name="prenom" placeholder="Prénom" value={formData.prenom} onChange={handleChange} required className="w-full p-2 mb-2 border rounded" />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full p-2 mb-2 border rounded" />

        <input type={showPassword ? 'text' : 'password'} name="mdp" placeholder="Mot de passe" value={formData.mdp} onChange={handleChange} required className="w-full p-2 mb-2 border rounded" />
        <input type={showConfirmPassword ? 'text' : 'password'} name="confirmMdp" placeholder="Confirmer mot de passe" value={formData.confirmMdp} onChange={handleChange} required className="w-full p-2 mb-2 border rounded" />

        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 mb-2 border rounded">
          <option value="gerant">Gérant</option>
          <option value="admin">Admin</option>
        </select>

        {formData.role === 'gerant' && (
          <select name="centre_id" value={formData.centre_id} onChange={handleChange} required className="w-full p-2 mb-2 border rounded">
            <option value="">Sélectionner le centre</option>
            {centres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        )}

        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white p-2 rounded">{isLoading ? "Création..." : "S'inscrire"}</button>
        {message && <p className={`mt-2 text-center ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </form>
    </div>
  );
};

export default Register;
