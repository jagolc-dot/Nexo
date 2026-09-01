export interface Negocio {
  id: string
  nombre: string
  tipo: string | null
  tema: string | null
  logo_url: string | null
  usa_variantes: boolean
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

export type Unidad = 'Pieza' | 'Caja' | 'Paquete' | 'Par' | 'Juego' | 'Gramo' | 'Kilogramo' | 'Mililitro' | 'Litro' | 'Metro'

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
  codigo: string | null
  unidad: Unidad | null
  activo: boolean
  categorias_item: { nombre: string } | null
}

export interface VarianteItem {
  id: string
  item_id: string
  color: string | null
  talla: string | null
  codigo: string | null
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

export interface Almacen {
  id: string
  negocio_id: string
  nombre: string
  activo: boolean
}

export type TipoMovimiento = 'compra' | 'venta' | 'ajuste' | 'cancelacion_venta' | 'cancelacion_compra' | 'recosteo'

export interface MovimientoInventario {
  id: string
  almacen_id: string
  item_id: string | null
  variante_id: string | null
  tipo: TipoMovimiento
  cantidad: number
  costo_unitario: number
  existencia_resultante: number
  costo_promedio_resultante: number
  referencia_id: string | null
  fecha: string
}

export type EstadoCompra = 'confirmada' | 'cancelada'

export interface Compra {
  id: string
  negocio_id: string
  almacen_id: string
  proveedor: string | null
  folio: string | null
  fecha: string
  notas: string | null
  subtotal: number
  costo_envio: number
  total: number
  estado: EstadoCompra
}

export interface CompraPartida {
  id: string
  compra_id: string
  item_id: string | null
  variante_id: string | null
  cantidad: number
  costo_total_partida: number
  costo_unitario: number
  flete_asignado: number
  costo_unitario_final: number
}

export type TipoAjuste = 'merma' | 'caducidad' | 'perdida' | 'obsequio' | 'uso_interno' | 'ajuste_conteo'

export interface AjusteInventario {
  id: string
  almacen_id: string
  item_id: string | null
  variante_id: string | null
  tipo: TipoAjuste
  cantidad: number
  motivo: string
  fecha: string
}
