# Plantilla visual — módulo 0DTE (flujo de opciones)

> ⚠️ **v0 — PENDIENTE de revisión de coherencia de Joaquín** (2026-08-11). A validar:
> (a) verdict de la franja: `NO OPERAR` gris vs `ESPERAR` ámbar para un flujo neutral;
> (b) tono de los puts (naranja) vs la zona imán (ámbar) — posible confusión visual;
> (c) criterio del % de confianza en rojo cuando la franja es gris. No congelar como estándar hasta el OK.

El "gráfico" del 0DTE NO es una línea de precio: es el **mapa de flujo por strike**
(volumen de calls vs puts) con los **muros de gamma** y la **zona imán** (spot).

## Elementos (mismo estándar que screening)
1. **Franja de acción arriba** (grande, color visible): `COMPRAR` verde · `ESPERAR` ámbar ·
   `NO OPERAR` gris · `CERRAR POSICIÓN` rojo.
2. **Gráfico de flujo:** barras verticales por strike, Calls (`#2a78d6`) vs Puts (`#eb6834`);
   caja de **zona imán** (ámbar tenue) entre el muro de puts y el muro de calls, con el spot.
3. **Recuadro corto abajo:** Confianza en % · Razón principal · Qué la invalida · Cuándo revisar.
4. Después: 👁️ resumen ejecutivo 1 vista + conclusión ejecutiva (sesgo/niveles/escenarios/plan/confianza).

## Código (Chart.js + annotation) — rellenar `<<placeholders>>`
```html
<div class="banner" style="background:#F1EFE8"><!-- COMPRAR #EAF3DE/#27500A · ESPERAR #FAEEDA/#633806 · NO OPERAR #F1EFE8/#444441 · CERRAR #FCEBEB/#791F1F -->
  <span style="font-size:22px;font-weight:600;color:#444441"><<VERDICT>></span>
  <span style="font-size:13px;color:#5F5E5A"><<subtítulo>></span>
</div>
<div style="position:relative;width:100%;height:300px"><canvas id="nv" role="img" aria-label="<<desc>>"></canvas></div>
<!-- recuadro abajo: Confianza <<n>>% · Razón · Qué la invalida · Cuándo revisar -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/3.0.1/chartjs-plugin-annotation.min.js"></script>
<script>
Chart.register(window['chartjs-plugin-annotation']);
const L=<<strikes>>; const calls=<<vol calls>>; const puts=<<vol puts>>;
new Chart(document.getElementById('nv'),{ type:'bar',
 data:{labels:L,datasets:[
  {label:'Calls',data:calls,backgroundColor:'#2a78d6',borderRadius:4,maxBarThickness:22},
  {label:'Puts',data:puts,backgroundColor:'#eb6834',borderRadius:4,maxBarThickness:22}
 ]},
 options:{responsive:true,maintainAspectRatio:false,animation:false,
  plugins:{legend:{display:false},
   annotation:{annotations:{ iman:{type:'box',xMin:'<<muro_put>>',xMax:'<<muro_call>>',
     backgroundColor:'rgba(237,161,0,0.15)',borderColor:'rgba(133,79,11,0.4)',borderWidth:1,
     label:{display:true,content:'imán · spot <<spot>>',position:{x:'center',y:'start'},color:'#633806',font:{size:11}}}}}},
  scales:{ y:{ticks:{callback:v=>(v/1000)+'k'},title:{display:true,text:'Volumen'}},
           x:{grid:{display:false},title:{display:true,text:'Strike'}} }}
});
</script>
```

Ejemplo de referencia: NVDA (venc 12-ago-2026) — muro put 217.5 (109k), muro call 220/222.5,
spot 218.48, scorecard 48.5/100, veredicto NO OPERAR, confianza 25%.

*"No es consejo financiero. Solo análisis inteligente."*
