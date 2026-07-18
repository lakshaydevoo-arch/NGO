async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function login(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

async function register(name, email, password) {
  return request('POST', '/api/auth/register', { name, email, password });
}

async function logout() {
  return request('POST', '/api/auth/logout');
}

async function getCurrentUser() {
  const data = await request('GET', '/api/auth/me');
  return data.user;
}
