'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExamAction, saveListAction, deleteSavedListAction } from '@/actions/admin'

type AuthMode = 'NAME_ONLY' | 'NAME_PASSWORD' | 'GOOGLE' | 'SAVED_LIST'
interface MemberRow { name: string; password: string }
export interface SavedListData {
  id: string
  name: string
  authMode: string
  members: { name: string; password: string | null }[]
}

interface Props { savedLists: SavedListData[] }

export default function CreateExamForm({ savedLists: initialLists }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [mode, setMode] = useState<AuthMode>('NAME_ONLY')
  const [passingScore, setPassingScore] = useState(80)

  // NAME_ONLY state
  const [nameText, setNameText] = useState('')

  // NAME_PASSWORD state
  const [rows, setRows] = useState<MemberRow[]>([{ name: '', password: '' }])

  // SAVED_LIST state
  const [lists, setLists] = useState<SavedListData[]>(initialLists)
  const [selectedListId, setSelectedListId] = useState('')
  const [deletingId, setDeletingId] = useState('')

  // Save-to-list state
  const [showSave, setShowSave] = useState(false)
  const [listName, setListName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  // ── helpers ────────────────────────────────────────────────────────────────

  function parsedMembers(): { name: string; password?: string }[] {
    if (mode === 'NAME_ONLY') {
      return nameText
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ name }))
    }
    return rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), password: r.password.trim() || undefined }))
  }

  function loadSavedList(list: SavedListData) {
    const newMode = list.authMode === 'NAME_PASSWORD' ? 'NAME_PASSWORD' : 'NAME_ONLY'
    if (newMode === 'NAME_ONLY') {
      setNameText(list.members.map((m) => m.name).join('\n'))
    } else {
      setRows(list.members.map((m) => ({ name: m.name, password: m.password ?? '' })))
    }
    setMode(newMode)
    setSelectedListId('')
  }

  // ── submit exam ────────────────────────────────────────────────────────────

  function handleCreate() {
    if (mode === 'SAVED_LIST' || mode === 'GOOGLE') return
    const members = parsedMembers()
    if (members.length === 0) { setError('請至少輸入一位成員'); return }
    setError('')
    startTransition(async () => {
      const result = await createExamAction(passingScore, mode, members)
      if (result?.error) setError(result.error)
    })
  }

  // ── save list ──────────────────────────────────────────────────────────────

  async function handleSaveList() {
    if (!listName.trim()) { setSaveMsg('請輸入清單名稱'); return }
    const members = parsedMembers()
    if (members.length === 0) { setSaveMsg('成員清單不可為空'); return }
    setSaveMsg('')
    const result = await saveListAction(listName.trim(), mode, members)
    if (result?.error) { setSaveMsg(result.error); return }
    if (result?.list) {
      setLists((prev) => {
        const idx = prev.findIndex((l) => l.id === result.list!.id)
        return idx >= 0
          ? prev.map((l) => (l.id === result.list!.id ? result.list! : l))
          : [result.list!, ...prev]
      })
    }
    setSaveMsg('✓ 已儲存')
    setListName('')
    setTimeout(() => { setShowSave(false); setSaveMsg('') }, 1200)
  }

  // ── delete list ────────────────────────────────────────────────────────────

  async function handleDeleteList(id: string) {
    setDeletingId(id)
    await deleteSavedListAction(id)
    setLists((prev) => prev.filter((l) => l.id !== id))
    setDeletingId('')
    router.refresh()
  }

  // ── render helpers ─────────────────────────────────────────────────────────

  const canEdit = mode === 'NAME_ONLY' || mode === 'NAME_PASSWORD'

  // NAME_ONLY: at least one non-blank name
  // NAME_PASSWORD: at least one named row, and every named row has a password
  const canSaveList = (() => {
    if (mode === 'NAME_ONLY') {
      return nameText.split('\n').some((n) => n.trim())
    }
    if (mode === 'NAME_PASSWORD') {
      const namedRows = rows.filter((r) => r.name.trim())
      return namedRows.length > 0 && namedRows.every((r) => r.password.trim())
    }
    return false
  })()

  return (
    <div className="space-y-5">
      {/* 合格分數 */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 shrink-0">合格分數</label>
        <input
          type="number"
          value={passingScore}
          min={0}
          max={106}
          onChange={(e) => setPassingScore(Number(e.target.value))}
          className="w-28 border border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        <span className="text-xs text-gray-400">（滿分 100，加分題可超過）</span>
      </div>

      {/* 模式選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">成員登入方式</label>
        <select
          value={mode}
          onChange={(e) => { setMode(e.target.value as AuthMode); setError(''); setShowSave(false) }}
          className="border border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition cursor-pointer"
        >
          <option value="NAME_ONLY">名稱清單</option>
          <option value="NAME_PASSWORD">名稱清單 + 密碼</option>
          <option value="GOOGLE">綁定 Google 帳號（即將推出）</option>
          <option value="SAVED_LIST">使用常用清單</option>
        </select>
      </div>

      {/* ── NAME_ONLY ─────────────────────────────────────────────────────── */}
      {mode === 'NAME_ONLY' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            成員名單<span className="text-gray-400 font-normal ml-1">（每行一位）</span>
          </label>
          <textarea
            rows={7}
            value={nameText}
            onChange={(e) => setNameText(e.target.value)}
            placeholder={'Alice\nBob\nCharlie'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      )}

      {/* ── NAME_PASSWORD ──────────────────────────────────────────────────── */}
      {mode === 'NAME_PASSWORD' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">成員名單 + 密碼</label>
            <button
              type="button"
              onClick={() => setRows((r) => [...r, { name: '', password: '' }])}
              className="text-xs text-indigo-600 hover:underline"
            >
              + 新增一行
            </button>
          </div>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-1/2">成員名稱</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-1/2">密碼</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.name}
                        onChange={(e) => setRows((r) => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="姓名"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.password}
                        onChange={(e) => setRows((r) => r.map((x, j) => j === i ? { ...x, password: e.target.value } : x))}
                        placeholder="密碼"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-base leading-none"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GOOGLE 佔位 ────────────────────────────────────────────────────── */}
      {mode === 'GOOGLE' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl text-blue-700 text-sm">
          <span className="text-xl">🔒</span>
          <span>Google 帳號綁定功能即將推出，目前尚未開放。</span>
        </div>
      )}

      {/* ── SAVED_LIST ─────────────────────────────────────────────────────── */}
      {mode === 'SAVED_LIST' && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">選擇常用清單</p>
          {lists.length === 0 ? (
            <p className="text-sm text-gray-400">尚無常用清單，請先在「名稱清單」或「名稱清單 + 密碼」模式下建立。</p>
          ) : (
            <div className="space-y-2">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-sm">{list.name}</p>
                    <p className="text-xs text-gray-400">
                      {list.authMode === 'NAME_PASSWORD' ? '名稱 + 密碼' : '名稱清單'} ·{' '}
                      {list.members.length} 位成員
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadSavedList(list)}
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                    >
                      載入
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(list.id)}
                      disabled={deletingId === list.id}
                      className="text-xs border border-red-200 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {deletingId === list.id ? '…' : '刪除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 儲存至常用清單 (只在 NAME_ONLY / NAME_PASSWORD 顯示) ─────────── */}
      {canEdit && (
        <div>
          {!showSave ? (
            <button
              type="button"
              onClick={() => setShowSave(true)}
              disabled={!canSaveList}
              className="text-sm text-indigo-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
            >
              📌 儲存至常用清單
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={listName}
                onChange={(e) => { setListName(e.target.value); setSaveMsg('') }}
                placeholder="輸入清單名稱…"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
              <button
                type="button"
                onClick={handleSaveList}
                disabled={!canSaveList || !listName.trim()}
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                確認儲存
              </button>
              <button
                type="button"
                onClick={() => { setShowSave(false); setSaveMsg(''); setListName('') }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                取消
              </button>
              {saveMsg && (
                <span className={saveMsg.startsWith('✓') ? 'text-green-600 text-sm' : 'text-red-500 text-sm'}>
                  {saveMsg}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 建立測驗按鈕 ──────────────────────────────────────────────────── */}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {canEdit && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
        >
          {isPending ? '建立中…' : '建立測驗 →'}
        </button>
      )}
    </div>
  )
}
