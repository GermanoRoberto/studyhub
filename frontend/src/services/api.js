const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  let data = null;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: Servidor temporariamente indisponível.`);
    }
  }
  if (!response.ok) {
    throw new Error((data && data.error) || 'Falha na autenticação.');
  }
  return data;
};

export const verifyAuthToken = async (token) => {
  if (!token) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Obtém todos os dados do usuário salvos na nuvem (Supabase)
 */
export const fetchCloudUserData = async () => {
  const token = localStorage.getItem('studyhub_auth_token');
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/sync`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || {};
  } catch (e) {
    console.warn('Falha ao buscar dados na nuvem:', e);
    return null;
  }
};

/**
 * Salva categoria de dados do usuário na nuvem (Supabase)
 */
export const saveCloudUserData = async (category, data) => {
  const token = localStorage.getItem('studyhub_auth_token');
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ category, data })
    });
    return res.ok;
  } catch (e) {
    console.warn('Falha ao sincronizar dados na nuvem:', e);
    return false;
  }
};

/**
 * Helper para obter os headers com o provider, chave API e token de autenticação
 */
const getHeaders = (provider, apiKey) => {
  const headers = {};
  const token = localStorage.getItem('studyhub_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (provider) {
    headers['x-provider'] = provider;
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
};

export const uploadEdital = async (file, provider, apiKey) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: getHeaders(provider, apiKey),
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro no envio do edital');
  }

  return response.json();
};

export const generateDashboard = async (cargo, editalText, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/generate-dashboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ cargo, editalText }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao gerar o dashboard');
  }

  return response.json();
};

export const searchDates = async (concurso, banca, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/search-dates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ concurso, banca }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao pesquisar datas');
  }

  return response.json();
};

export const generateExercises = async (cargo, materia, topico, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/generate-exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ cargo, materia, topico }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao gerar exercícios');
  }

  return response.json();
};

export const getMocks = async () => {
  const response = await fetch(`${API_BASE}/mocks`);
  if (!response.ok) {
    throw new Error('Erro ao carregar exames demonstrativos');
  }
  return response.json();
};

export const generateSummary = async (cargo, materia, topico, mode, banca, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/generate-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ cargo, materia, topico, mode, banca }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao carregar resumo de estudos');
  }

  return response.json();
};

export const generateSubjectExercises = async (cargo, materia, numQuestoes, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/generate-subject-exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ cargo, materia, numQuestoes }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao carregar simulado completo');
  }

  return response.json();
};

export const generateRevisional = async (cargo, materia, erros, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/generate-revisional`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ cargo, materia, erros }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao carregar revisional de erros');
  }

  return response.json();
};

export const uploadConcursoPrint = async (file, provider, apiKey) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/monitor/upload-print`, {
    method: 'POST',
    headers: getHeaders(provider, apiKey),
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao enviar print');
  }

  return response.json();
};

export const checkConcursoUpdate = async (concurso, status, banca, provider, apiKey) => {
  const response = await fetch(`${API_BASE}/monitor/check-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(provider, apiKey)
    },
    body: JSON.stringify({ concurso, status, banca }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao buscar atualizações');
  }

  return response.json();
};

export const getRadarConcursos = async (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.area && filters.area !== 'Todas') query.append('area', filters.area);
  if (filters.escolaridade && filters.escolaridade !== 'Todas') query.append('escolaridade', filters.escolaridade);
  if (filters.status && filters.status !== 'Todos') query.append('status', filters.status);

  const response = await fetch(`${API_BASE}/concursos/radar?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Erro ao carregar radar de concursos');
  }
  return response.json();
};
