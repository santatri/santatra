import axios from 'axios';

const API_URL = '/api/autres_montants';

// Types de montants
export const fetchTypesMontants = () => axios.get(`${API_URL}/types`).then(r => r.data);
export const createTypeMontant = (data) => axios.post(`${API_URL}/types`, data).then(r => r.data);

// Montants autres
export const fetchMontantsAutres = () => axios.get(API_URL).then(r => r.data);
export const createMontantAutre = (data) => axios.post(API_URL, data).then(r => r.data);
export const deleteMontantAutre = (id) => axios.delete(`${API_URL}/${id}`).then(r => r.data);

// Statistiques
export const fetchStatsMontantsAutres = () => axios.get(`${API_URL}/stats`).then(r => r.data);
