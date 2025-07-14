import { type FormEvent, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import '../auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!usernameRegex.test(username)) {
      setError('Nombre de usuario inválido')
      return
    }
    if (!emailRegex.test(email)) {
      setError('Correo electrónico inválido')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Error registering')
      setLoading(false)
      return
    }
    const userId = data.user.id
    const { error: usuarioError } = await supabase.from('usuarios').insert({
      id: userId,
      nombre_usuario: username,
      correo: email,
      clave: password,
    })
    if (usuarioError) {
      setError(usuarioError.message)
      setLoading(false)
      return
    }
    const { error: recursosError } = await supabase.from('recursos_usuario').insert({
      usuario_id: userId,
      chrono_polvo: 1000,
      cristal_etereo: 1000,
    })
    if (recursosError) {
      setError(recursosError.message)
      setLoading(false)
      return
    }
    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <div className="auth-container">
      <h2 className="auth-title">Registro</h2>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label>Nombre de usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="auth-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
          <Link to="/login">Inicia sesión</Link>
        </div>
      </form>
    </div>
  )
}