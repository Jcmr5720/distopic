import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'

interface Fabrica {
  usuario_id: string
  tipo_recurso: string
  nivel: number
  ultima_recogida: string
  inicio_mejora: string | null
}

interface GeneracionConfig {
  tipo_recurso: string
  nivel: number
  generacion_por_minuto: number
}

interface MejoraConfig {
  tipo_recurso: string
  nivel_destino: number
  tiempo_mejora_segundos: number
  costo_chrono_polvo: number
  costo_cristal_etereo: number
  costo_combustible_singularidad: number
  costo_nucleos_potencia: number
  costo_creditos_galacticos: number
  costo_sustancia_x: number
}

export default function RecursosModule() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recursos, setRecursos] = useState<Record<string, number>>({})
  const [fabricas, setFabricas] = useState<Fabrica[]>([])
  const [genConfig, setGenConfig] = useState<GeneracionConfig[]>([])
  const [mejoraConfig, setMejoraConfig] = useState<MejoraConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Fabrica | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadData()
    const interval = setInterval(() => {
      updateGenerated()
    }, 5000)
    return () => clearInterval(interval)
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const { data: rec } = await supabase
      .from('recursos_usuario')
      .select('*')
      .eq('usuario_id', user.id)
      .single()
    setRecursos(rec || {})

    const { data: fab } = await supabase
      .from('fabricas_usuario')
      .select('*')
      .eq('usuario_id', user.id)
    setFabricas(fab || [])

    const { data: conf } = await supabase
      .from('configuracion_fabricas')
      .select('*')
    setGenConfig(conf || [])

    const { data: confM } = await supabase.from('mejora_fabricas_config').select('*')
    setMejoraConfig(confM || [])

    setLoading(false)
  }

  const getRate = (tipo: string, nivel: number) => {
    const cfg = genConfig.find((c) => c.tipo_recurso === tipo && c.nivel === nivel)
    return cfg?.generacion_por_minuto ?? 0
  }

  const calculateGenerated = (f: Fabrica) => {
    const rate = getRate(f.tipo_recurso, f.nivel)
    const seconds = (Date.now() - new Date(f.ultima_recogida).getTime()) / 1000
    return Math.floor((seconds / 60) * rate)
  }

  const updateGenerated = () => {
    setFabricas((prev) => [...prev])
  }

  const handleCollect = async (tipo: string) => {
    if (!user) return
    const { error: err } = await supabase.rpc('actualizar_recursos_generados', {
      usuario_id: user.id,
      tipo_recurso: tipo,
    })
    if (err) setError(err.message)
    await loadData()
  }

  const timeLeft = (f: Fabrica) => {
    if (!f.inicio_mejora) return 0
    const cfg = mejoraConfig.find(
      (c) => c.tipo_recurso === f.tipo_recurso && c.nivel_destino === f.nivel + 1
    )
    if (!cfg) return 0
    const end = new Date(f.inicio_mejora).getTime() + cfg.tiempo_mejora_segundos * 1000
    return Math.max(0, Math.ceil((end - Date.now()) / 1000))
  }

  const iniciarMejora = async () => {
    if (!modal || !user) return
    const { error: err } = await supabase.rpc('iniciar_mejora_fabrica', {
      usuario_id: user.id,
      tipo_recurso: modal.tipo_recurso,
    })
    if (err) setError(err.message)
    setModal(null)
    await loadData()
  }

  const completarMejora = async (f: Fabrica) => {
    if (!user) return
    const { error: err } = await supabase.rpc('completar_mejora_fabrica', {
      usuario_id: user.id,
      tipo_recurso: f.tipo_recurso,
    })
    if (err) setError(err.message)
    await loadData()
  }

  if (!user) return null

  return (
    <div className="container mt-4">
      <h2>Recursos</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-3 g-4 mb-4">
            {Object.entries(recursos).map(([k, v]) =>
              k !== 'usuario_id' ? (
                <div className="col" key={k}>
                  <div className="card h-100 text-center">
                    <div className="card-body">
                      <h5 className="card-title text-capitalize">{k.replace('_', ' ')}</h5>
                      <p className="card-text">{v}</p>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
          <table className="table table-dark table-striped">
            <thead>
              <tr>
                <th>Fábrica</th>
                <th>Nivel</th>
                <th>Generado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fabricas.map((f) => (
                <tr key={f.tipo_recurso}>
                  <td className="text-capitalize">{f.tipo_recurso.replace('_', ' ')}</td>
                  <td>{f.nivel}</td>
                  <td>{calculateGenerated(f)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary me-2"
                      onClick={() => handleCollect(f.tipo_recurso)}
                    >
                      Recoger
                    </button>
                    {f.inicio_mejora ? (
                      <>
                        <span className="me-2">{timeLeft(f)}s</span>
                        {timeLeft(f) === 0 && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => completarMejora(f)}
                          >
                            Completar
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setModal(f)}
                      >
                        Mejorar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {modal && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content text-dark">
              <div className="modal-header">
                <h5 className="modal-title">Mejorar {modal.tipo_recurso}</h5>
                <button type="button" className="btn-close" onClick={() => setModal(null)}></button>
              </div>
              <div className="modal-body">
                {(() => {
                  const cfg = mejoraConfig.find(
                    (c) =>
                      c.tipo_recurso === modal.tipo_recurso &&
                      c.nivel_destino === modal.nivel + 1
                  )
                  if (!cfg) return <p>No hay mejora disponible</p>
                  return (
                    <ul>
                      <li>Nivel destino: {cfg.nivel_destino}</li>
                      <li>Tiempo: {cfg.tiempo_mejora_segundos}s</li>
                      <li>Costo chrono polvo: {cfg.costo_chrono_polvo}</li>
                      <li>Costo cristal etereo: {cfg.costo_cristal_etereo}</li>
                      <li>Costo combustible singularidad: {cfg.costo_combustible_singularidad}</li>
                      <li>Costo nucleos potencia: {cfg.costo_nucleos_potencia}</li>
                      <li>Costo creditos galacticos: {cfg.costo_creditos_galacticos}</li>
                      <li>Costo sustancia x: {cfg.costo_sustancia_x}</li>
                    </ul>
                  )
                })()}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={iniciarMejora}>
                  Iniciar Mejora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
