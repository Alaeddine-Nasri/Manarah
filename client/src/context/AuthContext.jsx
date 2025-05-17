import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  // Step 1: validate credentials. Returns { user, schools } if multi-school,
  // or logs in directly and returns { user } if single school.
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    if (data.requires_school_selection) {
      // caller (Login page) will show a school picker
      return data;
    }

    // single school — token is ready
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  // Step 2: called after user picks a school
  const selectSchool = async (email, password, school_id) => {
    const { data } = await api.post('/auth/login', { email, password, school_id });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, selectSchool, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
