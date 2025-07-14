import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

interface Recursos {
  chrono_polvo: number
  cristal_etereo: number
  combustible_singularidad?: number
  [key: string]: any
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recursos, setRecursos] = useState<Recursos | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else {
      supabase
        .from('recursos_usuario')
        .select('*')
        .eq('usuario_id', user.id)
        .single()
        .then(({ data }) => {
          setRecursos(data as Recursos)
        })
    }
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="d-flex">
      <aside className="p-3 bg-dark text-white" style={{ minWidth: '200px' }}>
        <ul className="nav flex-column">
          <li className="nav-item">
            <button className="btn btn-link text-start text-white" onClick={() => navigate('/dashboard')}>Inicio</button>
          </li>
          <li className="nav-item">
            <button className="btn btn-link text-start text-white" onClick={() => navigate('/recursos')}>Recursos</button>
          </li>
        </ul>
      </aside>
      <main className="flex-grow-1 p-4">
        <h2>Dashboard</h2>
        {recursos ? (
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {Object.entries(recursos).map(([key, value]) =>
              key !== 'usuario_id' ? (
                <div className="col" key={key}>
                  <div className="card h-100 text-center">
                    <div className="card-body">
                      <h5 className="card-title text-capitalize">{key.replace('_', ' ')}</h5>
                      <p className="card-text">{value}</p>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <p>Cargando...</p>
        )}
      </main>
    </div>
  )
}
