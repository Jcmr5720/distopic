import { FormEvent, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Error registering')
      return
    }
    // create record in usuarios
    const userId = data.user.id
    const { error: usuarioError } = await supabase.from('usuarios').insert({ id: userId, nombre: username })
    if (usuarioError) {
      setError(usuarioError.message)
      return
    }
    // create recursos_usuario
    const { error: recursosError } = await supabase.from('recursos_usuario').insert({
      usuario_id: userId,
      chrono_polvo: 1000,
      cristal_etereo: 1000,
    })
    if (recursosError) {
      setError(recursosError.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="container mt-5">
      <h2>Registro</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="needs-validation" noValidate>
        <div className="mb-3">
          <label className="form-label">Nombre de usuario</label>
          <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Correo</label>
          <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary">Registrarse</button>
      </form>
    </div>
  )
}
