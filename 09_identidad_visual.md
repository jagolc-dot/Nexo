# Etapa 9 — Identidad Visual y Sistema de Diseño

> **Esta etapa se aplica retroactivamente.** La Etapa 2 (Autenticación) ya se construyó sin diseño definido; debe re-estilizarse con lo que aquí se especifica. De la Etapa 3 en adelante, todo se construye directamente con este sistema.

## Nombre del sistema
**Nexo**. Aparece en el login, en la barra de navegación y como monograma "N" en un círculo relleno con el color primario del tema activo.

## Arquitectura de temas — punto crítico de implementación

El sistema **cambia de piel completa según el negocio activo**. Esto NO debe implementarse con condicionales por negocio en el código (`if negocio == 'uñas'`), porque eso obligaría a tocar código cada vez que se dé de alta un negocio nuevo.

**Implementación correcta:** el tema es un **dato del negocio** (columna `negocios.tema`), y los colores se aplican vía **variables CSS** que se reasignan al cambiar de negocio activo. Un negocio nuevo solo necesita que se registre su tema; si no tiene uno asignado, usa el tema `neutro` por default.

## Temas definidos
- `boutique` — Glam Nails by Chio (terracota rosado, dorado, verde salvia)
- `sastreria` — Don camisa (azul pizarra, dorado envejecido, gris frío)
- `neutro` — default para negocios sin tema asignado (azul marino corporativo)

## Colores de estado
No se tematizan: éxito, advertencia, error son iguales en todos los temas.

## Componentes
Botones (primario/secundario/destructivo/deshabilitado), tarjetas/superficies, selección activa, tipografía — ver detalle completo en el script original.

## Diseño responsivo
Mobile-first, obligatorio. Áreas táctiles mínimo 44×44px, sin tablas de scroll horizontal.

## Estado
Implementado en `app/`:

- **Variables CSS** en `src/index.css`, con selectores `:root[data-tema="boutique"|"sastreria"|"neutro"]`. `NegocioContext` fija el atributo `data-tema` del `<html>` según `negocioActivo.tema` (default `neutro` si no hay negocio activo, ej. en `/login`), y lo resetea a `neutro` al cerrar sesión.
- **Componentes compartidos**: `src/components/ui/Button.tsx` (primario/secundario/destructivo, deshabilitado), `Card.tsx` (superficie/métrica), `EstadoBadge.tsx` (éxito/advertencia/error/neutral — neutral es una extensión mía para estados como "Inactivo" que no son ninguno de los tres semánticos del documento), `Logo.tsx` (monograma "N").
- **Rebranding**: título del navegador y encabezado de login ahora dicen "Nexo"; el logo propio de cada negocio (`negocios.logo_url`) se muestra junto al nombre del negocio en la barra de navegación cuando existe (columna ya creada, sin UI para subirlo todavía — no había especificación de cómo).
- **Todas las pantallas construidas en las Etapas 2–8 fueron re-estilizadas** con el sistema de temas (colores vía variables CSS, botones/tarjetas/badges con los componentes compartidos).
- **Decisión de diseño:** el documento no menciona modo oscuro y define una sola paleta por tema (con fondos claros). Se implementó como un look fijo por tema, sin variante oscura — las pantallas ya no responden a `prefers-color-scheme` como antes.
- Verificado: compila sin errores de TypeScript, la app carga y el login se ve con el tema `neutro` (azul marino) como se esperaba. **Pendiente de confirmar visualmente por Joel**: que el tema cambie correctamente a `boutique` (Glam Nails by Chio) y `sastreria` (Don camisa) al iniciar sesión y cambiar de negocio — no pude probarlo yo mismo porque no puedo escribir contraseñas.
