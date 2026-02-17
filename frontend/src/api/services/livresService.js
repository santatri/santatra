import { API_URL } from '../../config';

const API_URL1 = `${API_URL}/api/livres`;

export async function getLivres(formationId = null) {
  try {
    const url = formationId 
      ? `${API_URL1}?formation_id=${formationId}`
      : API_URL1;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors de la récupération des livres');
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

export async function getLivre(id) {
  try {
    const response = await fetch(`${API_URL1}/${id}`);
    if (!response.ok) throw new Error('Livre non trouvé');
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

export async function createLivre(payload) {
  try {
    const response = await fetch(API_URL1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erreur lors de la création du livre');
    const data = await response.json();
    return data.livre;
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

export async function updateLivre(id, payload) {
  try {
    const response = await fetch(`${API_URL1}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erreur lors de la mise à jour du livre');
    const data = await response.json();
    return data.livre;
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

export async function deleteLivre(id) {
  try {
    const response = await fetch(`${API_URL1}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erreur lors de la suppression du livre');
    return true;
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}

export async function searchLivres(nom = null, formationId = null) {
  try {
    const params = new URLSearchParams();
    if (nom) params.append('nom', nom);
    if (formationId) params.append('formation_id', formationId);
    
    const url = params.toString() 
      ? `${API_URL1}/search?${params.toString()}`
      : `${API_URL1}/search`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur lors de la recherche');
    return await response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
}
