# RegreLab — regresión lineal simple y correlación, paso a paso

Creada por **Prof. Neme Gastón**. Aplicación web educativa (Estadística 2) que resuelve **regresión lineal simple y correlación** mostrando cada fórmula, su reemplazo con los datos y el resultado, como en el pizarrón. Notación y enfoque: Levine, Krehbiel y Berenson, *Estadística para administración* (4.ª ed., cap. 12).

- 100 % en el navegador: sin servidor, sin base de datos, sin cuentas.
- HTML + CSS + JavaScript puro (sin frameworks ni compilación).
- Instalable (PWA) y con funcionamiento **sin conexión**.
- **Modo práctica:** ejercicios con datos generados al azar en tres niveles (la recta; variación y ajuste; inferencia). El estudiante calcula a mano, la app corrige con tolerancia de redondeo, da pistas y muestra la solución paso a paso. Cada ejercicio tiene un número: el enlace «Compartir este ejercicio» (`#p=12345.2`) abre exactamente el mismo ejercicio en otro dispositivo, útil para asignarlo en clase.
- **Ejercicio sin resolver para compartir:** el docente carga sus datos, pulsa «Crear ejercicio con mis datos» (en «Práctica», o desde «Compartir»), elige título, enunciado, nivel y qué preguntas deben calcular los estudiantes, y copia el enlace (`#e=…`). El estudiante lo abre, ve solo el enunciado, los datos y las preguntas, calcula a mano y comprueba sus resultados; con «Copiar mi resultado para entregar» obtiene un texto con su nombre, la fecha, los aciertos y sus respuestas. El docente puede desactivar las respuestas y la solución paso a paso. **Aviso:** al funcionar todo en el navegador, no es un examen seguro; sirve para práctica y tareas.
- **Código QR** para pasar un ejercicio en el aula sin escribir direcciones: se genera sin conexión y se puede proyectar a pantalla completa o descargar como imagen. Está en el creador de ejercicios, en «Compartir» (QR del ejercicio resuelto y QR para abrir la app), en «Práctica» y en el pizarrón (tecla `Q`). Se dibuja siempre en negro sobre blanco, que es lo que mejor leen las cámaras. Si el enlace es muy largo el código queda denso (la app avisa) y a partir de unos 2.300 caracteres ya no entra: en ese caso conviene reducir la cantidad de datos.
- **Modo pizarrón** (botón «Pizarrón» en «Resultados», o el ícono de cada sección): presentación a pantalla completa para proyectar en clase. Una diapositiva por paso, letra grande, pizarra oscura o fondo claro, y revelado progresivo en cada cálculo (primero la fórmula, luego el reemplazo y al final el resultado). Atajos: `→` / `Espacio` / `Re Pág` avanzan (también sirve un control remoto de presentaciones), `←` retrocede, `A` muestra todo el paso, `I` abre el índice, `T` cambia el tema, `+` y `-` cambian el tamaño, `F` pantalla completa, `Esc` sale. En pantallas táctiles se cambia deslizando.
- **Excluir un punto y recalcular** (tarjeta 5.15): el estudiante marca puntos, ve la recta con y sin ellos en el mismo gráfico y compara b₁, r², la prueba t y la decisión. Señala el punto más influyente y advierte que solo se debe excluir un dato con una razón concreta. Se puede llevar el cambio a la tabla de datos.
- **Seis ejemplos precargados** (botón «Más ejemplos»): el del apunte, pendiente negativa con prueba de cola izquierda, un valor atípico, extrapolación con serie de tiempo (Durbin-Watson), relación débil que no rechaza H₀ y una relación curva con r = 0.
- Bibliotecas incluidas en `vendor/` (Chart.js 4.4.7 y KaTeX 0.16.11): no usa CDN.

## Estructura

```
regrelab/
├── index.html          Página principal
├── tests.html          Autoverificación del motor de cálculo y del generador de ejercicios (79 pruebas)
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
│   ├── icons.js        Íconos de línea (SVG)
│   ├── exercises.js    Generador, corrector y ejercicios asignados del modo práctica
│   ├── influence.js    Excluir puntos y comparar (tarjeta 5.15)
│   ├── qr.js           Código QR (dibujo en SVG y diálogo)
│   ├── practice.js     Pantalla del modo práctica
│   ├── board.js        Modo pizarrón (presentación para proyectar)
│   ├── ui.js           Interfaz, validaciones, navegación
│   └── tests.js        Pruebas del ejemplo del apunte
├── icons/              Íconos de la app
└── vendor/             Chart.js, KaTeX, qrcode-generator y tipografías Newsreader / IBM Plex (con sus licencias)
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
   git remote add origin https://github.com/rjgneme54-cmd/regrelab.git
   git push -u origin main
   ```

3. En GitHub: **Settings → Pages → Build and deployment → Source: «Deploy from a branch»**, elige la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. Espera uno o dos minutos. La app quedará en `https://rjgneme54-cmd.github.io/regrelab/`.
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

Chart.js (MIT), KaTeX (MIT), qrcode-generator (MIT) y las tipografías Newsreader e IBM Plex (SIL Open Font License) se distribuyen dentro de `vendor/` junto con sus licencias.
