const Steps = (function () {
  'use strict';

  const R = String.raw;
  const { n, tex, texp, signed, pct, p, K, esc, md } = Fmt;
  const T = s => K(s, false);
  const D = s => K(s, true);

  // ---------- bloques de HTML ----------
  const fx = (general, replaced, result) =>
    '<div class="fx"><div class="fx-row"><span class="fx-cap">Fórmula</span>' + D(general) + '</div>' +
    (replaced ? '<div class="fx-row"><span class="fx-cap">Reemplazo</span>' + D(replaced) + '</div>' : '') +
    (result ? '<div class="fx-row res"><span class="fx-cap">Resultado</span>' + D(result) + '</div>' : '') + '</div>';

  const step = (title, body) => '<section class="step"><h4><span>' + title + '</span></h4>' + body + '</section>';
  const interp = html => '<div class="interp"><div class="lab">' + Icons.svg('note') + 'Interpretación</div><div class="body">' + html + '</div></div>';
  const warn = html => '<div class="warn"><span class="ic" aria-hidden="true">' + Icons.svg('warn') + '</span><div>' + html + '</div></div>';
  const info = html => '<div class="note"><span class="ic" aria-hidden="true">' + Icons.svg('info') + '</span><div>' + html + '</div></div>';
  const cheer = html => '<p class="cheer">' + Icons.svg('check') + '<span>' + html + '</span></p>';
  const chip = (cls, label) => '<span class="chip ' + cls + '">' + label + '</span>';

  function chartBox(id, title, after) {
    const inner = id === 'panels'
      ? '<div class="chart-canvas panels-box" data-chart="panels"></div>'
      : '<div class="chart-canvas"><canvas data-chart="' + id + '" role="img" aria-label="' + esc(title) + '"></canvas></div>';
    return '<figure class="chartbox" data-name="regrelab-' + id + '"><figcaption><span>' + title +
      '</span><button class="btn small ghost png-btn" type="button">' + Icons.svg('download') + 'PNG</button></figcaption>' + inner + (after || '') + '</figure>';
  }

  function table(head, rows, foot, cls) {
    return '<div class="tbl-wrap"><table class="tbl ' + (cls || '') + '"><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>' +
      (foot ? '<tfoot><tr>' + foot.map(c => '<td>' + c + '</td>').join('') + '</tr></tfoot>' : '') + '</table></div>';
  }

  const pTex = v => (v < Math.pow(10, -Fmt.decimals) ? '<' + tex(Math.pow(10, -Fmt.decimals)) : '=' + tex(v));
  const termsTex = arr => (arr.length <= 5 ? arr.join(' + ') : arr.slice(0, 3).join(' + ') + R` + \cdots + ` + arr[arr.length - 1]);
  const up = u => (u ? ' (' + esc(u) + ')' : '');
  const uu = u => (u ? ' ' + esc(u) : '');

  function corrClass(r) {
    const a = Math.abs(r);
    if (a > 0.999999) return 'perfecta';
    if (a < 0.2) return 'muy débil';
    if (a < 0.4) return 'débil';
    if (a < 0.6) return 'moderada';
    if (a < 0.8) return 'fuerte';
    return 'muy fuerte';
  }

  const tailInfo = (tail, sym) => {
    const S = sym === 'r' ? R`\rho` : R`\beta_1`;
    if (tail === 'right') return { h0: R`H_0:\ ${S}\le 0`, h1: R`H_1:\ ${S}>0`, word: 'una cola (derecha)', dir: 'positiva', rule: c => R`\text{Rechazar } H_0 \text{ si } t>${c}` };
    if (tail === 'left') return { h0: R`H_0:\ ${S}\ge 0`, h1: R`H_1:\ ${S}<0`, word: 'una cola (izquierda)', dir: 'negativa', rule: c => R`\text{Rechazar } H_0 \text{ si } t<-${c}` };
    return { h0: R`H_0:\ ${S}=0`, h1: R`H_1:\ ${S}\ne 0`, word: 'dos colas', dir: '', rule: c => R`\text{Rechazar } H_0 \text{ si } t<-${c} \text{ o } t>${c}` };
  };

  function slopeDirText(M, L) {
    return M.b1 > 0 ? 'aumenta' : M.b1 < 0 ? 'disminuye' : 'no cambia';
  }

  function trendText(M, L) {
    const X = '<strong>' + esc(L.xn) + '</strong>', Y = '<strong>' + esc(L.yn) + '</strong>';
    if (M.degenerateY) return 'Todos los valores de ' + Y + ' son iguales: la recta es horizontal y no hay variación que explicar.';
    const a = Math.abs(M.r);
    if (a < 0.2) return 'No se observa una relación lineal aparente entre ' + X + ' y ' + Y + ': los puntos no siguen una tendencia recta clara.';
    const dir = M.r > 0 ? 'positiva' : 'negativa';
    const verb = M.r > 0 ? 'aumenta' : 'disminuye';
    return 'Se observa una tendencia <strong>' + dir + '</strong>: cuando ' + X + ' aumenta, ' + Y + ' tiende a ' + verb +
      '. La relación lineal es <strong>' + corrClass(M.r) + '</strong> (r = ' + n(M.r) + ').';
  }

  // ---------- construcción de tarjetas ----------
  function build(M, S, L) {
    const X = '<strong>' + esc(L.xn) + '</strong>', Y = '<strong>' + esc(L.yn) + '</strong>';
    const dec = Fmt.decimals;
    const AND = /^h?[iíI]/i.test(L.yn) && !/^hi[aeo]/i.test(L.yn) ? 'e' : 'y';
    const a = S.alpha, conf = S.conf;
    const df = M.df;
    const cards = [];
    const eq = (b0, b1) => R`\hat{Y}=${tex(b0)}${b1 < 0 ? '-' : '+'}${tex(Math.abs(b1))}\,X`;
    const eqText = 'Ŷ = ' + n(M.b0) + (M.b1 < 0 ? ' − ' : ' + ') + n(Math.abs(M.b1)) + ' X';
    const inRange = v => v >= M.xMin && v <= M.xMax;
    const pctS = v => pct(v, 2);

    // 5.1 dispersión
    cards.push({
      id: 's51', num: '5.1', title: 'Diagrama de dispersión',
      help: 'El diagrama de dispersión dibuja cada par (X, Y) como un punto. Sirve para ver, antes de calcular nada, si los datos siguen aproximadamente una recta y si hay puntos raros.',
      steps: [
        step('Graficar los pares (X ; Y)', '<p>Cada punto representa una observación: ' + X + ' en el eje horizontal e ' + Y + ' en el vertical.</p>' + chartBox('scatter', 'Diagrama de dispersión')),
        step('Leer la tendencia', interp('<p>' + trendText(M, L) + '</p>') + cheer('¡Buen comienzo! Graficar siempre es el primer paso.'))
      ]
    });

    // 5.2 tabla auxiliar
    const f = v => n(v);
    const auxRows = M.x.map((v, i) => [String(i + 1), f(v), f(M.y[i]), f(v * M.y[i]), f(v * v), f(M.y[i] * M.y[i])]);
    cards.push({
      id: 's52', num: '5.2', title: 'Tabla auxiliar de cálculo',
      help: 'Para calcular a mano se arma una tabla con los productos y cuadrados de los datos. Las sumas de las columnas son los ingredientes de todas las fórmulas siguientes.',
      steps: [
        step('Armar la tabla', '<p>Se calculan las columnas <em>X·Y</em>, <em>X²</em> e <em>Y²</em> para cada fila y se suman.</p>' +
          table(['N.º', 'X', 'Y', 'X·Y', 'X²', 'Y²'], auxRows, ['Σ', f(M.sums.x), f(M.sums.y), f(M.sums.xy), f(M.sums.xx), f(M.sums.yy)], 'aux')),
        step('Sumas obtenidas', D(R`\sum X=${tex(M.sums.x)}\qquad \sum Y=${tex(M.sums.y)}\qquad \sum XY=${tex(M.sums.xy)}\qquad \sum X^2=${tex(M.sums.xx)}\qquad \sum Y^2=${tex(M.sums.yy)}`) +
          '<p>Con <strong>n = ' + M.n + '</strong> pares de datos.</p>' + cheer('¡Muy bien! Con estas sumas ya se puede calcular casi todo.'))
      ]
    });

    // 5.3 mínimos cuadrados
    const dx = M.x.map(v => R`(${tex(v)}-${texp(M.xbar)})`);
    const dxy = M.x.map((v, i) => R`(${tex(v)}-${texp(M.xbar)})(${tex(M.y[i])}-${texp(M.ybar)})`);
    const ssxCalc = M.sums.xx - M.sums.x * M.sums.x / M.n;
    const ssxyCalc = M.sums.xy - M.sums.x * M.sums.y / M.n;
    const b1Alt = (M.n * M.sums.xy - M.sums.x * M.sums.y) / (M.n * M.sums.xx - M.sums.x * M.sums.x);
    const b0Warn = !inRange(0)
      ? warn('<p>X = 0 está <strong>fuera del rango observado</strong> [' + n(M.xMin) + ' ; ' + n(M.xMax) + '] de ' + X + '. Por eso b₀ no tiene una interpretación práctica: es solo el punto donde la recta corta al eje vertical.</p>')
      : '';
    const moreBox = '<details class="more"><summary>Otras formas de calcular b₁ (verificadas con tus datos)</summary>' +
      '<div class="more-b">' +
      '<p><strong>1) Con las sumas directas</strong></p>' + D(R`b_1=\frac{n\sum XY-\sum X\sum Y}{n\sum X^2-\left(\sum X\right)^2}=\frac{${M.n}\cdot ${tex(M.sums.xy)}-${tex(M.sums.x)}\cdot ${tex(M.sums.y)}}{${M.n}\cdot ${tex(M.sums.xx)}-${tex(M.sums.x)}^2}=${tex(b1Alt)}`) +
      '<p><strong>2) Con la correlación y los desvíos estándar</strong></p>' + D(R`b_1=r\cdot\frac{s_Y}{s_X}=${tex(M.r)}\cdot\frac{${tex(M.syStd)}}{${tex(M.sxStd)}}=${tex(M.r * M.syStd / M.sxStd)}`) +
      '<p><strong>3) Con la covarianza</strong></p>' + D(R`b_1=\frac{Cov(X,Y)}{s_X^2}=\frac{${tex(M.cov)}}{${tex(M.sx2)}}=${tex(M.cov / M.sx2)}\qquad\left(Cov(X,Y)=\frac{SSXY}{n-1}\right)`) +
      '<p><strong>4) Con las ecuaciones normales</strong></p>' +
      D(R`\begin{cases}\sum Y=n\,b_0+b_1\sum X\\ \sum XY=b_0\sum X+b_1\sum X^2\end{cases}\Rightarrow\begin{cases}${tex(M.sums.y)}=${M.n}\,b_0+${tex(M.sums.x)}\,b_1\\ ${tex(M.sums.xy)}=${tex(M.sums.x)}\,b_0+${tex(M.sums.xx)}\,b_1\end{cases}`) +
      '<p>Al reemplazar b₀ = ' + n(M.b0) + ' y b₁ = ' + n(M.b1) + ' en ambas ecuaciones:</p>' +
      D(R`${M.n}\cdot${texp(M.b0)}+${tex(M.sums.x)}\cdot${texp(M.b1)}=${tex(M.n * M.b0 + M.sums.x * M.b1)}\qquad ${tex(M.sums.x)}\cdot${texp(M.b0)}+${tex(M.sums.xx)}\cdot${texp(M.b1)}=${tex(M.sums.x * M.b0 + M.sums.xx * M.b1)}`) +
      '<p>Los lados derechos coinciden con ΣY y ΣXY: <strong>verificado</strong>.</p></div></details>';
    cards.push({
      id: 's53', num: '5.3', title: 'Método de mínimos cuadrados',
      help: 'El método de mínimos cuadrados busca la recta que pasa «lo más cerca posible» de todos los puntos: la que hace mínima la suma de los cuadrados de las distancias verticales (los residuos). La pendiente b₁ dice cuánto cambia Y por cada unidad de X, y b₀ es donde la recta corta el eje Y.',
      steps: [
        step('Calcular las medias', fx(R`\bar{X}=\frac{\sum X}{n}\qquad \bar{Y}=\frac{\sum Y}{n}`,
          R`\bar{X}=\frac{${tex(M.sums.x)}}{${M.n}}\qquad \bar{Y}=\frac{${tex(M.sums.y)}}{${M.n}}`, R`\bar{X}=${tex(M.xbar)}\qquad \bar{Y}=${tex(M.ybar)}`)),
        step('Calcular SSXY (suma de productos cruzados)',
          fx(R`SSXY=\sum (X-\bar{X})(Y-\bar{Y})=\sum XY-\frac{\sum X\sum Y}{n}`,
            R`SSXY=${tex(M.sums.xy)}-\frac{${tex(M.sums.x)}\cdot ${tex(M.sums.y)}}{${M.n}}`, R`SSXY=${tex(ssxyCalc)}`) +
          '<p class="small">Con la fórmula de definición: ' + T(R`\sum (X-\bar{X})(Y-\bar{Y})=` + termsTex(dxy) + '=' + tex(M.ssxy)) + '</p>'),
        step('Calcular SSX (suma de cuadrados de X)',
          fx(R`SSX=\sum (X-\bar{X})^2=\sum X^2-\frac{\left(\sum X\right)^2}{n}`,
            R`SSX=${tex(M.sums.xx)}-\frac{${tex(M.sums.x)}^2}{${M.n}}`, R`SSX=${tex(ssxCalc)}`) +
          '<p class="small">Con la fórmula de definición: ' + T(R`\sum (X-\bar{X})^2=` + termsTex(dx.map(s => s + '^2')) + '=' + tex(M.ssx)) + '</p>' +
          warn('<p><strong>SSX no es el desvío estándar.</strong> Para obtenerlo hay que dividir por (n − 1) y sacar la raíz:</p>' +
            D(R`s_X^2=\frac{SSX}{n-1}=\frac{${tex(M.ssx)}}{${M.n - 1}}=${tex(M.sx2)}\qquad s_X=\sqrt{\frac{SSX}{n-1}}=${tex(M.sxStd)}`))),
        step('Calcular la pendiente b₁', fx(R`b_1=\frac{SSXY}{SSX}`, R`b_1=\frac{${tex(M.ssxy)}}{${tex(M.ssx)}}`, R`b_1=${tex(M.b1)}`)),
        step('Calcular la ordenada al origen b₀', fx(R`b_0=\bar{Y}-b_1\bar{X}`, R`b_0=${tex(M.ybar)}-${texp(M.b1)}\cdot ${texp(M.xbar)}`, R`b_0=${tex(M.b0)}`)),
        step('Escribir la ecuación de la recta',
          D(R`\hat{Y}=b_0+b_1X\quad\Rightarrow\quad ${eq(M.b0, M.b1)}`) +
          cheer('¡Excelente! Ya se obtuvo la recta de regresión.') + moreBox),
        step('Interpretar b₁ y b₀',
          interp('<p><strong>Pendiente (b₁ = ' + n(M.b1) + '):</strong> por cada aumento de 1 unidad en ' + X + up(L.ux) + ', ' + Y + ' ' + slopeDirText(M, L) +
            ' en promedio ' + n(Math.abs(M.b1)) + uu(L.uy) + '.</p><p><strong>Ordenada (b₀ = ' + n(M.b0) + '):</strong> cuando ' + X + ' vale 0, el valor estimado de ' + Y + ' es ' + n(M.b0) + uu(L.uy) + '.</p>') + b0Warn),
        step('Ver la recta y los residuos', '<p>Los segmentos rojos son los <strong>residuos</strong> (e = Y − Ŷ): la distancia vertical de cada punto a la recta. La recta de mínimos cuadrados es la que hace mínima la suma de sus cuadrados.</p>' + chartBox('regression', 'Recta de regresión y residuos'))
      ]
    });

    // 5.4 predicción puntual
    const xp = M.xPred;
    const extrap = !inRange(xp);
    const usedMean = S.xPredEmpty;
    cards.push({
      id: 's54', num: '5.4', title: 'Predicción puntual',
      help: 'Predecir es reemplazar un valor de X en la ecuación de la recta para obtener el valor estimado de Y. Solo es confiable si X está dentro del rango de los datos.',
      steps: [
        step('Reemplazar X en la recta',
          (usedMean ? info('<p>No se indicó un valor de X para predecir, así que se usa la media X̄ = ' + n(M.xbar) + '. Puedes cambiarlo en la pantalla «Datos».</p>') : '') +
          fx(R`\hat{Y}=b_0+b_1X`, R`\hat{Y}=${tex(M.b0)}${signed(M.b1)}\cdot ${texp(xp)}`, R`\hat{Y}=${tex(M.pred.yhat)}`)),
        step('Verificar que no sea extrapolación',
          extrap
            ? warn('<p><strong>¡Cuidado, extrapolación!</strong> X = ' + n(xp) + ' está fuera del rango observado [' + n(M.xMin) + ' ; ' + n(M.xMax) + ']. No hay datos que aseguren que la relación lineal se mantenga allí, así que la predicción puede ser poco confiable.</p>')
            : '<p>X = ' + n(xp) + ' está dentro del rango observado [' + n(M.xMin) + ' ; ' + n(M.xMax) + ']: es una <strong>interpolación</strong>, y la predicción es razonable.</p>'),
        step('Interpretar', interp('<p>Cuando ' + X + ' es ' + n(xp) + uu(L.ux) + ', se estima que ' + Y + ' es de <strong>' + n(M.pred.yhat) + uu(L.uy) + '</strong>. Es una estimación puntual; los intervalos de confianza y de predicción (sección 5.13) muestran cuánta incertidumbre tiene.</p>'))
      ]
    });

    // 5.5 medidas de variación
    const ssrCalc = M.b0 * M.sums.y + M.b1 * M.sums.xy - M.sums.y * M.sums.y / M.n;
    const sseCalc = M.sums.yy - M.b0 * M.sums.y - M.b1 * M.sums.xy;
    const sstCalc = M.sums.yy - M.sums.y * M.sums.y / M.n;
    const varRows = M.x.map((v, i) => [
      f(v), f(M.y[i]), f(M.yhat[i]), f((M.y[i] - M.ybar) ** 2), f((M.yhat[i] - M.ybar) ** 2), f((M.y[i] - M.yhat[i]) ** 2)]);
    cards.push({
      id: 's55', num: '5.5', title: 'Medidas de variación: SST, SSR y SSE',
      help: 'La variación total de Y (SST) se reparte en dos partes: la que la recta logra explicar (SSR) y la que queda sin explicar (SSE). Cuanto mayor sea SSR frente a SSE, mejor ajusta la recta.',
      steps: [
        step('Tres sumas de cuadrados, tres colores',
          '<p>' + chip('sst', 'SST violeta') + ' variación total: distancias de cada Y a Ȳ.<br>' + chip('ssr', 'SSR azul') + ' variación explicada por la recta: distancias de Ŷ a Ȳ.<br>' +
          chip('sse', 'SSE rojo') + ' variación no explicada: distancias de cada Y a la recta.</p>' +
          D(R`\underbrace{\sum (Y-\bar{Y})^2}_{SST}=\underbrace{\sum (\hat{Y}-\bar{Y})^2}_{SSR}+\underbrace{\sum (Y-\hat{Y})^2}_{SSE}`)),
        step('Calcular SST ' + chip('sst', 'violeta'), fx(R`SST=\sum Y^2-\frac{\left(\sum Y\right)^2}{n}`, R`SST=${tex(M.sums.yy)}-\frac{${tex(M.sums.y)}^2}{${M.n}}=${tex(M.sums.yy)}-${tex(M.sums.y * M.sums.y / M.n)}`, R`SST=${tex(sstCalc)}`)),
        step('Calcular SSR ' + chip('ssr', 'azul'), fx(R`SSR=b_0\sum Y+b_1\sum XY-\frac{\left(\sum Y\right)^2}{n}`,
          R`SSR=${texp(M.b0)}\cdot ${tex(M.sums.y)}+${texp(M.b1)}\cdot ${tex(M.sums.xy)}-${tex(M.sums.y * M.sums.y / M.n)}=${tex(M.b0 * M.sums.y)}${signed(M.b1 * M.sums.xy)}-${tex(M.sums.y * M.sums.y / M.n)}`, R`SSR=${tex(ssrCalc)}`)),
        step('Calcular SSE ' + chip('sse', 'rojo'), fx(R`SSE=\sum Y^2-b_0\sum Y-b_1\sum XY`,
          R`SSE=${tex(M.sums.yy)}-${texp(M.b0 * M.sums.y)}-${texp(M.b1 * M.sums.xy)}`, R`SSE=${tex(sseCalc)}`)),
        step('Verificar que SST = SSR + SSE', D(R`SSR+SSE=${tex(M.ssr)}+${tex(M.sse)}=${tex(M.ssr + M.sse)}=SST\ \checkmark`) +
          '<p>La igualdad se cumple: toda la variación de ' + Y + ' se reparte entre la explicada y la no explicada.</p>'),
        step('Verificar punto por punto con las fórmulas de definición',
          '<p>Cada columna usa la fórmula de definición; sus sumas deben coincidir con los valores anteriores.</p>' +
          table(['X', 'Y', 'Ŷ', '(Y − Ȳ)²<br><span class="chip sst">SST</span>', '(Ŷ − Ȳ)²<br><span class="chip ssr">SSR</span>', '(Y − Ŷ)²<br><span class="chip sse">SSE</span>'], varRows,
            ['', '', 'Σ', f(M.sst), f(M.ssr), f(M.sse)], 'var')),
        step('Ver la variación en tres paneles',
          '<p><strong>Toca un punto</strong> de cualquier panel para ver su descomposición: (Y − Ȳ) = (Ŷ − Ȳ) + (Y − Ŷ).</p>' +
          chartBox('panels', 'SST, SSR y SSE', '<div class="pick-info" aria-live="polite"><span class="hint">Toca un punto para ver su descomposición.</span></div>')),
        step('Ver cuánto pesa cada parte', chartBox('bars', 'SST, SSR y SSE en porcentajes') +
          interp('<p>De la variación total de ' + Y + ', la recta explica <strong>' + pctS(M.ssr / M.sst) + '</strong> (SSR) y queda sin explicar <strong>' + pctS(M.sse / M.sst) + '</strong> (SSE).</p>'))
      ]
    });

    // 5.6 r² y S_YX
    cards.push({
      id: 's56', num: '5.6', title: 'Coeficiente de determinación y error estándar',
      help: 'r² dice qué porcentaje de la variación de Y explica la recta. S_YX dice cuánto se alejan, en promedio, los valores reales de la recta, en las mismas unidades de Y.',
      steps: [
        step('Coeficiente de determinación r²', fx(R`r^2=\frac{SSR}{SST}`, R`r^2=\frac{${tex(M.ssr)}}{${tex(M.sst)}}`, R`r^2=${tex(M.r2)}\ (${pct(M.r2)})`) +
          interp('<p>El <strong>' + pctS(M.r2) + '</strong> de la variación de ' + Y + ' se explica por la relación lineal con ' + X + '. El ' + pctS(1 - M.r2) + ' restante se debe a otros factores o al azar.</p>')),
        step('Error estándar de la estimación S_YX',
          fx(R`S_{YX}=\sqrt{\frac{SSE}{n-2}}=\sqrt{MSE}`, R`S_{YX}=\sqrt{\frac{${tex(M.sse)}}{${M.n}-2}}=\sqrt{${tex(M.mse)}}`, R`S_{YX}=${tex(M.syx)}`) +
          interp('<p>Al predecir ' + Y + ' con la recta, el error típico es de aproximadamente <strong>' + n(M.syx) + uu(L.uy) + '</strong>. Cuanto más chico sea S_YX, más cerca de la recta están los puntos.</p>') +
          cheer('¡Genial! Ya se sabe qué tan bien ajusta la recta.'))
      ]
    });

    // 5.7 correlación
    const rpos = (M.r + 1) / 2 * 100;
    const rmeter = '<div class="rmeter" role="img" aria-label="Escala de correlación de −1 a +1, r = ' + n(M.r) + '">' +
      '<div class="rm-track"><div class="rm-zero"></div><div class="rm-mark" style="left:' + rpos + '%"><span>r = ' + n(M.r) + '</span></div></div>' +
      '<div class="rm-scale"><span>−1</span><span>−0,8</span><span>−0,6</span><span>−0,4</span><span>−0,2</span><span>0</span><span>0,2</span><span>0,4</span><span>0,6</span><span>0,8</span><span>+1</span></div>' +
      '<div class="rm-zones"><span>muy fuerte</span><span>fuerte</span><span>moderada</span><span>débil</span><span>muy débil</span><span>débil</span><span>moderada</span><span>fuerte</span><span>muy fuerte</span></div>' +
      '<div class="rm-dir"><span>◀ Negativa</span><span>Positiva ▶</span></div></div>';
    cards.push({
      id: 's57', num: '5.7', title: 'Coeficiente de correlación',
      help: 'El coeficiente de correlación r mide la fuerza y la dirección de la relación lineal: cerca de +1 o −1 es una relación lineal fuerte; cerca de 0, casi nula. Su signo es el de la pendiente.',
      steps: [
        step('Calcular r', fx(R`r=\frac{SSXY}{\sqrt{SSX\cdot SST}}`, R`r=\frac{${tex(M.ssxy)}}{\sqrt{${tex(M.ssx)}\cdot ${tex(M.sst)}}}`, R`r=${tex(M.r)}`)),
        step('Verificar con r = ±√r²', D(R`r=\pm\sqrt{r^2}=${M.b1 < 0 ? '-' : '+'}\sqrt{${tex(M.r2)}}=${tex(M.b1 < 0 ? -Math.sqrt(M.r2) : Math.sqrt(M.r2))}`) +
          '<p>Se toma el signo de b₁ (' + (M.b1 < 0 ? 'negativo' : 'positivo') + '), porque r y b₁ siempre tienen el mismo signo.</p>'),
        step('Clasificar la correlación', rmeter + interp('<p>Existe una correlación lineal <strong>' + (M.r < 0 ? 'negativa ' : 'positiva ') + corrClass(M.r) + '</strong> entre ' + X + ' ' + AND + ' ' + Y +
          ' (r = ' + n(M.r) + '). <span class="small">La escala es orientativa: 0–0,2 muy débil; 0,2–0,4 débil; 0,4–0,6 moderada; 0,6–0,8 fuerte; 0,8–1 muy fuerte.</span></p>')),
        step('Diferencia entre r y r²',
          '<div class="cmp"><div class="cmp-c"><h5>r = ' + n(M.r) + '</h5><p>Coeficiente de <strong>correlación</strong>. Va de −1 a +1. Indica <strong>dirección y fuerza</strong> de la relación lineal.</p></div>' +
          '<div class="cmp-c"><h5>r² = ' + n(M.r2) + '</h5><p>Coeficiente de <strong>determinación</strong>. Va de 0 a 1. Indica la <strong>proporción de variación explicada</strong> (' + pctS(M.r2) + ').</p></div></div>')
      ]
    });

    // 5.8 supuestos y residuos
    const resRows = M.x.map((v, i) => [f(v), f(M.y[i]), f(M.yhat[i]), f(M.e[i]), f(M.e[i] * M.e[i])]);
    const sumE = Stats.sum(M.e);
    const bigRes = M.outliers.resid;
    const dwTxt = () => {
      const d = M.dw;
      let msg;
      if (d < 1) msg = 'D es menor que 1: hay indicios claros de <strong>autocorrelación positiva</strong> (los residuos consecutivos se parecen demasiado).';
      else if (d < 1.5) msg = 'D está entre 1 y 1,5: podría haber cierta autocorrelación positiva; conviene comparar con los valores críticos d<sub>L</sub> y d<sub>U</sub> de la tabla.';
      else if (d <= 2.5) msg = 'D está cerca de 2: no hay evidencia de autocorrelación. El supuesto de independencia parece cumplirse.';
      else if (d <= 3) msg = 'D está entre 2,5 y 3: podría haber cierta autocorrelación negativa.';
      else msg = 'D es mayor que 3: hay indicios claros de <strong>autocorrelación negativa</strong>.';
      return msg;
    };
    // Prueba formal de Durbin-Watson con d_L y d_U calculados (no tomados de una tabla)
    function dwStep() {
      const d = M.dw, N = M.n;
      const head = fx(R`D=\frac{\sum_{i=2}^{n}(e_i-e_{i-1})^2}{\sum_{i=1}^{n}e_i^2}`, R`D=\frac{${tex(M.dw * M.sse)}}{${tex(M.sse)}}`, R`D=${tex(M.dw)}`);
      const t = Stats.dwTest(d, N, 1, a);
      if (!t) return head + interp('<p>' + dwTxt() + '</p>') + '<p class="small">Con tan pocos datos (menos de 5) no se pueden calcular los valores críticos de la prueba.</p>';
      const alphas = [0.1, 0.05, 0.025, 0.01];
      if (alphas.indexOf(a) < 0 && a < 0.5) alphas.push(a);
      alphas.sort((p, q) => q - p);
      const rows = alphas.map(al => {
        const b = Stats.dwBounds(N, 1, al);
        const cell = v => (al === a ? '<strong>' + v + '</strong>' : v);
        return [cell(n(al)), cell(n(b.dL, 3)), cell(n(b.dU, 3))];
      });
      const say = (verdict, v, what, sign) => {
        const vs = sign === 'neg' ? '4 − D = ' + n(v, 3) : 'D = ' + n(v, 3);
        if (verdict === 'reject') return '<strong>Se rechaza H₀</strong>: ' + vs + ' es menor que d<sub>L</sub> = ' + n(t.dL, 3) + '. Hay evidencia de autocorrelación <strong>' + what + '</strong>.';
        if (verdict === 'keep') return '<strong>No se rechaza H₀</strong>: ' + vs + ' supera a d<sub>U</sub> = ' + n(t.dU, 3) + '. No hay evidencia de autocorrelación ' + what + '.';
        return '<strong>Prueba no concluyente</strong>: ' + vs + ' está entre d<sub>L</sub> = ' + n(t.dL, 3) + ' y d<sub>U</sub> = ' + n(t.dU, 3) + '.';
      };
      let overall;
      if (t.positive === 'reject') overall = 'Los residuos consecutivos se parecen demasiado: hay <strong>autocorrelación positiva</strong>. El supuesto de independencia no se cumple, por lo que los errores estándar, las pruebas t y F y los intervalos no son confiables. Conviene revisar el modelo (por ejemplo, agregar una tendencia o una variable omitida).';
      else if (t.negative === 'reject') overall = 'Los residuos consecutivos se alternan demasiado: hay <strong>autocorrelación negativa</strong>. El supuesto de independencia no se cumple y conviene revisar el modelo.';
      else if (t.positive === 'keep' && t.negative === 'keep') overall = 'No hay evidencia de autocorrelación: el supuesto de independencia de los errores parece cumplirse.';
      else overall = 'La prueba no permite decidir con estos datos. Mira el gráfico de residuos ordenados en el tiempo y, si es posible, consigue más observaciones.';
      return head +
        '<p><strong>Hipótesis</strong> (autocorrelación de los errores):</p>' + D(R`\begin{aligned}H_0&:\ \rho=0\\ H_1&:\ \rho>0\ \text{(autocorrelación positiva)}\\ H_1&:\ \rho<0\ \text{(autocorrelación negativa)}\end{aligned}`) +
        '<p><strong>Valores críticos</strong> para n = ' + N + ' y k = 1 regresor (una cola):</p>' +
        table(['α (una cola)', 'd<sub>L</sub>', 'd<sub>U</sub>'], rows, null, 'dw') +
        '<p class="small">Los libros (por ejemplo, Levine) traen d<sub>L</sub> y d<sub>U</sub> solo para algunos n; aquí se calculan con la distribución exacta de los límites de Durbin-Watson, para cualquier n. En la fila resaltada está el α elegido (' + n(a) + ').</p>' +
        '<div class="fx"><div class="fx-row"><span class="fx-cap">Regla</span>' + D(R`D<d_L:\ \text{rechazar } H_0\qquad D>d_U:\ \text{no rechazar}\qquad d_L\le D\le d_U:\ \text{no concluyente}`) + '</div>' +
        '<div class="fx-row"><span class="fx-cap">Positiva</span><div><p>' + say(t.positive, d, 'positiva', 'pos') + '</p></div></div>' +
        '<div class="fx-row"><span class="fx-cap">Negativa</span><div><p>' + say(t.negative, 4 - d, 'negativa', 'neg') + '</p></div></div></div>' +
        '<div class="decision">' + overall + '</div>' +
        '<p class="small">Para una prueba de dos colas se usa α/2 en cada cola (por ejemplo, α = 0,05 → columnas de 0,025).' + (N < 15 ? ' Con menos de 15 datos las conclusiones son poco confiables.' : '') + ' D varía entre 0 y 4: cerca de 2 indica ausencia de autocorrelación.</p>';
    }

    function normalityStep() {
      const g1 = M.skew, g2 = M.exKurt;
      const notes = [];
      if (M.n < 10) notes.push('Con solo ' + M.n + ' datos los gráficos son <strong>orientativos</strong>: pocos puntos siempre se ven algo irregulares.');
      if (Math.abs(g1) > 1) notes.push('La asimetría es marcada (g₁ = ' + n(g1, 2) + '): los residuos se reparten de forma muy despareja hacia un lado.');
      if (Math.abs(g2) > 2) notes.push('La curtosis se aleja bastante de 0 (g₂ = ' + n(g2, 2) + '): hay colas más pesadas o más livianas que las de una campana.');
      if (!notes.length || (notes.length === 1 && M.n < 10)) notes.push('No se ven desvíos marcados respecto de una distribución normal.');
      return '<p>El supuesto <strong>N</strong> pide que los errores sigan una distribución normal. Se revisa con dos gráficos de los residuos.</p>' +
        '<div class="chart-pair">' + chartBox('hist', 'Histograma de los residuos') + chartBox('qq', 'Gráfico de probabilidad normal') + '</div>' +
        '<div class="fx"><div class="fx-row"><span class="fx-cap">Cómo leerlos</span><div><p><strong>Histograma:</strong> debería parecerse a la curva azul (una campana centrada en 0).</p>' +
        '<p><strong>Probabilidad normal:</strong> si los errores son normales, los puntos caen cerca de la recta; una curva en «S» o puntos que se alejan en los extremos indican que no lo son.</p></div></div>' +
        '<div class="fx-row"><span class="fx-cap">Medidas</span>' + D(R`g_1=${tex(g1, 3)}\qquad g_2=${tex(g2, 3)}`) + '</div></div>' +
        '<p class="small">g₁ mide la <strong>asimetría</strong> (0 = simétrica) y g₂ la <strong>curtosis</strong> respecto de la normal (0 = igual que una campana). Son referencias, no una prueba formal.</p>' +
        interp('<p>' + notes.join(' ') + '</p><p class="small">La regresión tolera apartamientos leves de la normalidad, sobre todo con muestras grandes; los desvíos fuertes afectan sobre todo a las pruebas y los intervalos.</p>');
    }

    const lineItems = [
      ['L', 'Linealidad', 'En el gráfico de residuos, los puntos deben repartirse al azar alrededor de 0, sin forma de curva (U o ∩).'],
      ['I', 'Independencia de los errores', 'No debe haber patrones ni rachas en el orden de los residuos. Se verifica con Durbin-Watson si los datos están ordenados en el tiempo.'],
      ['N', 'Normalidad de los errores', 'Los residuos deberían ser aproximadamente simétricos y con forma de campana: mira el histograma y el gráfico de probabilidad normal del paso anterior.'],
      ['E', 'Igualdad de varianzas (homocedasticidad)', 'La dispersión vertical de los residuos debe ser parecida para todos los valores de X: sin «embudo» que se abre o se cierra.']
    ];
    cards.push({
      id: 's58', num: '5.8', title: 'Supuestos y análisis de residuos',
      help: 'Los residuos (e = Y − Ŷ) son lo que la recta no logra explicar. Si el modelo es adecuado, los residuos parecen ruido al azar. Si muestran un patrón (curva, embudo), algún supuesto falla y las pruebas de hipótesis pueden no ser confiables.',
      steps: [
        step('Calcular los residuos', table(['X', 'Y', 'Ŷ', 'e = Y − Ŷ', 'e²'], resRows, ['', '', 'Σ', f(sumE), f(M.sse)], 'res') +
          D(R`\sum e=${tex(sumE)}\qquad \sum e^2=${tex(M.sse)}=SSE`) + '<p>Los residuos suman 0 y la suma de sus cuadrados es SSE: <strong>verificado</strong>.</p>'),
        step('Graficar los residuos frente a X', chartBox('residuals', 'Residuos frente a X') +
          (bigRes.length ? warn('<p>Hay residuos grandes (más de 2 S_YX en valor absoluto) en las filas: <strong>' + bigRes.map(i => i + 1).join(', ') + '</strong>. Revisa si son errores de carga o casos especiales.</p>') : '')),
        step('Revisar la normalidad de los errores', normalityStep()),
        step('Lista de verificación LINE',
          '<p>Mira el gráfico de residuos y marca lo que se cumple:</p><ul class="line-list">' + lineItems.map(it =>
            '<li><label><input type="checkbox"> <span><strong>' + it[0] + ' — ' + it[1] + '.</strong> ' + it[2] + '</span></label></li>').join('') + '</ul>'),
        step('Durbin-Watson (independencia)', S.ts
          ? dwStep()
          : info('<p>Esta prueba solo tiene sentido cuando los datos están <strong>ordenados en el tiempo</strong>. Si es tu caso, marca la casilla «Los datos están ordenados en el tiempo» en la pantalla «Datos».</p>'))
      ]
    });

    // 5.9 prueba t para la pendiente
    function sixSteps(kind) {
      const isR = kind === 'r';
      const ti = tailInfo(S.tail, isR ? 'r' : 'b');
      const test = isR ? M.tCorrTest : M.tSlopeTest;
      const stat = isR ? M.tCorr : M.tSlope;
      const c = test.c;
      const alphaTxt = S.tail === 'two' ? R`\alpha/2` : R`\alpha`;
      const aVal = S.tail === 'two' ? a / 2 : a;
      const par = isR ? 'ρ' : 'β₁';
      const rejectText = test.reject;
      const concl = rejectText
        ? '<strong>Se rechaza H₀.</strong> Con un nivel de significancia de α = ' + n(a) + ', hay evidencia suficiente para afirmar que ' +
          (S.tail === 'two' ? 'existe una relación lineal significativa' : 'existe una relación lineal ' + ti.dir + ' significativa') + ' entre ' + X + ' ' + AND + ' ' + Y + ' (' + par + (S.tail === 'two' ? ' ≠ 0' : S.tail === 'right' ? ' > 0' : ' < 0') + ').'
        : '<strong>No se rechaza H₀.</strong> Con un nivel de significancia de α = ' + n(a) + ', no hay evidencia suficiente para afirmar que ' +
          (S.tail === 'two' ? 'exista una relación lineal significativa' : 'exista una relación lineal ' + ti.dir) + ' entre ' + X + ' ' + AND + ' ' + Y + '. <em>No rechazar H₀ no significa demostrar que sea verdadera.</em>';
      const stepsArr = [
        step('Plantear las hipótesis', D(ti.h0 + R`\qquad ${ti.h1}`) +
          '<p>' + (isR ? 'H₀: no hay correlación lineal en la población.' : 'H₀: no hay relación lineal entre ' + X + ' ' + AND + ' ' + Y + ' (la pendiente real es 0).') + ' Prueba de <strong>' + ti.word + '</strong>.</p>'),
        step('Fijar el nivel de significancia y el tamaño de muestra', D(R`\alpha=${tex(a)}\qquad n=${M.n}`) +
          '<p>Con α = ' + n(a) + ' se acepta un ' + pctS(a) + ' de probabilidad de rechazar H₀ cuando en realidad es verdadera.</p>'),
        step('Elegir el estadístico y su distribución',
          (isR ? D(R`t=\frac{r}{\sqrt{\dfrac{1-r^2}{n-2}}}`) : D(R`t=\frac{b_1-\beta_1}{S_{b_1}}\quad\text{con }\beta_1=0\ \text{(según }H_0)`)) +
          '<p>El estadístico sigue una distribución <strong>t de Student</strong> con <strong>gl = n − 2 = ' + M.n + ' − 2 = ' + df + '</strong>.</p>'),
        step('Hallar el valor crítico y la regla de decisión',
          D(R`t_{${alphaTxt};\,gl}=t_{${tex(aVal)};\,${df}}=${tex(c)}`) + D(ti.rule(tex(c))) +
          '<p class="small">El valor crítico se calcula con la distribución t (no se toma de una tabla), para cualquier gl y α.</p>'),
        step(isR ? 'Calcular el estadístico t' : 'Calcular S_b1 y el estadístico t',
          (isR ? '' : fx(R`S_{b_1}=\frac{S_{YX}}{\sqrt{SSX}}`, R`S_{b_1}=\frac{${tex(M.syx)}}{\sqrt{${tex(M.ssx)}}}`, R`S_{b_1}=${tex(M.sb1)}`)) +
          (isR ? fx(R`t=\frac{r}{\sqrt{\dfrac{1-r^2}{n-2}}}`, R`t=\frac{${tex(M.r)}}{\sqrt{\dfrac{1-${tex(M.r2)}}{${M.n}-2}}}`, R`t=${tex(stat)}`)
            : fx(R`t=\frac{b_1}{S_{b_1}}`, R`t=\frac{${tex(M.b1)}}{${tex(M.sb1)}}`, R`t=${tex(stat)}`))),
        step('Decidir y concluir',
          '<p>' + (rejectText ? T(R`t=${tex(stat)}`) + ' cae en la <strong>región de rechazo</strong>.' : T(R`t=${tex(stat)}`) + ' cae en la <strong>región de no rechazo</strong>.') + '</p>' +
          chartBox(isR ? 'distR' : 'distT', 'Distribución t con regiones de rechazo') +
          '<div class="decision ' + (rejectText ? 'rej' : 'keep') + '">' + concl + '</div>' +
          '<p><strong>Por valor-p:</strong> ' + T(R`\text{valor-}p${pTex(test.p)}`) + ', que es ' + (test.p < a ? 'menor' : 'mayor o igual') + ' que α = ' + n(a) + ' → ' +
          (test.p < a ? 'se rechaza H₀' : 'no se rechaza H₀') + ' (la misma decisión).</p>' +
          (isR ? '<p class="small">Equivalencia: este t (' + n(M.tCorr) + ') es igual al t de la prueba de la pendiente (' + n(M.tSlope) + '). Probar ρ = 0 y probar β₁ = 0 son lo mismo en regresión simple.</p>' : '') +
          cheer(rejectText ? '¡Muy bien! La relación es estadísticamente significativa.' : '¡Bien hecho! Cada resultado, significativo o no, es información valiosa.'))
      ];
      return stepsArr;
    }

    cards.push({
      id: 's59', num: '5.9', title: 'Prueba t para la pendiente',
      help: 'Esta prueba responde: ¿la pendiente real β₁ es distinta de 0? Si lo fuera, X ayudaría a predecir Y. Se compara el estadístico t con un valor crítico: si cae en la zona de rechazo, se concluye que hay relación lineal.',
      steps: sixSteps('slope')
    });

    // 5.10 prueba F
    const oneTailNote = S.tail !== 'two'
      ? info('<p>La prueba F es siempre de cola derecha y equivale a la prueba <strong>bilateral</strong> de la pendiente (H₁: β₁ ≠ 0), aunque en la sección 5.9 hayas elegido una cola.</p>') : '';
    const fRej = M.F > M.fCrit;
    cards.push({
      id: 's510', num: '5.10', title: 'Prueba F para la pendiente',
      help: 'La prueba F compara la variación explicada (MSR) con la no explicada (MSE). Si el cociente F es grande, la recta explica mucho más de lo esperable por azar. En regresión simple da la misma conclusión que la prueba t.',
      steps: [
        step('Plantear las hipótesis', D(R`H_0:\ \beta_1=0\qquad H_1:\ \beta_1\ne 0`) + oneTailNote),
        step('Fijar α y n', D(R`\alpha=${tex(a)}\qquad n=${M.n}`)),
        step('Elegir el estadístico y su distribución', D(R`F=\frac{MSR}{MSE}=\frac{SSR/k}{SSE/(n-2)}`) +
          '<p>Sigue una distribución <strong>F de Fisher</strong> con <strong>gl = (1 ; n − 2) = (1 ; ' + df + ')</strong>. Aquí k = 1 (una variable explicativa).</p>'),
        step('Hallar el valor crítico y la regla de decisión', D(R`F_{\alpha;\,1;\,n-2}=F_{${tex(a)};\,1;\,${df}}=${tex(M.fCrit)}`) + D(R`\text{Rechazar } H_0 \text{ si } F>${tex(M.fCrit)}`)),
        step('Armar la tabla ANOVA y calcular F',
          table(['Fuente', 'gl', 'SS', 'MS', 'F', 'Valor-p'], [
            ['Regresión', '1', f(M.ssr), f(M.msr), f(M.F), p(M.pF)],
            ['Error', String(df), f(M.sse), f(M.mse), '', ''],
            ['Total', String(M.n - 1), f(M.sst), '', '', '']], null, 'anova') +
          fx(R`F=\frac{MSR}{MSE}=\frac{SSR/1}{SSE/(n-2)}`, R`F=\frac{${tex(M.ssr)}/1}{${tex(M.sse)}/${df}}=\frac{${tex(M.msr)}}{${tex(M.mse)}}`, R`F=${tex(M.F)}`)),
        step('Decidir y concluir',
          '<p>' + T(R`F=${tex(M.F)}`) + (fRej ? ' es <strong>mayor</strong>' : ' <strong>no supera</strong>') + ' que el valor crítico ' + n(M.fCrit) + '.</p>' +
          chartBox('distF', 'Distribución F con la región de rechazo') +
          '<div class="decision ' + (fRej ? 'rej' : 'keep') + '">' + (fRej
            ? '<strong>Se rechaza H₀.</strong> Con α = ' + n(a) + ', hay evidencia suficiente de una relación lineal significativa entre ' + X + ' ' + AND + ' ' + Y + '.'
            : '<strong>No se rechaza H₀.</strong> Con α = ' + n(a) + ', no hay evidencia suficiente de una relación lineal entre ' + X + ' ' + AND + ' ' + Y + '.') + '</div>' +
          '<p><strong>Por valor-p:</strong> ' + T(R`\text{valor-}p${pTex(M.pF)}`) + ', que es ' + (M.pF < a ? 'menor' : 'mayor o igual') + ' que α = ' + n(a) + ' → ' + (M.pF < a ? 'se rechaza H₀' : 'no se rechaza H₀') + '.</p>' +
          info('<p><strong>Nota:</strong> en regresión simple, F = t². Aquí t = ' + n(M.tSlope) + ' y t² = ' + n(M.tSlope * M.tSlope) + ', igual a F = ' + n(M.F) + '.</p>') +
          cheer('¡Excelente! Dos pruebas distintas, la misma conclusión.'))
      ]
    });

    // 5.11 IC pendiente
    const alphaCI = 1 - conf;
    const contains0 = M.ciSlope[0] <= 0 && M.ciSlope[1] >= 0;
    cards.push({
      id: 's511', num: '5.11', title: 'Intervalo de confianza para la pendiente',
      help: 'El intervalo de confianza da un rango de valores plausibles para la pendiente real β₁. Si el intervalo no contiene al 0, hay evidencia de relación lineal.',
      steps: [
        step('Hallar el valor crítico t', D(R`t_{\alpha/2;\,n-2}=t_{${tex(alphaCI / 2)};\,${df}}=${tex(M.tConf)}`) +
          '<p>Nivel de confianza: <strong>' + pctS(conf) + '</strong> (α = ' + n(alphaCI) + ').</p>'),
        step('Calcular los límites', fx(R`b_1\pm t_{\alpha/2;\,n-2}\cdot S_{b_1}`,
          R`${tex(M.b1)}\pm ${tex(M.tConfR, 4)}\cdot ${tex(M.sb1R, 4)}=${tex(M.b1)}\pm ${tex(M.tConfR * M.sb1R, 5)}`, R`${tex(M.ciSlope[0])}\ \le\ \beta_1\ \le\ ${tex(M.ciSlope[1])}`) +
          '<p class="small">Como a mano: t y S_b1 se redondean a 4 decimales antes de multiplicar. (Con toda la precisión, los límites serían ' + n(M.ciSlopeExact[0], 5) + ' y ' + n(M.ciSlopeExact[1], 5) + '.)</p>'),
        step('Interpretar', interp('<p>Con un <strong>' + pctS(conf) + '</strong> de confianza, por cada aumento de 1 unidad en ' + X + ', ' + Y + ' cambia en promedio entre <strong>' + n(M.ciSlope[0]) + '</strong> y <strong>' + n(M.ciSlope[1]) + '</strong>' + uu(L.uy) + '.</p>' +
          '<p>El intervalo <strong>' + (contains0 ? 'sí contiene' : 'no contiene') + '</strong> al 0, por lo que ' + (contains0 ? 'no se puede descartar que β₁ = 0 (no hay evidencia de relación lineal)' : 'se rechaza que β₁ = 0: hay relación lineal significativa') + '. Esto coincide con la prueba t de dos colas cuando α = 1 − nivel de confianza.</p>'))
      ]
    });

    // 5.12 prueba t correlación
    cards.push({
      id: 's512', num: '5.12', title: 'Prueba t para el coeficiente de correlación',
      help: 'Esta prueba responde: ¿la correlación real ρ entre X e Y es distinta de 0? En regresión simple es equivalente a probar que la pendiente es 0.',
      steps: sixSteps('r')
    });

    // 5.13 IC y IP
    const pr = M.pred;
    cards.push({
      id: 's513', num: '5.13', title: 'Intervalo de confianza para la media e intervalo de predicción',
      help: 'Ambos intervalos rodean la predicción Ŷ. El de confianza (IC) estima el promedio de Y para todos los casos con ese X. El de predicción (IP) estima el valor de un caso individual y por eso es más ancho.',
      steps: [
        step('Calcular h', (extrap ? warn('<p>X = ' + n(xp) + ' está fuera del rango observado: los intervalos se ensanchan y no son confiables (extrapolación).</p>') : '') +
          fx(R`h=\frac{1}{n}+\frac{(X-\bar{X})^2}{SSX}`, R`h=\frac{1}{${M.n}}+\frac{(${tex(xp)}-${texp(M.xbar)})^2}{${tex(M.ssx)}}`, R`h=${tex(pr.h, dec + 1)}`)),
        step('Hallar el valor crítico t', D(R`t_{\alpha/2;\,n-2}=t_{${tex(alphaCI / 2)};\,${df}}=${tex(M.tConf)}`) + '<p>Nivel de confianza: ' + pctS(conf) + '.</p>'),
        step('Intervalo de confianza para la media de Y', fx(R`\hat{Y}\pm t_{\alpha/2;\,n-2}\cdot S_{YX}\sqrt{h}`,
          R`${tex(pr.yhat)}\pm ${tex(M.tConf)}\cdot ${tex(M.syx)}\cdot\sqrt{${tex(pr.h, dec + 1)}}=${tex(pr.yhat)}\pm ${tex(pr.mc)}`, R`${tex(pr.ci[0])}\ \le\ \mu_{Y|X=${tex(xp)}}\ \le\ ${tex(pr.ci[1])}`)),
        step('Intervalo de predicción para un valor individual', fx(R`\hat{Y}\pm t_{\alpha/2;\,n-2}\cdot S_{YX}\sqrt{1+h}`,
          R`${tex(pr.yhat)}\pm ${tex(M.tConf)}\cdot ${tex(M.syx)}\cdot\sqrt{1+${tex(pr.h, dec + 1)}}=${tex(pr.yhat)}\pm ${tex(pr.mp)}`, R`${tex(pr.pi[0])}\ \le\ Y_{X=${tex(xp)}}\ \le\ ${tex(pr.pi[1])}`)),
        step('Interpretar ambos intervalos',
          interp('<p><strong>IC (media):</strong> con ' + pctS(conf) + ' de confianza, el ' + Y + ' <em>promedio</em> de todos los casos con ' + X + ' = ' + n(xp) + ' está entre <strong>' + n(pr.ci[0]) + '</strong> y <strong>' + n(pr.ci[1]) + '</strong>' + uu(L.uy) + '.</p>' +
            '<p><strong>IP (individual):</strong> con ' + pctS(conf) + ' de confianza, el ' + Y + ' de <em>un caso individual</em> con ' + X + ' = ' + n(xp) + ' estará entre <strong>' + n(pr.pi[0]) + '</strong> y <strong>' + n(pr.pi[1]) + '</strong>' + uu(L.uy) + '.</p>') +
          info('<p><strong>¿Por qué el IP es más ancho?</strong> El IC solo tiene en cuenta la incertidumbre sobre dónde está la recta (√h). El IP suma además la variabilidad de un dato individual alrededor de la recta (el «1» de √(1 + h)). Ancho del IC: ' + n(pr.ci[1] - pr.ci[0]) + '; ancho del IP: ' + n(pr.pi[1] - pr.pi[0]) + '.</p>')),
        step('Ver las bandas', chartBox('bands', 'Recta con bandas de confianza y de predicción') +
          '<p class="small">Las bandas se ensanchan al alejarse de X̄ = ' + n(M.xbar) + '. La estrella marca X = ' + n(xp) + '.</p>' + cheer('¡Casi terminamos! Solo falta el resumen.'))
      ]
    });

    // 5.14 resumen
    cards.push({
      id: 's514', num: '5.14', title: 'Resumen final',
      help: 'Aquí se reúnen todos los resultados con una interpretación breve de cada uno. Puedes copiar la tabla o descargarla como CSV.',
      steps: [
        step('Tabla de resultados', '<div class="tbl-wrap"><table class="tbl summary" id="summary-table"><thead><tr><th>Medida</th><th>Valor</th><th>Interpretación</th></tr></thead><tbody>' +
          summary(M, S, L).map(r => '<tr><td>' + T(r[1]) + '<br><span class="small">' + r[0] + '</span></td><td class="num">' + r[2] + '</td><td>' + r[3] + '</td></tr>').join('') +
          '</tbody></table></div><div class="btn-row"><button type="button" class="btn" data-act="copy-summary">' + Icons.svg('copy') + 'Copiar resumen</button><button type="button" class="btn ghost" data-act="csv-summary">' + Icons.svg('download') + 'Descargar CSV</button></div>')
      ]
    });

    if (M.n >= 4 && !M.degenerateY) {
      cards.push({
        id: 's515', num: '5.15', title: 'Efecto de un punto: excluir y comparar',
        help: 'Un punto muy alejado puede «arrastrar» la recta. Aquí puedes excluir puntos y ver cuánto cambian la pendiente, r² y la conclusión de la prueba. Sirve para detectar puntos influyentes, no para descartar datos que molestan.',
        steps: [step('Excluir puntos y comparar', '<div class="excl" data-excl></div>')]
      });
    }

    if (M.degenerateY) {
      const na = step('No se puede calcular', warn('<p>Todos los valores de ' + Y + ' son iguales, así que no hay variación que explicar: r, r² y los estadísticos t y F quedan indefinidos. Para poder completar este análisis, ' + Y + ' debe tomar al menos dos valores distintos.</p>'));
      cards.forEach(c => { if (['s56', 's57', 's59', 's510', 's512'].indexOf(c.id) >= 0) c.steps = [na]; });
    }

    return cards;
  }

  // filas del resumen: [nombre, tex, valor (html), interpretación (html)]
  function summary(M, S, L) {
    const X = esc(L.xn), Y = esc(L.yn);
    const pr = M.pred;
    const rows = [
      ['Recta de regresión', R`\hat{Y}`, n(M.b0) + (M.b1 < 0 ? ' − ' : ' + ') + n(Math.abs(M.b1)) + ' X', 'Ecuación estimada que relaciona ' + X + ' con ' + Y + '.'],
      ['Pendiente', 'b_1', n(M.b1), 'Por cada unidad más de ' + X + ', ' + Y + ' ' + slopeDirText(M, L) + ' en promedio ' + n(Math.abs(M.b1)) + '.'],
      ['Ordenada al origen', 'b_0', n(M.b0), 'Valor estimado de ' + Y + ' cuando ' + X + ' = 0' + (M.xMin > 0 || M.xMax < 0 ? ' (fuera del rango observado).' : '.')],
      ['Variación total', 'SST', n(M.sst), 'Variación total de ' + Y + ' respecto de su media.'],
      ['Variación explicada', 'SSR', n(M.ssr), 'Parte explicada por la recta.'],
      ['Variación no explicada', 'SSE', n(M.sse), 'Parte que la recta no explica.'],
      ['Coeficiente de determinación', 'r^2', n(M.r2) + ' (' + pct(M.r2) + ')', 'La recta explica el ' + pct(M.r2) + ' de la variación de ' + Y + '.'],
      ['Coeficiente de correlación', 'r', n(M.r), 'Relación lineal ' + (M.r < 0 ? 'negativa ' : 'positiva ') + corrClass(M.r) + '.'],
      ['Error estándar de la estimación', 'S_{YX}', n(M.syx), 'Error típico de predicción, en unidades de ' + Y + '.'],
      ['Error estándar de la pendiente', 'S_{b_1}', n(M.sb1), 'Precisión de la pendiente estimada.'],
      ['Estadístico t (pendiente)', 't', n(M.tSlope), 'Valor crítico: ' + (M.tSlopeTest.crit.lo != null ? '−' : '') + n(M.tSlopeTest.c) + (M.tSlopeTest.crit.lo != null && M.tSlopeTest.crit.hi != null ? ' y +' + n(M.tSlopeTest.c) : '') + '. ' + (M.tSlopeTest.reject ? 'Se rechaza H₀: hay relación lineal.' : 'No se rechaza H₀.') + ' Valor-p ' + p(M.tSlopeTest.p) + '.'],
      ['Estadístico F', 'F', n(M.F), 'F crítico: ' + n(M.fCrit) + '. ' + (M.F > M.fCrit ? 'Se rechaza H₀ (F = t²).' : 'No se rechaza H₀.') + ' Valor-p ' + p(M.pF) + '.'],
      ['IC para β₁ (' + pct(S.conf, 0) + ')', R`\beta_1`, '[' + n(M.ciSlope[0]) + ' ; ' + n(M.ciSlope[1]) + ']', (M.ciSlope[0] <= 0 && M.ciSlope[1] >= 0 ? 'Contiene' : 'No contiene') + ' al 0.'],
      ['Estadístico t (correlación)', R`t_r`, n(M.tCorr), 'Equivale a la prueba de la pendiente. ' + (M.tCorrTest.reject ? 'Se rechaza H₀: ρ ≠ 0.' : 'No se rechaza H₀.')],
      ['Predicción puntual (X = ' + n(pr.x) + ')', R`\hat{Y}`, n(pr.yhat), 'Valor estimado de ' + Y + '.' + (pr.x < M.xMin || pr.x > M.xMax ? ' ¡Extrapolación!' : '')],
      ['IC para la media (' + pct(S.conf, 0) + ')', R`\mu_{Y|X}`, '[' + n(pr.ci[0]) + ' ; ' + n(pr.ci[1]) + ']', 'Rango del promedio de ' + Y + ' para ese X.'],
      ['IP individual (' + pct(S.conf, 0) + ')', R`Y_X`, '[' + n(pr.pi[0]) + ' ; ' + n(pr.pi[1]) + ']', 'Rango para un caso individual; más ancho que el IC.']
    ];
    if (S.ts) {
      const t = Stats.dwTest(M.dw, M.n, 1, S.alpha);
      const txt = !t ? 'Con tan pocos datos no se puede aplicar la prueba.'
        : t.positive === 'reject' ? 'D < d_L = ' + n(t.dL, 3) + ': autocorrelación positiva.'
          : t.negative === 'reject' ? '4 − D < d_L = ' + n(t.dL, 3) + ': autocorrelación negativa.'
            : t.positive === 'keep' && t.negative === 'keep' ? 'D > d_U = ' + n(t.dU, 3) + ': sin evidencia de autocorrelación.'
              : 'D entre d_L = ' + n(t.dL, 3) + ' y d_U = ' + n(t.dU, 3) + ': prueba no concluyente.';
      rows.push(['Durbin-Watson', 'D', n(M.dw), txt]);
    }
    return rows;
  }

  // Texto plano de los resultados (copiar / CSV)
  function summaryPlain(M, S, L) {
    const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<');
    return summary(M, S, L).map(r => [r[0], strip(r[2]), strip(r[3])]);
  }

  function pickInfo(M, i, L) {
    const dy = M.y[i] - M.ybar, dh = M.yhat[i] - M.ybar, de = M.y[i] - M.yhat[i];
    return '<div class="pick"><p><strong>Punto ' + (i + 1) + ':</strong> X = ' + n(M.x[i]) + ', Y = ' + n(M.y[i]) + ', Ŷ = ' + n(M.yhat[i]) + '</p>' +
      D(R`\underbrace{(Y-\bar{Y})}_{${chipTex('sst')}}=\underbrace{(\hat{Y}-\bar{Y})}_{${chipTex('ssr')}}+\underbrace{(Y-\hat{Y})}_{${chipTex('sse')}}`) +
      D(R`\textcolor{#7B3FA0}{${tex(dy)}}=\textcolor{#1E6FD9}{${tex(dh)}}+\textcolor{#C62828}{${texp(de)}}`) + '</div>';
  }

  const chipTex = k => ({ sst: R`\text{violeta}`, ssr: R`\text{azul}`, sse: R`\text{rojo}` }[k]);

  function distOptions(id, M, S) {
    if (id === 'distF') {
      return { kind: 'F', df1: 1, df2: M.df, crit: { lo: null, hi: M.fCrit }, stat: M.F, symbol: 'F', alpha: S.alpha, title: 'Prueba F para la pendiente (gl = 1 ; ' + M.df + ')', xTitle: 'F' };
    }
    const test = id === 'distR' ? M.tCorrTest : M.tSlopeTest;
    return { kind: 't', df: M.df, crit: test.crit, stat: id === 'distR' ? M.tCorr : M.tSlope, symbol: 't', alpha: S.alpha,
      title: (id === 'distR' ? 'Prueba t para la correlación' : 'Prueba t para la pendiente') + ' (gl = ' + M.df + ')', xTitle: 't' };
  }

  return { build, chartBox, summary, summaryPlain, pickInfo, distOptions, corrClass, trendText, tailInfo };
})();
