'use client'

import { useState, type KeyboardEvent } from 'react'
import AdminLoginForm from '@/components/AdminLoginForm'
import UserAuthForm from '@/components/UserAuthForm'

type LoginRole = 'admin' | 'user'
type UserMode = 'login' | 'register'

const roles: { value: LoginRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: '一般使用者' },
]

const userModes: { value: UserMode; label: string }[] = [
  { value: 'login', label: '登入' },
  { value: 'register', label: '註冊' },
]

function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  const currentIndex = tabs.indexOf(event.target as HTMLButtonElement)
  if (currentIndex === -1) return

  event.preventDefault()
  let nextIndex = currentIndex
  if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = tabs.length - 1
  tabs[nextIndex].focus()
  tabs[nextIndex].click()
}

function tabClassName(selected: boolean) {
  return `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
    selected ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-indigo-700'
  }`
}

export default function LoginPanel() {
  const [role, setRole] = useState<LoginRole>('admin')
  const [userMode, setUserMode] = useState<UserMode>('login')

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center mb-2 text-indigo-700">
        {role === 'admin' ? 'Admin 登入' : `使用者${userMode === 'register' ? '註冊' : '登入'}`}
      </h1>
      <p className="text-sm text-center text-gray-500 mb-6">測驗系統</p>

      <div
        role="tablist"
        aria-label="登入身分"
        className="flex gap-1 rounded-xl bg-indigo-50 p-1 mb-6"
        onKeyDown={handleTabKeyDown}
      >
        {roles.map(({ value, label }) => (
          <button
            key={value}
            id={`${value}-role-tab`}
            type="button"
            role="tab"
            aria-selected={role === value}
            aria-controls={`${value}-role-panel`}
            tabIndex={role === value ? 0 : -1}
            onClick={() => {
              if (role !== value) {
                setRole(value)
                setUserMode('login')
              }
            }}
            className={tabClassName(role === value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id="admin-role-panel"
        role="tabpanel"
        aria-labelledby="admin-role-tab"
        hidden={role !== 'admin'}
      >
        {role === 'admin' && <AdminLoginForm key="admin" />}
      </div>
      <div
        id="user-role-panel"
        role="tabpanel"
        aria-labelledby="user-role-tab"
        hidden={role !== 'user'}
      >
        {role === 'user' && (
          <>
            <div
              role="tablist"
              aria-label="使用者帳號操作"
              className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-4"
              onKeyDown={handleTabKeyDown}
            >
              {userModes.map(({ value, label }) => (
                <button
                  key={value}
                  id={`user-${value}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={userMode === value}
                  aria-controls={`user-${value}-panel`}
                  tabIndex={userMode === value ? 0 : -1}
                  onClick={() => setUserMode(value)}
                  className={tabClassName(userMode === value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {userModes.map(({ value }) => (
              <div
                key={value}
                id={`user-${value}-panel`}
                role="tabpanel"
                aria-labelledby={`user-${value}-tab`}
                hidden={userMode !== value}
              >
                {userMode === value && <UserAuthForm key={value} mode={value} />}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
