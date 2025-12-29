// frontend/src/api.js
export const API_BASE_URL = 'http://localhost:3001';

// Criamos um facilitador simples para não depender de bibliotecas extras
export const api = {
    get: (url) => fetch(`${API_BASE_URL}${url}`),
    post: (url, body) => fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }),
    put: (url, body) => fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }),
    delete: (url) => fetch(`${API_BASE_URL}${url}`, { method: 'DELETE' })
};