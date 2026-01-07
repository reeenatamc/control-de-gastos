# Sistema de Control de Gastos

Un sistema web simple y fácil de usar para el control de ingresos y gastos personales.

## Características

- **Dashboard Principal**: Visualiza resúmenes de ingresos, gastos y balance
- **Billetera de Gastos**: Lista completa de todas las transacciones con filtros
- **Configuración**: Gestión de categorías personalizadas y datos
- **Gráficos**: Visualización de gastos por categoría
- **Almacenamiento Local**: Los datos se guardan en el navegador
- **Exportar/Importar**: Respaldo y restauración de datos en formato JSON

## Datos de Transacción

Cada transacción incluye:
- **Tipo**: Ingreso o Gasto
- **Fecha**: Fecha de la transacción
- **Valor**: Monto de la transacción
- **Categoría**: Categoría personalizable
- **Descripción**: Descripción detallada

## Cómo Usar

1. Abre `index.html` en tu navegador web
2. Agrega categorías desde la sección de Configuración (se incluyen categorías por defecto)
3. Registra tus transacciones desde el Dashboard o la Billetera
4. Visualiza tus estadísticas en el Dashboard
5. Filtra y busca transacciones en la Billetera
6. Exporta tus datos como respaldo desde Configuración

## Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)
- LocalStorage para persistencia de datos

## Categorías por Defecto

- Alimentación
- Transporte
- Entretenimiento
- Servicios
- Salud
- Educación
- Salario
- Otros

## Instalación

No requiere instalación. Simplemente abre el archivo `index.html` en cualquier navegador moderno.

## Gestión de Datos

- **Exportar**: Descarga tus datos en formato JSON
- **Importar**: Restaura datos desde un archivo JSON previamente exportado
- **Borrar**: Elimina todos los datos (irreversible)

## Compatibilidad

Compatible con todos los navegadores modernos que soportan:
- LocalStorage
- ES6 JavaScript
- CSS Grid y Flexbox