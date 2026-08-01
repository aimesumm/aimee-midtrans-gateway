
import React, { createContext, useContext, useMemo, useState } from 'react'
import { adminLogin as adminLoginRequest, getAdminToken, setAdminToken } from '../lib/menuApi'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => getAdminToken())

  const api = useMemo(() => {
    const login = async (password) => {
      const nextToken = await adminLoginRequest(password)
      setAdminToken(nextToken)
      setToken(nextToken)
      return nextToken
    }

    const logout = () => {
      setAdminToken('')
      setToken('')
    }

    return { isAdmin: Boolean(token), login, logout }
  }, [token])

  return <AdminAuthContext.Provider value={api}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth harus dipakai di dalam AdminAuthProvider')
  return ctx
}
