import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000/api'

function App() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTodo, setNewTodo] = useState({ title: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [editTodo, setEditTodo] = useState({ title: '', description: '' })

  // 할일 목록 가져오기
  const fetchTodos = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/todos`)
      const data = await response.json()
      if (response.ok) {
        setTodos(data.todos || [])
      } else {
        setError(data.error || '할일 목록을 불러오는데 실패했습니다.')
      }
    } catch (err) {
      setError('서버에 연결할 수 없습니다.')
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }

  // 할일 추가
  const handleAddTodo = async (e) => {
    e.preventDefault()
    if (!newTodo.title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTodo),
      })

      const data = await response.json()
      if (response.ok) {
        setNewTodo({ title: '', description: '' })
        fetchTodos()
      } else {
        alert(data.error || '할일 추가에 실패했습니다.')
      }
    } catch (err) {
      alert('서버에 연결할 수 없습니다.')
      console.error('Error adding todo:', err)
    }
  }

  // 할일 수정 시작
  const startEdit = (todo) => {
    setEditingId(todo._id)
    setEditTodo({ title: todo.title, description: todo.description || '' })
  }

  // 할일 수정 취소
  const cancelEdit = () => {
    setEditingId(null)
    setEditTodo({ title: '', description: '' })
  }

  // 할일 수정 저장
  const handleUpdateTodo = async (id) => {
    if (!editTodo.title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editTodo),
      })

      const data = await response.json()
      if (response.ok) {
        setEditingId(null)
        setEditTodo({ title: '', description: '' })
        fetchTodos()
      } else {
        alert(data.error || '할일 수정에 실패했습니다.')
      }
    } catch (err) {
      alert('서버에 연결할 수 없습니다.')
      console.error('Error updating todo:', err)
    }
  }

  // 할일 삭제
  const handleDeleteTodo = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/todos/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        fetchTodos()
      } else {
        alert(data.error || '할일 삭제에 실패했습니다.')
      }
    } catch (err) {
      alert('서버에 연결할 수 없습니다.')
      console.error('Error deleting todo:', err)
    }
  }

  // 컴포넌트 마운트 시 할일 목록 가져오기
  useEffect(() => {
    fetchTodos()
  }, [])

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>📝 Todo App</h1>
          <p className="subtitle">할일을 관리하세요</p>
        </header>

        {/* 할일 추가 폼 */}
        <form onSubmit={handleAddTodo} className="todo-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="할일 제목을 입력하세요..."
              value={newTodo.title}
              onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
              className="input-title"
            />
            <input
              type="text"
              placeholder="설명 (선택사항)"
              value={newTodo.description}
              onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
              className="input-description"
            />
          </div>
          <button type="submit" className="btn-add">
            추가하기
          </button>
        </form>

        {/* 에러 메시지 */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* 할일 목록 */}
        <div className="todos-container">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : todos.length === 0 ? (
            <div className="empty-state">
              <p>📭 할일이 없습니다.</p>
              <p className="empty-hint">위에서 새로운 할일을 추가해보세요!</p>
            </div>
          ) : (
            <div className="todos-list">
              {todos.map((todo) => (
                <div key={todo._id} className="todo-item">
                  {editingId === todo._id ? (
                    // 수정 모드
                    <div className="edit-mode">
                      <div className="form-group">
                        <input
                          type="text"
                          value={editTodo.title}
                          onChange={(e) => setEditTodo({ ...editTodo, title: e.target.value })}
                          className="input-title"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editTodo.description}
                          onChange={(e) => setEditTodo({ ...editTodo, description: e.target.value })}
                          className="input-description"
                        />
                      </div>
                      <div className="edit-actions">
                        <button
                          onClick={() => handleUpdateTodo(todo._id)}
                          className="btn-save"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="btn-cancel"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <>
                      <div className="todo-content">
                        <h3 className="todo-title">{todo.title}</h3>
                        {todo.description && (
                          <p className="todo-description">{todo.description}</p>
                        )}
                        <span className="todo-date">
                          {new Date(todo.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <div className="todo-actions">
                        <button
                          onClick={() => startEdit(todo)}
                          className="btn-edit"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo._id)}
                          className="btn-delete"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
