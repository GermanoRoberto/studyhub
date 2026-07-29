const API_BASE = 'http://localhost:5000/api';

/**
 * Helper para obter os headers com o provider e chave API
 */
const getHeaders = (provider, apiKey) => {
  const headers = {};
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
