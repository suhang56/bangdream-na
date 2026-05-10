import { useEffect, useState } from 'react'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchMembers } from '../lib/api.js'
import { adaptMemberList } from '../lib/apiAdapter.js'
import { sortMembersByName } from '../lib/members.js'
import './Members.css'

export default function Members() {
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchMembers()
      .then((res) => {
        if (cancelled) return
        setMembers(sortMembersByName(adaptMemberList(res)))
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') {
    return <LoadingState className="members-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="members-error" onRetry={retry} />
  }

  return (
    <>
      <div className="bf-page-hd">
        <div className="bf-container">
          <div>
            <span className="ph-tag">// 成员</span>
            <h1>成员</h1>
          </div>
          <span className="ph-meta">组织者、成员、翻奏乐队 — 北美 BanG Dream 一览</span>
        </div>
      </div>
      <main className="bf-page-body">
        <div className="bf-container">
          <div className="bf-helper" style={{ marginTop: 0 }}>
            <span className="bf-helper-tag">// 组织者、成员、翻奏乐队</span>
            <p>
              北美 BanG Dream 同好一览。共 <strong>{members.length}</strong>+ 名同好（节选）。
              如需修改自己的显示名或地区标签，请在 QQ 群联系管理员。
            </p>
          </div>
          <div className="bf-members-grid">
            {members.map((m) => (
              <div key={m.id} className="bf-member">
                {m.name ?? ''}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
