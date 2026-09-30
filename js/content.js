const Content = (function () {
  'use strict';

  const siglas = [
    { k: 'SS', name: 'Suma de cuadrados', read: '«ese-ese»', mean: 'Viene de Sum of Squares. Es una suma de distancias elevadas al cuadrado; mide cuánta variación hay.' },
    { k: 'MS', name: 'Media cuadrada', read: '«eme-ese»', mean: 'Viene de Mean Square. Es una suma de cuadrados dividida por sus grados de libertad (un promedio de cuadrados).' },
    { k: 'SST', name: 'Suma de cuadrados total', read: '«ese-ese-te»', mean: 'Variación total de Y: qué tan lejos están los valores de Y de su media Ȳ. SST = Σ(Y − Ȳ)². Se dibuja en violeta.' },
    { k: 'SSR', name: 'Suma de cuadrados de la regresión', read: '«ese-ese-erre»', mean: 'Parte de la variación de Y que explica la recta: distancia de Ŷ a Ȳ. SSR = Σ(Ŷ − Ȳ)². Se dibuja en azul.' },
    { k: 'SSE', name: 'Suma de cuadrados del error', read: '«ese-ese-e»', mean: 'Parte de la variación que la recta NO explica: distancia de cada Y a la recta. SSE = Σ(Y − Ŷ)². Se dibuja en rojo.' },
    { k: 'SSX', name: 'Suma de cuadrados de X', read: '«ese-ese-equis»', mean: 'Variación de X respecto de su media: Σ(X − X̄)². No es el desvío estándar: todavía falta dividir por (n − 1) y sacar la raíz.' },
    { k: 'SSXY', name: 'Suma de productos cruzados', read: '«ese-ese-equis-ye»', mean: 'Mide cómo varían juntas X e Y: Σ(X − X̄)(Y − Ȳ). Su signo es el signo de la pendiente.' },
    { k: 'MSR', name: 'Media cuadrada de la regresión', read: '«eme-ese-erre»', mean: 'MSR = SSR / k, con k = 1 variable explicativa. En regresión simple, MSR = SSR.' },
    { k: 'MSE', name: 'Media cuadrada del error', read: '«eme-ese-e»', mean: 'MSE = SSE / (n − 2). Es la varianza de los residuos; su raíz es S_YX.' },
    { k: 'S_YX', name: 'Error estándar de la estimación', read: '«ese sub ye-equis»', mean: 'S_YX = √(SSE/(n − 2)). Tamaño típico del error al predecir Y con la recta, en las unidades de Y.' },
    { k: 'S_b1', name: 'Error estándar de la pendiente', read: '«ese sub be-uno»', mean: 'S_b1 = S_YX/√SSX. Mide cuánto podría variar b₁ de una muestra a otra: cuanto menor, más precisa la pendiente.' },
    { k: 'ANOVA', name: 'Análisis de varianza', read: '«anova»', mean: 'Tabla que reparte la variación total (SST) en la explicada (SSR) y la no explicada (SSE) para hacer la prueba F.' },
    { k: 'gl', name: 'Grados de libertad', read: '«ge-ele»', mean: 'Cantidad de datos que pueden variar libremente. En regresión simple: gl = n − 2 (porque se estimaron b₀ y b₁).' },
    { k: 'IC', name: 'Intervalo de confianza', read: '«i-ce»', mean: 'Rango de valores plausibles para un parámetro (β₁ o la media de Y) con un nivel de confianza dado, por ejemplo 95 %.' },
    { k: 'IP', name: 'Intervalo de predicción', read: '«i-pe»', mean: 'Rango de valores plausibles para un valor individual de Y en un X dado. Siempre es más ancho que el IC de la media.' },
    { k: 'valor-p', name: 'Valor-p', read: '«valor pe»', mean: 'Probabilidad de obtener un resultado tan extremo como el observado si H₀ fuera verdadera. Si p < α, se rechaza H₀.' },
    { k: 'LINE', name: 'Supuestos de la regresión', read: '«laín»', mean: 'Linealidad, Independencia de los errores, Normalidad de los errores e Igualdad de varianzas (homocedasticidad).' }
  ];

  const simbolos = [
    { tex: 'n', read: 'ene', mean: 'Cantidad de pares de datos (X, Y) de la muestra.' },
    { tex: '\\bar{X},\\ \\bar{Y}', read: 'X barra, Y barra', mean: 'Medias de X y de Y.' },
    { tex: '\\hat{Y}', read: 'Y sombrero', mean: 'Valor de Y predicho (estimado) por la recta para un X dado.' },
    { tex: 'b_0', read: 'be sub cero', mean: 'Ordenada al origen estimada: valor de Ŷ cuando X = 0.' },
    { tex: 'b_1', read: 'be sub uno', mean: 'Pendiente estimada con la muestra: cuánto cambia Ŷ, en promedio, por cada unidad más de X.' },
    { tex: '\\beta_0,\\ \\beta_1', read: 'beta cero, beta uno', mean: 'Ordenada y pendiente reales de la población (desconocidas). b₀ y b₁ son sus estimaciones.' },
    { tex: '\\varepsilon', read: 'épsilon', mean: 'Error aleatorio del modelo poblacional: lo que Y tiene de más o de menos respecto de la recta real.' },
    { tex: 'e', read: 'e (residuo)', mean: 'Residuo observado: e = Y − Ŷ. Es la estimación de ε con los datos.' },
    { tex: 'r', read: 'erre', mean: 'Coeficiente de correlación de la muestra, entre −1 y +1.' },
    { tex: 'r^2', read: 'erre cuadrado', mean: 'Coeficiente de determinación: proporción de la variación de Y explicada por X (entre 0 y 1).' },
    { tex: '\\rho', read: 'ro', mean: 'Coeficiente de correlación de la población (desconocido). r es su estimación.' },
    { tex: '\\Sigma', read: 'sigma mayúscula', mean: 'Suma de todos los valores: ΣX es la suma de los n valores de X.' },
    { tex: '\\alpha', read: 'alfa', mean: 'Nivel de significancia: probabilidad máxima aceptada de rechazar H₀ cuando es verdadera (error tipo I).' },
    { tex: 'H_0,\\ H_1', read: 'hache cero, hache uno', mean: 'Hipótesis nula (no hay relación lineal) e hipótesis alternativa (sí la hay).' },
    { tex: 't', read: 'te', mean: 'Estadístico de la distribución t de Student (con n − 2 gl en regresión simple).' },
    { tex: 'F', read: 'efe', mean: 'Estadístico de la distribución F: cociente MSR/MSE.' },
    { tex: 'k', read: 'ka', mean: 'Cantidad de variables explicativas. En regresión simple, k = 1.' },
    { tex: 'h', read: 'hache', mean: 'Medida de distancia de X al centro de los datos: h = 1/n + (X − X̄)²/SSX. Aparece en los intervalos de IC y IP.' }
  ];

  const tips = {};
  siglas.forEach(s => { tips[s.k] = s.name + ': ' + s.mean; });

  const faq = [
    ['¿Cuál es X y cuál es Y?', 'X es la variable **independiente** o explicativa: la que se conoce y sirve para predecir. Y es la variable **dependiente** o respuesta: la que se quiere predecir.\n\nUna pregunta útil: «¿qué quiero predecir?». Eso es Y. En el ejemplo del apunte, la publicidad (X) se usa para predecir las ventas (Y).'],
    ['Diferencia entre $b_1$ y $\\beta_1$', '$\\beta_1$ es la pendiente **real de la población**: un número fijo y desconocido. $b_1$ es la pendiente **calculada con la muestra**: una estimación de $\\beta_1$ que cambiaría si se tomara otra muestra.\n\nLas pruebas de hipótesis y los intervalos de confianza sirven justamente para sacar conclusiones sobre $\\beta_1$ a partir de $b_1$.'],
    ['Diferencia entre SSX y SST', 'Las dos son sumas de cuadrados respecto de una media, pero de **variables distintas**: SSX = Σ(X − X̄)² mide la variación de X y SST = Σ(Y − Ȳ)² mide la variación de Y.'],
    ['¿SSX es el desvío estándar?', 'No. SSX es solo la suma de cuadrados. Para llegar al desvío estándar falta dividir por $(n-1)$ y sacar la raíz:\n\n$$s_X^2=\\frac{SSX}{n-1}\\qquad s_X=\\sqrt{\\frac{SSX}{n-1}}$$\n\nEn el ejemplo del apunte, SSX = 42 y n = 8, así que $s_X^2 = 42/7 = 6$.'],
    ['¿Por qué SST = SSR + SSE?', 'Cada distancia se puede partir en dos: $(Y-\\bar{Y}) = (\\hat{Y}-\\bar{Y}) + (Y-\\hat{Y})$. Al elevar al cuadrado y sumar, el «doble producto» que aparece vale exactamente cero **cuando la recta se calcula por mínimos cuadrados** (los residuos suman 0 y no se relacionan con Ŷ). Por eso la variación total se reparte sin sobrantes entre lo explicado (SSR) y lo no explicado (SSE).'],
    ['¿Por qué se eleva al cuadrado?', 'Por tres razones: (1) las desviaciones positivas y negativas se cancelarían al sumarlas (Σ(Y − Ȳ) = 0); (2) al cuadrado, los errores grandes pesan mucho más que los pequeños; (3) el cuadrado es una función suave que permite obtener fórmulas exactas para b₀ y b₁.'],
    ['¿Por qué n − 2?', 'Para calcular los residuos hay que estimar antes **dos** parámetros con los mismos datos: b₀ y b₁. Cada parámetro estimado «consume» un grado de libertad, y quedan $n-2$ datos libres. Por eso $MSE = SSE/(n-2)$ y la prueba t usa $n-2$ gl.'],
    ['Diferencia entre S_YX y S_b1', '$S_{YX}$ mide cuánto se **dispersan los puntos alrededor de la recta** (está en las unidades de Y). $S_{b_1}$ mide qué tan **precisa es la pendiente estimada**, es decir, cuánto variaría $b_1$ entre muestras. Se relacionan así: $S_{b_1}=S_{YX}/\\sqrt{SSX}$.'],
    ['Diferencia entre r y r²', '$r$ va de −1 a +1: indica la **dirección** (signo) y la **fuerza** de la relación lineal. $r^2$ va de 0 a 1: es la **proporción de la variación de Y explicada por X**. Por ejemplo, si $r = 0{,}9761$ entonces $r^2=0{,}9528$: la recta explica el 95,28 % de la variación. Como $r^2$ no tiene signo, no dice si la relación es positiva o negativa.'],
    ['¿Un r² alto garantiza un buen modelo?', 'No. Un $r^2$ alto puede darse con una relación en realidad curva, con un valor atípico que «arrastra» la recta o con una correlación casual entre variables sin conexión. Siempre hay que mirar el gráfico de dispersión y el de residuos, y verificar los supuestos.'],
    ['Si r = 0, ¿no hay relación?', 'Solo se puede afirmar que **no hay relación lineal**. Puede existir una relación fuerte pero curva (por ejemplo, en forma de U) con r cercano a 0. Por eso conviene graficar siempre.'],
    ['¿Por qué H₀: β₁ = 0?', 'Si la pendiente real fuera 0, la recta sería horizontal y Y **no dependería linealmente de X**. Se parte de esa postura de «no hay relación» y se busca evidencia suficiente en los datos para rechazarla.'],
    ['«No rechazar» no es «aceptar»', 'Si no se rechaza H₀, solo se concluye que **no hay evidencia suficiente** para afirmar que existe relación lineal. No se demostró que no exista: con pocos datos o mucha dispersión, una relación real puede pasar inadvertida.'],
    ['¿Una cola o dos?', 'Se usan **dos colas** cuando solo interesa saber si hay relación, sin importar su dirección (H₁: β₁ ≠ 0). Se usa **una cola** cuando, antes de mirar los datos, hay una razón teórica para esperar una dirección concreta (H₁: β₁ > 0 o H₁: β₁ < 0). La decisión no debe tomarse después de ver los datos.'],
    ['¿Qué es el valor-p?', 'Es la probabilidad de obtener un estadístico **tan extremo o más** que el observado, si H₀ fuera verdadera. Si el valor-p es menor que α, se rechaza H₀. **No** es la probabilidad de que H₀ sea verdadera.'],
    ['¿Por qué t y F coinciden?', 'En regresión lineal simple, la prueba F y la prueba t de la pendiente responden a la misma pregunta y siempre cumplen $F=t^2$. Además, el F crítico es el cuadrado del t crítico de dos colas y ambas pruebas dan el mismo valor-p.'],
    ['¿Por qué el IP es más ancho que el IC?', 'El IC de la media solo considera la incertidumbre de dónde está la recta ($\\sqrt{h}$). El IP para un valor individual además debe sumar la variabilidad propia de un dato individual alrededor de la recta (el «1» en $\\sqrt{1+h}$). Predecir un caso puntual es más incierto que estimar un promedio.'],
    ['¿Puedo predecir con cualquier X?', 'No. La recta solo es confiable **dentro del rango de X observado** (interpolación). Fuera de ese rango (extrapolación) no se sabe si la relación lineal se mantiene, y los intervalos además se ensanchan. La app avisa cuando el X elegido está fuera del rango.'],
    ['¿Qué significa «mínimos cuadrados»?', 'Es el método que elige, entre todas las rectas posibles, la que hace **mínima la suma de los cuadrados de los residuos** (SSE). Esa recta es la de mejor ajuste y da las fórmulas de $b_0$ y $b_1$.'],
    ['¿Cuándo uso Durbin-Watson?', 'Solo cuando los datos están ordenados en el tiempo (por ejemplo, ventas mensuales). Detecta si los residuos consecutivos se parecen entre sí (autocorrelación), lo que viola el supuesto de independencia. Marca la casilla «los datos están ordenados en el tiempo» para activarlo.']
  ];

  const formulario = [
    { title: 'Sumas y medias', items: [
      ['Medias', '\\bar{X}=\\dfrac{\\sum X}{n}\\qquad \\bar{Y}=\\dfrac{\\sum Y}{n}'],
      ['SSX', 'SSX=\\sum (X-\\bar{X})^2=\\sum X^2-\\dfrac{(\\sum X)^2}{n}'],
      ['SSXY', 'SSXY=\\sum (X-\\bar{X})(Y-\\bar{Y})=\\sum XY-\\dfrac{\\sum X\\sum Y}{n}'],
      ['Varianza y desvío de X', 's_X^2=\\dfrac{SSX}{n-1}\\qquad s_X=\\sqrt{\\dfrac{SSX}{n-1}}']
    ] },
    { title: 'Recta de mínimos cuadrados', items: [
      ['Pendiente', 'b_1=\\dfrac{SSXY}{SSX}'],
      ['Ordenada al origen', 'b_0=\\bar{Y}-b_1\\bar{X}'],
      ['Ecuación de la recta', '\\hat{Y}=b_0+b_1X'],
      ['Otras formas de b₁', 'b_1=\\dfrac{n\\sum XY-\\sum X\\sum Y}{n\\sum X^2-(\\sum X)^2}=r\\,\\dfrac{s_Y}{s_X}=\\dfrac{Cov(X,Y)}{s_X^2}'],
      ['Ecuaciones normales', '\\sum Y=nb_0+b_1\\sum X\\qquad \\sum XY=b_0\\sum X+b_1\\sum X^2']
    ] },
    { title: 'Medidas de variación', items: [
      ['SST', 'SST=\\sum (Y-\\bar{Y})^2=\\sum Y^2-\\dfrac{(\\sum Y)^2}{n}'],
      ['SSR', 'SSR=\\sum (\\hat{Y}-\\bar{Y})^2=b_0\\sum Y+b_1\\sum XY-\\dfrac{(\\sum Y)^2}{n}'],
      ['SSE', 'SSE=\\sum (Y-\\hat{Y})^2=\\sum Y^2-b_0\\sum Y-b_1\\sum XY'],
      ['Descomposición', 'SST=SSR+SSE']
    ] },
    { title: 'Ajuste y correlación', items: [
      ['Coeficiente de determinación', 'r^2=\\dfrac{SSR}{SST}'],
      ['Error estándar de la estimación', 'S_{YX}=\\sqrt{\\dfrac{SSE}{n-2}}'],
      ['Coeficiente de correlación', 'r=\\dfrac{SSXY}{\\sqrt{SSX\\cdot SST}}=\\pm\\sqrt{r^2}']
    ] },
    { title: 'Inferencia sobre la pendiente', items: [
      ['Error estándar de la pendiente', 'S_{b_1}=\\dfrac{S_{YX}}{\\sqrt{SSX}}'],
      ['Prueba t', 't=\\dfrac{b_1-\\beta_1}{S_{b_1}}\\qquad gl=n-2'],
      ['Prueba F', 'F=\\dfrac{MSR}{MSE}=\\dfrac{SSR/1}{SSE/(n-2)}\\qquad F=t^2'],
      ['Intervalo de confianza para β₁', 'b_1\\pm t_{\\alpha/2;\\,n-2}\\,S_{b_1}']
    ] },
    { title: 'Inferencia sobre la correlación', items: [
      ['Prueba t para ρ', 't=\\dfrac{r}{\\sqrt{\\dfrac{1-r^2}{n-2}}}\\qquad gl=n-2']
    ] },
    { title: 'Predicción', items: [
      ['Valor h', 'h=\\dfrac{1}{n}+\\dfrac{(X-\\bar{X})^2}{SSX}'],
      ['IC para la media de Y', '\\hat{Y}\\pm t_{\\alpha/2;\\,n-2}\\,S_{YX}\\sqrt{h}'],
      ['IP para un valor individual', '\\hat{Y}\\pm t_{\\alpha/2;\\,n-2}\\,S_{YX}\\sqrt{1+h}']
    ] },
    { title: 'Residuos', items: [
      ['Residuo', 'e=Y-\\hat{Y}\\qquad \\sum e=0\\qquad \\sum e^2=SSE'],
      ['Durbin-Watson', 'D=\\dfrac{\\sum_{i=2}^{n}(e_i-e_{i-1})^2}{\\sum_{i=1}^{n}e_i^2}']
    ] }
  ];

  const precauciones = [
    ['📈', 'Graficar siempre', 'Antes de calcular, mira el diagrama de dispersión. Un solo número (r, r²) puede ocultar curvas, grupos separados o datos raros que el gráfico muestra de inmediato.'],
    ['✅', 'Verificar los supuestos', 'La recta y las pruebas de hipótesis dependen de LINE: linealidad, independencia, normalidad e igualdad de varianzas. Revisa el gráfico de residuos.'],
    ['🚧', 'No extrapolar', 'Predecir fuera del rango de X observado es riesgoso: no hay datos que aseguren que la relación siga siendo lineal allí.'],
    ['🔗', 'Correlación no implica causalidad', 'Que dos variables se muevan juntas no prueba que una cause a la otra. Puede haber una tercera variable o simple casualidad.'],
    ['⚠️', 'Cuidado con los valores atípicos', 'Un solo punto muy alejado puede cambiar la pendiente y el r². Identifícalo, verifica que no sea un error de carga y analiza el resultado con y sin él.'],
    ['🎯', 'No basarse solo en r²', 'Un r² alto no garantiza un buen modelo, ni uno bajo lo descarta. Complementa siempre con el gráfico, los residuos, S_YX y las pruebas de hipótesis.'],
    ['🔢', 'Redondeo', 'La app calcula con precisión completa y redondea solo al mostrar. Si haces las cuentas a mano con valores ya redondeados, pueden aparecer diferencias en la última cifra decimal.']
  ];

  const welcome = [
    ['📝', '1. Cargar datos', 'Escribe los pares (X, Y), pega desde Excel, importa un CSV o prueba con el ejemplo del apunte.'],
    ['🧮', '2. Calcular', 'La app resuelve todo paso a paso: recta, variación, correlación, pruebas de hipótesis e intervalos.'],
    ['🎓', '3. Aprender', 'Cada resultado viene explicado, con fórmulas, gráficos, glosario y preguntas frecuentes.']
  ];

  const cheers = [
    '¡Excelente! Ya se obtuvo la recta de regresión.',
    '¡Muy bien! Cada paso te acerca a entender el modelo.',
    '¡Buen trabajo! Sigue con el siguiente paso.',
    '¡Genial! Ya casi se completa la resolución.'
  ];

  return { siglas, simbolos, tips, faq, formulario, precauciones, welcome, cheers };
})();
