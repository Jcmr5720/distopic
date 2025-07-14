import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Register.css'

interface RegisterForm {
  nombre_usuario: string
  correo: string
  clave: string
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterForm>({
    nombre_usuario: '',
    correo: '',
    clave: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.nombre_usuario.trim()) {
      return 'El nombre de usuario es obligatorio.'
    }
    if (!emailRegex.test(form.correo)) {
      return 'Formato de correo inválido.'
    }
    if (form.clave.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.'
    }
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.correo,
        password: form.clave,
      })
      if (signUpError || !data.user) {
        throw new Error(signUpError?.message ?? 'No se pudo registrar')
      }
      const userId = data.user.id
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert({ id: userId, nombre_usuario: form.nombre_usuario })
      if (usuarioError) throw new Error(usuarioError.message)
      const { error: recursosError } = await supabase
        .from('recursos_usuario')
        .insert({ usuario_id: userId })
      if (recursosError) throw new Error(recursosError.message)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <h1>Crear cuenta</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Nombre de usuario
          <input
            type="text"
            name="nombre_usuario"
            value={form.nombre_usuario}
            onChange={handleChange}
            disabled={loading}
          />
        </label>

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
        {success && <div className="message success">¡Registro exitoso!</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Registrarse'}
        </button>
      </form>
      <p className="link-login">
        ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
      </p>
    </div>
  )
}
