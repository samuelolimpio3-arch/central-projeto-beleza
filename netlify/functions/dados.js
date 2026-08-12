// Função que guarda e devolve os dados do app na nuvem, usando Netlify Blobs
// (armazenamento gratuito ligado ao próprio site, incluso no plano free do Netlify).
//
// GET  /.netlify/functions/dados?key=contentData        -> { value: <dado guardado ou null> }
// POST /.netlify/functions/dados?key=contentData         body: { value: <qualquer JSON> }  -> guarda
//
// Proteção opcional: se a variável de ambiente ACCESS_TOKEN estiver configurada no site
// (Site settings → Environment variables, no painel do Netlify), toda chamada precisa
// enviar o cabeçalho "x-access-token" com o mesmo valor, senão a função responde 401.
// Se ACCESS_TOKEN não estiver configurada, a função fica aberta (sem senha).

const { getStore } = require('@netlify/blobs');

const ALLOWED_KEYS = ['contentData', 'comissaoEntries', 'metricsData', 'roteiroKB', 'adsData', 'cerebroHistorico', 'espiaoHistorico', 'engenheiroHistorico', 'trendHunterHistorico', 'pautistaHistorico'];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-access-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const requiredToken = process.env.ACCESS_TOKEN;
  if (requiredToken) {
    const sentToken = event.headers['x-access-token'] || event.headers['X-Access-Token'];
    if (sentToken !== requiredToken) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'unauthorized' }) };
    }
  }

  const key = (event.queryStringParameters || {}).key;
  if (!key || !ALLOWED_KEYS.includes(key)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'chave inválida' }) };
  }

  const store = getStore('projeto-beleza-dados');

  try {
    if (event.httpMethod === 'GET') {
      const value = await store.get(key, { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify({ value: value === null ? null : value }) };
    }

    if (event.httpMethod === 'POST') {
      let payload;
      try {
        payload = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'body inválido' }) };
      }
      await store.setJSON(key, payload.value);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'método não permitido' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'erro interno', detail: String(e && e.message || e) }) };
  }
};
