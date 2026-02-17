import React, { useState } from 'react';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
import { useAuth } from '../context/authContext';

export default function SendMail() {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const resp = await fetch(`${API_BASE}/mail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text, html })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || 'Erreur');
      setMessage({ type: 'success', text: 'E-mail envoyé.' });
      setTo(''); setSubject(''); setText(''); setHtml('');
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Erreur envoi mail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Envoyer un e-mail</h2>
        {user && <p className="text-sm text-gray-500 mb-3">Connecté en tant que {user.email || user.nom}</p>}
        {message && (
          <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="text-sm font-medium">À</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} className="w-full p-2 border rounded mt-1" placeholder="destinataire@exemple.com" />
          </div>
          <div>
            <label className="text-sm font-medium">Sujet</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-2 border rounded mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Message (texte)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full p-2 border rounded mt-1" rows={5}></textarea>
          </div>
          <div>
            <label className="text-sm font-medium">Message (HTML optionnel)</label>
            <textarea value={html} onChange={(e) => setHtml(e.target.value)} className="w-full p-2 border rounded mt-1" rows={4}></textarea>
          </div>

          <div className="flex items-center gap-3">
            <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Envoi...' : 'Envoyer'}</button>
            <button type="button" onClick={() => { setTo(''); setSubject(''); setText(''); setHtml(''); }} className="px-3 py-2 border rounded">Réinitialiser</button>
          </div>
        </form>
      </div>
    </div>
  );
}
