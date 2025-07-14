import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Login.css'

interface LoginForm {
  correo: string
  clave: string
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginForm>({ correo: '', clave: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    if (!form.correo) return 'El correo es obligatorio.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) return 'Correo inválido.'
    if (!form.clave) return 'La contraseña es obligatoria.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.correo,
        password: form.clave,
      })
      if (signInError) throw new Error(signInError.message)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <h1>Iniciar Sesión</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Correo electrónico
          <input
            type="email"
            name="correo"
            value={form.correo}
            onChange={handleChange}
            disabled={loading}
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            name="clave"
            value={form.clave}
            onChange={handleChange}
            disabled={loading}
          />
        </label>

        {error && <div className="message error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Iniciar Sesión'}
        </button>
      </form>
      <p className="link-register">
        ¿No tienes cuenta? <a href="/register">Regístrate</a>
      </p>
      <p className="forgot-link">
        <a href="/forgot">¿Olvidaste tu contraseña?</a>
      </p>
    </div>
  )
}
