import { createContext, useContext, useState } from "react";
import api, { TOKEN_KEY } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  async function login(email, password) {
    // The backend expects form data with the email in the "username" field.
    const body = new URLSearchParams({ username: email, password });
    const { data } = await api.post("/auth/login", body);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
  }

  // Signup does not log you in: the account must be verified by email first.
  async function signup(name, email, password) {
    await api.post("/auth/signup", { name, email, password });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}