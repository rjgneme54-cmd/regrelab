# RegreLab — regresión lineal simple y correlación, paso a paso

Aplicación web educativa (Estadística 2) que resuelve **regresión lineal simple y correlación** mostrando cada fórmula, su reemplazo con los datos y el resultado, como en el pizarrón. Notación y enfoque: Levine, Krehbiel y Berenson, *Estadística para administración* (4.ª ed., cap. 12).

- 100 % en el navegador: sin servidor, sin base de datos, sin cuentas.
- HTML + CSS + JavaScript puro (sin frameworks ni compilación).
- Instalable (PWA) y con funcionamiento **sin conexión**.
- Bibliotecas incluidas en `vendor/` (Chart.js 4.4.7 y KaTeX 0.16.11): no usa CDN.

## Estructura

```
regrelab/
├── index.html          Página principal
├── tests.html          Autoverificación del motor de cálculo (45 pruebas)
├── manifest.json       Manifiesto PWA
├── sw.js               Service worker (funcionamiento sin conexión)
├── css/styles.css
├── js/
│   ├── stats.js        Motor de cálculo: distribuciones t y F, regresión, pruebas, intervalos
│   ├── format.js       Formato argentino (coma decimal, punto de miles) y KaTeX
│   ├── content.js      Glosario, preguntas frecuentes, formulario, precauciones
│   ├── charts.js       Gráficos (Chart.js) y exportación a PNG
│   ├── steps.js        Resolución paso a paso (secciones 5.1 a 5.14)
│   ├── share.js        Enlace compartible, Web Share API, CSV
│   ├── ui.js           Interfaz, validaciones, navegación
│   └── tests.js        Pruebas del ejemplo del apunte
├── icons/              Íconos de la app
└── vendor/             Chart.js y KaTeX (con sus licencias)
```

## Probar en local

Los service workers necesitan `http://localhost` (no funcionan abriendo el archivo con `file://`). Desde la carpeta `regrelab`, con cualquiera de estas opciones:

```bash
npx serve . -l 8765
```

```bash
python -m http.server 8765
```

Luego abre <http://localhost:8765>. La autoverificación está en <http://localhost:8765/tests.html>. Para correr las pruebas desde la terminal:

```bash
node js/tests.js
```

## Publicar gratis en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `regrelab`), público.
2. Sube **el contenido de la carpeta `regrelab`** a la raíz del repositorio (que `index.html` quede en la raíz):

   ```bash
   cd regrelab
   git init
   git add .
   git commit -m "RegreLab: versión inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/regrelab.git
   git push -u origin main
   ```

3. En GitHub: **Settings → Pages → Build and deployment → Source: «Deploy from a branch»**, elige la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. Espera uno o dos minutos. La app quedará en `https://TU-USUARIO.github.io/regrelab/`.
5. Abre esa dirección: en el celular aparece «Agregar a pantalla de inicio» / «Instalar app»; en la PC, el ícono de instalar en la barra de direcciones de Chrome o Edge.

Todas las rutas del proyecto son relativas, así que funciona en un subdirectorio de GitHub Pages sin cambios.

## Publicar gratis en Netlify

- **Arrastrar y soltar:** entra en <https://app.netlify.com/drop> y arrastra la carpeta `regrelab`. Netlify entrega una dirección pública al instante.
- **Desde GitHub:** «Add new site → Import an existing project», elige el repositorio, deja *Build command* vacío y *Publish directory* en `.` (raíz).

## Actualizar la app después de publicarla

El service worker usa «red primero, caché si no hay conexión»: con internet siempre se carga la última versión y sin internet se usa la copia guardada. Si agregas o renombras archivos, actualiza la lista `ASSETS` de `sw.js` y cambia `CACHE` (por ejemplo a `regrelab-v2`).

## Compartir un ejercicio

El botón **Compartir** genera un enlace con los datos y parámetros codificados en la parte `#d=…` de la URL. Quien lo abra ve el mismo ejercicio resuelto. En celulares se usa la Web Share API (WhatsApp, correo, etc.); en PC se copia el enlace. Los datos no se envían a ningún servidor.

**PDF:** el botón «PDF» abre la vista de impresión limpia (con todos los pasos y gráficos desplegados); elige «Guardar como PDF» en el diálogo de impresión. Cada gráfico se descarga como PNG con su botón «⬇ PNG».

## Notas de cálculo

- Los valores críticos y los valores-p se calculan con las distribuciones t de Student y F implementadas a partir de la función beta incompleta regularizada (fracción continua) y la inversión por bisección; funcionan para cualquier grado de libertad y α.
- Se trabaja con precisión completa y se redondea solo al mostrar. El IC de β₁ es la excepción: se arma como a mano, con t y S_b1 redondeados a 4 decimales, y por eso coincide con el apunte ([1,9443 ; 3,0557]). Con toda la precisión daría [1,9442 ; 3,0558]; la tarjeta 5.11 muestra ambos.
- Formato numérico argentino (3.612,5). Se puede escribir con coma o punto; si un número tiene un solo punto y ningún otro separador (por ejemplo `1.234`), se interpreta como decimal.
- Convenciones: un valor de p menor que el último decimal visible se muestra como «< 0,0001»; en pruebas de una cola, la prueba F sigue siendo de cola derecha (equivale a la bilateral).

## Licencias de terceros

Chart.js (MIT) y KaTeX (MIT) se distribuyen dentro de `vendor/` junto con sus licencias.
