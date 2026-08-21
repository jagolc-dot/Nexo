import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RutaProtegida, RequiereNegocioActivo } from './components/RutaProtegida'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { SelectorNegocioPage } from './pages/SelectorNegocioPage'
import { SinAccesoPage } from './pages/SinAccesoPage'
import { DashboardPage } from './pages/DashboardPage'
import { CatalogoPage } from './pages/CatalogoPage'
import { ItemFormPage } from './pages/ItemFormPage'
import { ItemDetallePage } from './pages/ItemDetallePage'
import { VentaNuevaPage } from './pages/VentaNuevaPage'
import { VentasHistorialPage } from './pages/VentasHistorialPage'
import { VentaDetallePage } from './pages/VentaDetallePage'
import { AgendaPage } from './pages/AgendaPage'
import { FinalizarCitaPage } from './pages/FinalizarCitaPage'
import { ClientesPage } from './pages/ClientesPage'
import { ClienteFormPage } from './pages/ClienteFormPage'
import { ClienteDetallePage } from './pages/ClienteDetallePage'
import { GastosPage } from './pages/GastosPage'
import { GastoFormPage } from './pages/GastoFormPage'
import { TiposGastoPage } from './pages/TiposGastoPage'
import { ReportesPage } from './pages/ReportesPage'
import { AdminUsuariosPage } from './pages/AdminUsuariosPage'
import { AdminCrearUsuarioPage } from './pages/AdminCrearUsuarioPage'
import { CategoriasPage } from './pages/CategoriasPage'
import { AjustesPage } from './pages/AjustesPage'
import { AlmacenesPage } from './pages/inventario/AlmacenesPage'
import { AlmacenDetallePage } from './pages/inventario/AlmacenDetallePage'
import { KardexProductoPage } from './pages/inventario/KardexProductoPage'
import { ComprasPage } from './pages/inventario/ComprasPage'
import { CompraFormPage } from './pages/inventario/CompraFormPage'
import { CompraDetallePage } from './pages/inventario/CompraDetallePage'
import { AjusteFormPage } from './pages/inventario/AjusteFormPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RutaProtegida />}>
            <Route path="/selector" element={<SelectorNegocioPage />} />
            <Route path="/sin-acceso" element={<SinAccesoPage />} />

            <Route element={<RequiereNegocioActivo />}>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/catalogo" element={<CatalogoPage />} />
                <Route path="/catalogo/nuevo" element={<ItemFormPage />} />
                <Route path="/catalogo/categorias" element={<CategoriasPage />} />
                <Route path="/catalogo/:id" element={<ItemDetallePage />} />
                <Route path="/catalogo/:id/editar" element={<ItemFormPage />} />
                <Route path="/inventario" element={<AlmacenesPage />} />
                <Route path="/inventario/almacenes/:id" element={<AlmacenDetallePage />} />
                <Route path="/inventario/productos/:itemId" element={<KardexProductoPage />} />
                <Route path="/inventario/productos/:itemId/variantes/:varianteId" element={<KardexProductoPage />} />
                <Route path="/inventario/compras" element={<ComprasPage />} />
                <Route path="/inventario/compras/nueva" element={<CompraFormPage />} />
                <Route path="/inventario/compras/:id" element={<CompraDetallePage />} />
                <Route path="/inventario/ajuste" element={<AjusteFormPage />} />
                <Route path="/ventas" element={<VentasHistorialPage />} />
                <Route path="/ventas/nueva" element={<VentaNuevaPage />} />
                <Route path="/ventas/:id" element={<VentaDetallePage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/agenda/:id/finalizar" element={<FinalizarCitaPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
                <Route path="/clientes/:id" element={<ClienteDetallePage />} />
                <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
                <Route path="/gastos" element={<GastosPage />} />
                <Route path="/gastos/nuevo" element={<GastoFormPage />} />
                <Route path="/gastos/tipos" element={<TiposGastoPage />} />
                <Route path="/reportes" element={<ReportesPage />} />
                <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
                <Route path="/admin/usuarios/nuevo" element={<AdminCrearUsuarioPage />} />
                <Route path="/ajustes" element={<AjustesPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
