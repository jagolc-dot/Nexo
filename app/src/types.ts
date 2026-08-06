export interface Negocio {
  id: string
  nombre: string
  tipo: string | null
  tema: string | null
  logo_url: string | null
}

export interface AccesoNegocio {
  negocio: Negocio
  rol: string
}

export type TipoItem = 'servicio' | 'producto'

export interface CategoriaItem {
  id: string
  negocio_id: string
  nombre: string
  tipo: TipoItem
  orden: number
  activo: boolean
}

export interface Item {
  id: string
  negocio_id: string
  nombre: string
  tipo: TipoItem
  categoria_id: string | null
  requiere_agenda: boolean
  tiene_variantes: boolean
  precio_base: number | null
  duracion_minutos: number | null
  costo: number | null
  costo_promedio: number
  stock: number
  activo: boolean
  categorias_item: { nombre: string } | null
}

export interface VarianteItem {
  id: string
  item_id: string
  color: string | null
  talla: string | null
  precio: number | null
  costo_promedio: number
  existencia: number
  activo: boolean
}

export interface Cliente {
  id: string
  negocio_id: string
  nombre: string
  telefono: string | null
  contacto_red_social: string | null
  notas: string | null
  activo: boolean
  creado_en: string
}

export interface Empleada {
  id: string
  negocio_id: string
  nombre: string
  usuario_id: string | null
  activo: boolean
}

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

export interface LineaVenta {
  item_id: string
  item_nombre: string
  variante_id: string | null
  variante_descripcion: string | null
  cantidad: number
  precio_unitario: number
  costo_unitario: number
}

export type EstadoVenta = 'confirmada' | 'cancelada'

export interface Venta {
  id: string
  negocio_id: string
  cliente_id: string | null
  nombre_ocasional: string | null
  fecha: string
  total: number
  metodo_pago: MetodoPago
  estado: EstadoVenta
  clientes: { nombre: string } | null
}

export type Categoria = 'Insumos' | 'Renta' | 'Servicios' | 'Nómina' | 'Publicidad' | 'Otros'

export interface TipoGasto {
  id: string
  negocio_id: string
  nombre: string
  categoria: Categoria
  activo: boolean
}

export type EstadoGasto = 'activo' | 'cancelado'

export interface Gasto {
  id: string
  negocio_id: string
  tipo_gasto_id: string | null
  categoria: Categoria
  descripcion: string | null
  monto: number
  fecha_gasto: string
  fecha_registro: string
  estado: EstadoGasto
  tipos_gasto: { nombre: string } | null
}
