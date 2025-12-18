(() => {
    // Esta función anónima inmediatamente ejecutada encapsula todo el código
    // para evitar contaminar el ámbito global del navegador
    
    const pokemonTodo = (() => {
        // Detectamos en qué página estamos buscando elementos únicos de cada vista
        // Esto nos permite saber qué funcionalidad inicializar
        const PaginaBusqueda = document.getElementById("input-busqueda") !== null;
        const PaginaBatalla = document.getElementById("buscar1") !== null;
        const PaginaFavoritos = document.getElementById("favoritos-listado") !== null;
        const PaginaHistorico = document.getElementById("historico-listado") !== null;

        // Recolectamos todos los elementos del DOM que vamos a usar
        // Los organizamos en un objeto para accederlos fácilmente
        const html = {
            // Elementos comunes a varias páginas
            entrada: document.getElementById("input-busqueda"),
            boton: document.getElementById("boton-buscar"),
            modo: document.getElementById("modo-busqueda"),
            
            // Elementos específicos de la página de búsqueda
            contenedorPokemon: document.getElementById("resultado-tarjeta"),
            contenedorHabilidad: document.getElementById("resultado-habilidad"),
            contenedorError: document.getElementById("alerta-error"),
            
            // Elementos dentro de la tarjeta de pokémon
            imagen: document.getElementById("imagen-pokemon"),
            titulo: document.getElementById("titulo-pokemon"),
            tipos: document.getElementById("tipos-pokemon"),
            habilidades: document.getElementById("habilidades-pokemon"),
            estadisticas: document.getElementById("estadisticas-pokemon"),
            corazon: document.getElementById("corazon-pokemon"),
            evolucion: document.getElementById("evolucion-cadena"),
            
            // Elementos de la tarjeta de habilidad
            estrella: document.getElementById("estrella-habilidad"),
            tituloHabilidad: document.getElementById("titulo-habilidad"),
            idHabilidad: document.getElementById("id-habilidad"),
            efectoHabilidad: document.getElementById("efecto-habilidad"),
            tituloGrid: document.getElementById("titulo-grid-habilidad"),
            grid: document.getElementById("grid-habilidad"),
            
            // Elementos de la página de batalla
            boton1: document.getElementById('buscar1'),
            boton2: document.getElementById('buscar2'),
            entrada1: document.getElementById('poke1'),
            entrada2: document.getElementById('poke2'),
            tarjeta1: document.getElementById('card1'),
            tarjeta2: document.getElementById('card2'),
            
            // Elementos de resultados de batalla (con nombres alternativos por compatibilidad)
            resultadoBatalla: document.getElementById('battle-result') || document.getElementById('resultado-batalla'),
            centroTarjetas: document.querySelector('.tarjetas-centro'),
            tarjetaResultado1: document.getElementById('result-card-1') || document.getElementById('tarjeta-resultado-1'),
            tarjetaResultado2: document.getElementById('result-card-2') || document.getElementById('tarjeta-resultado-2'),
            rectanguloOverlay: document.querySelector('.rectangulo-overlay'),
            cajaInferior: document.querySelector('.caja-inferior'),
            
            // Secciones de análisis de batalla
            elementoVentajas: document.getElementById('type-advantages') || document.getElementById('ventajas-tipo'),
            comparacionEstadisticas: document.getElementById('stat-comparison') || document.getElementById('comparacion-estadisticas'),
            calculoPuntaje: document.getElementById('score-calculation') || document.getElementById('calculo-puntaje'),
            
            // Elementos de las páginas de listas
            contenedorFavoritos: document.getElementById("favoritos-listado"),
            botonLimpiarFavoritos: document.getElementById("btn-limpiar-favoritos"),
            contenedorHistorico: document.getElementById("historico-listado"),
            botonLimpiarHistorico: document.getElementById("btn-limpiar-historico")
        };

        // Estado de la aplicación - datos que cambian durante el uso
        const state = {
            tiempoCache: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
            datosActuales: null, // Datos del pokémon actualmente mostrado
            desdeCache: false, // Bandera para saber si los datos vienen de caché
            cacheTipos: {}, // Caché interna para datos de tipos
            datosPokemon1: null, // Primer pokémon en batalla
            datosPokemon2: null, // Segundo pokémon en batalla
            historico: [], // Historial de búsquedas
            favoritos: [] // Lista de favoritos
        };

        // Sistema de caché para almacenar datos localmente y reducir peticiones a la API
        const cacheCompartido = {
            // Limpia entradas de caché que han expirado
            limpiarCacheExpirado() {
                try {
                    const raw = localStorage.getItem('poke_cache') || "{}";
                    let cache = JSON.parse(raw);
                    const ahora = Date.now();
                    let cambio = false;
                    const idsEliminados = new Set();
                    const nombresEliminados = new Set();
                    
                    // Revisamos cada entrada en la caché
                    for (const k of Object.keys(cache)) {
                        try {
                            const entrada = cache[k];
                            // Si la entrada no es válida (sin timestamp), la eliminamos
                            if (!entrada || !entrada.ts) {
                                if (entrada && entrada.data) {
                                    // Registramos lo que eliminamos para actualizar histórico
                                    if (entrada.data.id !== undefined && entrada.data.id !== null) 
                                        idsEliminados.add(entrada.data.id);
                                    if (entrada.data.name) 
                                        nombresEliminados.add(String(entrada.data.name).toLowerCase());
                                }
                                delete cache[k]; 
                                cambio = true; 
                                continue;
                            }
                            // Si la entrada ha expirado (más de 24 horas), la eliminamos
                            if ((ahora - entrada.ts) > state.tiempoCache) {
                                if (entrada && entrada.data) {
                                    if (entrada.data.id !== undefined && entrada.data.id !== null) 
                                        idsEliminados.add(entrada.data.id);
                                    if (entrada.data.name) 
                                        nombresEliminados.add(String(entrada.data.name).toLowerCase());
                                }
                                delete cache[k]; 
                                cambio = true;
                            }
                        } catch (e) { continue; }
                    }
                    
                    // Si hubo cambios, guardamos la caché actualizada
                    if (cambio) {
                        localStorage.setItem('poke_cache', JSON.stringify(cache));

                        // También actualizamos el histórico para eliminar entradas obsoletas
                        try {
                            const rawHist = localStorage.getItem('historico_poke') || '[]';
                            let historico = JSON.parse(rawHist);
                            if (Array.isArray(historico) && (idsEliminados.size > 0 || nombresEliminados.size > 0)) {
                                historico = historico.filter(h => {
                                    if (!h) return false;
                                    if (idsEliminados.size > 0 && h.id !== undefined && idsEliminados.has(h.id)) return false;
                                    if (nombresEliminados.size > 0 && h.nombre && nombresEliminados.has(String(h.nombre).toLowerCase())) return false;
                                    return true;
                                });
                                localStorage.setItem('historico_poke', JSON.stringify(historico));
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            },
            
            // Obtiene toda la caché desde localStorage
            obtenerCache() {
                try { 
                    return JSON.parse(localStorage.getItem('poke_cache') || "{}"); 
                } catch { 
                    return {}; 
                }
            },
            
            // Guarda la caché completa en localStorage
            establecerCache(cache) {
                try { 
                    localStorage.setItem('poke_cache', JSON.stringify(cache)); 
                } catch {}
            },
            
            // Busca un pokémon, primero en caché y si no en la API
            async buscarPokemon(termino) {
                if (!termino) throw new Error('empty');
                const clave = termino.toString().toLowerCase();
                const ahora = Date.now();
                let cache = cacheCompartido.obtenerCache();
                
                // Función auxiliar para normalizar nombres (quitar espacios, guiones, etc.)
                function normalizeName(n) {
                    return (n || '').toString().toLowerCase().replace(/[\s\-]+/g, ' ').trim();
                }
                
                // Generamos posibles variaciones del término de búsqueda
                const posibles = [clave];
                if (clave.indexOf('-') !== -1) 
                    posibles.push(clave.replace(/-/g, ' '));
                if (clave.indexOf(' ') !== -1) 
                    posibles.push(clave.replace(/\s+/g, '-'));
                
                // Primero buscamos con las variaciones exactas
                if (cache) {
                    for (const p of posibles) {
                        try {
                            if (cache[p] && cache[p].ts && (ahora - cache[p].ts) <= state.tiempoCache) {
                                return { data: cache[p].data, fromCache: true };
                            }
                        } catch (e) {}
                    }
                    
                    // Búsqueda exhaustiva por coincidencias de nombre o ID
                    for (const k of Object.keys(cache)) {
                        const entrada = cache[k];
                        if (!entrada || !entrada.ts || !entrada.data)
                             continue;
                        if ((ahora - entrada.ts) > state.tiempoCache)
                             continue;
                        
                        const datos = entrada.data;
                        if (!datos) continue;
                        
                        try {
                            const nombreNormalizado = normalizeName(datos.name);
                            if (String(datos.id) === clave || 
                                posibles.some(p => normalizeName(p) === nombreNormalizado) || 
                                nombreNormalizado === normalizeName(clave)) {
                                // Si encontramos, actualizamos la caché con la clave actual
                                cache[clave] = { data: datos, ts: entrada.ts };
                                cacheCompartido.establecerCache(cache);
                                return { data: datos, fromCache: true };
                            }
                        } catch (e) {}
                    }
                }
                
                // Si no está en caché, consultamos la API de Pokémon
                const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(clave)}`);
                if (!respuesta.ok) 
                    throw new Error('notfound');
                const datos = await respuesta.json();

                // Guardamos en caché para futuras búsquedas
                try {
                    cache = cacheCompartido.obtenerCache();
                    const entrada = { data: datos, ts: Date.now() };
                    // Guardamos tanto por nombre como por ID para búsquedas futuras
                    if (datos.name) 
                        cache[datos.name.toString().toLowerCase()] = entrada;
                    if (datos.id !== undefined && datos.id !== null) 
                        cache[String(datos.id)] = entrada;
                    cacheCompartido.establecerCache(cache);
                } catch (e) {}
                
                return { data: datos, fromCache: false };
            },
            
            // Obtiene datos de un tipo específico, con caché interna
            async obtenerDatosTipo(nombreTipo) {
                if (!nombreTipo) return null;
                nombreTipo = nombreTipo.toString().toLowerCase();
                
                // Primero miramos en la caché interna (memoria)
                if (state.cacheTipos[nombreTipo]) return state.cacheTipos[nombreTipo];
                
                try {
                    // Si no está en caché, consultamos la API
                    const respuesta = await fetch(`https://pokeapi.co/api/v2/type/${encodeURIComponent(nombreTipo)}`);
                    if (!respuesta.ok) return null;
                    
                    const datosJson = await respuesta.json();
                    // Guardamos en caché interna para futuras consultas
                    state.cacheTipos[nombreTipo] = datosJson;
                    return datosJson;
                } catch (e) { 
                    return null; 
                }
            },
            
            // Agrega un pokémon al historial de búsquedas
            agregarAlHistorico(datosPokemon) {
                try {
                    let historico = JSON.parse(localStorage.getItem('historico_poke') || '[]');
                    // Eliminamos duplicados (si ya existe este pokémon)
                    historico = historico.filter(h => h && h.id !== datosPokemon.id);
                    
                    // Obtenemos la imagen del pokémon (priorizando la frontal)
                    const imagen = datosPokemon.sprites && 
                        (datosPokemon.sprites.front_default || 
                         (datosPokemon.sprites.other && 
                          datosPokemon.sprites.other['official-artwork'] && 
                          datosPokemon.sprites.other['official-artwork'].front_default)) 
                        ? (datosPokemon.sprites.front_default || datosPokemon.sprites.other['official-artwork'].front_default) 
                        : '';
                    
                    // Extraemos los tipos del pokémon
                    const tipos = (datosPokemon.types || []).map(t => 
                        t.type && t.type.name ? t.type.name.toUpperCase() : ''
                    ).filter(Boolean);
                    
                    // Extraemos las habilidades
                    const habilidades = (datosPokemon.abilities || []).map(a => 
                        a.ability && a.ability.name
                    ).filter(Boolean);
                    
                    // Agregamos al inicio del array (los más recientes primero)
                    historico.push({ 
                        id: datosPokemon.id, 
                        nombre: datosPokemon.name, 
                        imagen: imagen, 
                        tipos: tipos, 
                        habilidades: habilidades 
                    });
                    
                    localStorage.setItem('historico_poke', JSON.stringify(historico));
                } catch (e) { }
            }
        };

        // Plantillas HTML reutilizables para mostrar contenido
        const templates = {
            // Plantilla para cuando no hay favoritos
            vacioFavoritos: () => `
                <div class="contenedor-vacio">
                    <div class="icono-vacio">❤️</div>
                    <div class="titulo-vacio">NO TIENES POKÉMONES FAVORITOS</div>
                    <div class="subtitulo-vacio">Busca un pokémon y márcalo como favorito</div>
                </div>
            `,
            
            // Plantilla para cuando no hay histórico
            vacioHistorico: () => `
                <div class="contenedor-vacio">
                    <div class="icono-vacio">📜</div>
                    <div class="titulo-vacio">NO HAY POKÉMONES EN EL HISTÓRICO</div>
                    <div class="subtitulo-vacio">Busca un pokémon para agregarlo aquí</div>
                </div>
            `,
            
            // Plantilla para cada tarjeta en la lista de favoritos
            tarjetaFavoritos: (favorito) => {
                const nombreFormateado = (favorito.nombre || '').toLowerCase().replace(/\s+/g, '-');
                const tipos = favorito.tipos || [];
                
                return `
                <div class="tarjeta-historico" data-id="${favorito.id}" data-nombre="${nombreFormateado}">
                    <div class="imagen-historico">
                        <img src="${favorito.imagen || ''}" alt="${favorito.nombre}">
                    </div>
                    <div class="info-historico">
                        <div>
                            <span class="numero-historico">#${favorito.id}</span>
                            <span class="nombre-historico">${favorito.nombre}</span>
                        </div>
                        <div class="habilidades-historico">
                            ${tipos.map(t => `<span class="badge-tipo">${t}</span>`).join(' ')}
                        </div>
                    </div>
                    <button class="boton-eliminar" title="Quitar de favoritos">🗑️</button>
                </div>
                `;
            },
            
            // Plantilla para cada tarjeta en el histórico
            tarjetaHistorico: (pokemon, esFavorito) => {
                const nombreFormateado = (pokemon.nombre || '').toLowerCase().replace(/\s+/g,'-');
                const tipos = pokemon.tipos || [];
                
                return `
                <div class="tarjeta-historico" data-id="${pokemon.id}" data-nombre="${nombreFormateado}">
                    <div class="imagen-historico">
                        <img src="${pokemon.imagen}" alt="${pokemon.nombre}">
                    </div>
                    <div class="info-historico">
                        <div>
                            <span class="numero-historico">#${pokemon.id}</span>
                            <span class="nombre-historico">${pokemon.nombre}</span>
                        </div>
                        <div class="habilidades-historico">
                            ${tipos.map(t => `<span class="badge-tipo">${t}</span>`).join(' ')}
                        </div>
                    </div>
                    <button class="boton-favorito" title="${esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}">❤️</button>
                    <button class="boton-eliminar" title="Quitar del histórico">🗑️</button>
                </div>
                `;
            }
        };

        // Módulo principal de búsqueda (para index.html)
        const moduloBusqueda = {
            blinkTimer: null, // Temporizador para el efecto de parpadeo al cargar
            
            utils: {
                // Oculta todos los contenedores de resultados
                ocultarResultados() {
                    try { 
                        if (moduloBusqueda.blinkTimer) { 
                            clearInterval(moduloBusqueda.blinkTimer); 
                            moduloBusqueda.blinkTimer = null; 
                        } 
                    } catch(e) {}
                    
                    if (html.contenedorPokemon) 
                        html.contenedorPokemon.style.display = "none";
                    if (html.contenedorHabilidad) 
                        html.contenedorHabilidad.style.display = "none";
                    if (html.contenedorError) 
                        html.contenedorError.style.display = "none";
                    
                    try {
                        const badgeDerecha = document.getElementById('badge-datos-derecha');
                        if (badgeDerecha) { 
                            badgeDerecha.style.display = 'none'; 
                            badgeDerecha.style.visibility = 'hidden'; 
                        }
                        const badgeIzquierda = document.getElementById('badge-datos-izquierda');
                        if (badgeIzquierda) { 
                            badgeIzquierda.style.display = 'none'; 
                            badgeIzquierda.style.visibility = 'hidden'; 
                        }
                    } catch (e) {}
                },
                
                // Muestra un mensaje de carga con efecto de parpadeo
                mostrarCargando() {
                    moduloBusqueda.utils.ocultarResultados();
                    if (!html.contenedorError) 
                        return;
                    
                    html.contenedorError.style.display = "block";
                    html.contenedorError.className = "mensaje-cargando";
                    html.contenedorError.innerHTML = `<span class="cargando"><strong>CARGANDO DATOS...</strong></span>`;

                    try {
                        // Limpiamos cualquier temporizador anterior
                        if (moduloBusqueda.blinkTimer) { 
                            clearInterval(moduloBusqueda.blinkTimer);
                            moduloBusqueda.blinkTimer = null; 
                        }
                    } catch(e) {}

                    try {
                        // Creamos un efecto de parpadeo para el texto de carga
                        const span = html.contenedorError.querySelector('.cargando');
                        if (span) {
                            span.style.transition = 'opacity 0.08s linear';
                            let visible = true;
                            moduloBusqueda.blinkTimer = setInterval(() => {
                                try {
                                    visible = !visible;
                                    span.style.opacity = visible ? '1' : '0.08';
                                } catch (e) { }
                            }, 120); // Parpadeo rápido cada 120ms
                        }
                    } catch (e) {}
                },
                
                // Muestra un mensaje de error
                mostrarError(mensaje) {
                    moduloBusqueda.utils.ocultarResultados();
                    html.contenedorError.style.display = "block";
                    html.contenedorError.className = "alerta-error";
                    html.contenedorError.textContent = mensaje;
                },
                
                // Crea los badges que indican si los datos vienen de caché o API
                crearBadges() {
                    if (html.contenedorPokemon) {
                        // Creamos el badge izquierdo si no existe
                        if (!html.contenedorPokemon.querySelector('#badge-datos-izquierda')) {
                            const izquierda = document.createElement('div');
                            izquierda.id = 'badge-datos-izquierda';
                            izquierda.className = 'badge-datos badge-datos-izquierda';
                            izquierda.textContent = 'POKEMON_DATA';
                            izquierda.style.display = 'none';
                            izquierda.style.position = 'absolute';
                            izquierda.style.pointerEvents = 'none';
                            html.contenedorPokemon.appendChild(izquierda);
                        }

                        // Creamos el badge derecho si no existe
                        if (!html.contenedorPokemon.querySelector('#badge-datos-derecha')) {
                            const derecha = document.createElement('div');
                            derecha.id = 'badge-datos-derecha';
                            derecha.className = 'badge-datos badge-datos-derecha';
                            derecha.textContent = '';
                            derecha.style.display = 'none';
                            derecha.style.position = 'absolute';
                            derecha.style.pointerEvents = 'none';
                            html.contenedorPokemon.appendChild(derecha);
                        }
                    }
                },
                
                // Posiciona los badges en la tarjeta del pokémon
                posicionarBadges() {
                    const badgeIzquierda = html.contenedorPokemon ? 
                        html.contenedorPokemon.querySelector('#badge-datos-izquierda') : null;
                    const badgeDerecha = html.contenedorPokemon ? 
                        html.contenedorPokemon.querySelector('#badge-datos-derecha') : null;
                    
                    if (!badgeIzquierda && !badgeDerecha) return;
                    
                    // Verificamos si el contenedor está visible
                    const estiloContenedor = window.getComputedStyle(html.contenedorPokemon || document.body);
                    if (!html.contenedorPokemon || estiloContenedor.display === 'none') {
                        if (badgeIzquierda) { 
                            badgeIzquierda.style.display = 'none'; 
                            badgeIzquierda.style.visibility = 'hidden'; 
                        }
                        if (badgeDerecha) { 
                            badgeDerecha.style.display = 'none'; 
                            badgeDerecha.style.visibility = 'hidden'; 
                        }
                        return;
                    }

                    // Aseguramos que el contenedor tenga posición relativa
                    html.contenedorPokemon.style.position = html.contenedorPokemon.style.position || 'relative';
                    
                    // Calculamos posiciones relativas a la imagen del pokémon
                    const rectanguloImagen = html.imagen.getBoundingClientRect();
                    const rectanguloContenedor = html.contenedorPokemon.getBoundingClientRect();
                    const rectanguloReferencia = (rectanguloImagen && rectanguloImagen.width && rectanguloImagen.height) ? 
                        rectanguloImagen : rectanguloContenedor;

                    // Posicionamos el badge izquierdo
                    if (badgeIzquierda) {
                        badgeIzquierda.style.display = 'block';
                        badgeIzquierda.style.visibility = 'hidden';
                        const izquierda = -1;
                        const arriba = -Math.round(badgeIzquierda.offsetHeight / 2) + 12;
                        badgeIzquierda.style.left = izquierda + 'px';
                        badgeIzquierda.style.top = arriba + 'px';
                        badgeIzquierda.style.visibility = 'visible';
                    }
                    
                    // Posicionamos el badge derecho
                    if (badgeDerecha) {
                        badgeDerecha.style.display = 'block';
                        badgeDerecha.style.visibility = 'hidden';
                        const derecha = -1;
                        const arribaDerecha = -Math.round(badgeDerecha.offsetHeight / 2) + 12;
                        badgeDerecha.style.right = derecha + 'px';
                        badgeDerecha.style.top = arribaDerecha + 'px';
                        badgeDerecha.style.visibility = 'visible';
                    }
                }
            },

            api: {
                // Obtiene datos de la especie de un pokémon
                async buscarEspecie(url) {
                    const respuesta = await fetch(url);
                    if (!respuesta.ok) throw new Error();
                    return await respuesta.json();
                },
                
                // Obtiene datos de la cadena de evolución
                async buscarEvolucion(url) {
                    const respuesta = await fetch(url);
                    if (!respuesta.ok) throw new Error();
                    return await respuesta.json();
                }
            },

            render: {
                // Renderiza toda la información de un pokémon
                pokemon(datosPokemon, datosEspecie, datosEvolucion, sprites) {
                    moduloBusqueda.utils.ocultarResultados();
                    html.contenedorPokemon.style.display = "block";

                    // Mostramos la imagen del pokémon
                    html.imagen.innerHTML = `<img src="${datosPokemon.sprites.front_default}" alt="${datosPokemon.name}" class="imagen-pokemon">`;
                    
                    // Mostramos nombre y número
                    html.titulo.textContent = `#${datosPokemon.id} ${datosPokemon.name.toUpperCase()}`;
                    
                    // Mostramos los tipos con badges de colores
                    html.tipos.innerHTML = datosPokemon.types.map(t =>
                        `<span class="badge-tipo">${t.type.name.toUpperCase()}</span>`
                    ).join('');

                    // Separamos habilidades normales de ocultas
                    let habilidadNormal = datosPokemon.abilities.find(a => !a.is_hidden);
                    let habilidadOculta = datosPokemon.abilities.find(a => a.is_hidden);
                    let habilidadesHtml = "";
                    
                    if (habilidadNormal) {
                        habilidadesHtml += `<span class="badge-habilidad-normal">
                            ${habilidadNormal.ability.name.charAt(0).toUpperCase() + habilidadNormal.ability.name.slice(1)}
                        </span>`;
                    }
                    if (habilidadOculta) {
                        habilidadesHtml += `<span class="badge-habilidad-oculta">
                            ${habilidadOculta.ability.name.charAt(0).toUpperCase() + habilidadOculta.ability.name.slice(1)}
                            <span class="habilidad-oculta-etiqueta">(Oculta)</span>
                        </span>`;
                    }
                    html.habilidades.innerHTML = habilidadesHtml;

                    // Renderizamos las estadísticas con barras de progreso
                    html.estadisticas.innerHTML = datosPokemon.stats.map(estadistica => {
                        const maximo = 100; // Valor máximo para normalizar
                        let porcentaje = Math.round((estadistica.base_stat / maximo) * 100);
                        if (porcentaje > 100) porcentaje = 100; // Limitamos al 100%
                        
                        return `
                            <li class="estadistica-pokemon">
                                <span class="nombre-estadistica">${estadistica.stat.name.toUpperCase()}:</span>
                                <div class="barra-externa-estadistica">
                                    <div class="barra-interna-estadistica" style="width: ${porcentaje}%"></div>
                                </div>
                            </li>
                        `;
                    }).join('');

                    // Renderizamos el resto de componentes
                    moduloBusqueda.render.corazon(datosPokemon);
                    moduloBusqueda.render.evolucion(datosPokemon, datosEvolucion, sprites);
                    moduloBusqueda.render.badges();
                },
                
                // Renderiza el botón de favoritos (corazón)
                corazon(datosPokemon) {
                    html.corazon.innerHTML = `<button id="btn-favorito" class="emoji-corazon" title="">❤️</button>`;
                    const boton = document.getElementById('btn-favorito');

                    // Actualiza el tooltip según si es favorito o no
                    function actualizarTitulo() {
                        let favoritos = JSON.parse(localStorage.getItem('favoritos_poke') || "[]");
                        const esFavorito = favoritos.some(f => f.id === datosPokemon.id);
                        boton.title = esFavorito ? "Quitar de favoritos" : "Agregar a favoritos";
                    }
                    actualizarTitulo();

                    // Maneja el clic en el corazón
                    boton.onclick = function() {
                        let favoritos = JSON.parse(localStorage.getItem('favoritos_poke') || "[]");
                        const indice = favoritos.findIndex(f => f.id === datosPokemon.id);

                        if (indice === -1) {
                            // Si no es favorito, lo agregamos
                            const favorito = {
                                id: datosPokemon.id,
                                nombre: datosPokemon.name.toUpperCase(),
                                imagen: datosPokemon.sprites.front_default,
                                tipos: datosPokemon.types.map(t => t.type.name.toUpperCase()),
                                habilidades: datosPokemon.abilities.map(a =>
                                    (a.is_hidden
                                    ? (a.ability.name.charAt(0).toUpperCase() + a.ability.name.slice(1)) + ' (Oculta)'
                                    : (a.ability.name.charAt(0).toUpperCase() + a.ability.name.slice(1))
                                    )
                                )
                            };
                            favoritos.push(favorito);
                        } else {
                            // Si ya es favorito, lo quitamos
                            favoritos.splice(indice, 1);
                        }

                        localStorage.setItem('favoritos_poke', JSON.stringify(favoritos));
                        actualizarTitulo();
                    };
                },
                
                // Renderiza la cadena de evolución
                evolucion(datosPokemon, datosEvolucion, sprites) {
                    let htmlEvolucion = "<span>No disponible.</span>";
                    
                    if (datosEvolucion) {
                        let cadena = datosEvolucion.chain;
                        let nombreBase = cadena.species.name;
                        let hijas = cadena.evolves_to || [];
                        
                        // Caso 1: Cadena lineal (una sola evolución por paso)
                        if (hijas.length === 1) {
                            let otrosNombres = [nombreBase];
                            let actual = hijas[0];
                            // Recorremos toda la cadena lineal
                            while(actual) {
                                otrosNombres.push(actual.species.name);
                                if (!actual.evolves_to || actual.evolves_to.length === 0) break;
                                if (actual.evolves_to.length === 1) {
                                    actual = actual.evolves_to[0];
                                } else {
                                    break;
                                }
                            }
                            
                            // Renderizamos la cadena lineal con flechas
                            htmlEvolucion = `<div class="contenedor-horizontal-evolucion" style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:nowrap;">`;
                            otrosNombres.forEach((nombre, indice) => {
                                const esSeleccionado = nombre.toLowerCase() === datosPokemon.name.toLowerCase();
                                htmlEvolucion += `
                                    <div class="fase-evolucion interactiva-evolucion${esSeleccionado ? " actual-evolucion" : ""}" data-evo-nombre="${nombre.toLowerCase()}" style="text-align:center;">
                                        ${sprites[nombre] ? `<img src="${sprites[nombre]}" alt="${nombre}" class="imagen-evolucion">` : ""}
                                        <div class="nombre-evolucion">${nombre.toUpperCase()}</div>
                                    </div>
                                `;
                                if (indice < otrosNombres.length - 1) {
                                    htmlEvolucion += `<span class="flecha-evolucion" style="color:#ff6b6b;font-weight:bold;font-size:2em;margin:0 10px;display:inline-block;vertical-align:middle;">➔</span>`;
                                }
                            });
                            htmlEvolucion += `</div>`;
                        }
                        // Caso 2: Evolución ramificada (varias evoluciones desde un punto)
                        else if (hijas.length > 1) {
                            const esSeleccionadoBase = nombreBase.toLowerCase() === datosPokemon.name.toLowerCase();
                            htmlEvolucion = `<div class="contenedor-horizontal-evolucion">
                                    <div class="base-evolucion">
                                        <div class="fase-evolucion interactiva-evolucion${esSeleccionadoBase ? " actual-evolucion" : ""}" data-evo-nombre="${nombreBase.toLowerCase()}">
                                            ${sprites[nombreBase]
                                                ? `<img src="${sprites[nombreBase]}" class="imagen-evolucion">`
                                                : ""}
                                            <div class="nombre-evolucion">${nombreBase.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div class="flecha-evolucion">➔</div>
                                    <div class="hijas-horizontal-evolucion">`;

                            hijas.forEach(hijo => {
                                const nombreHijo = hijo.species.name;
                                const esSeleccionadoHijo = nombreHijo.toLowerCase() === datosPokemon.name.toLowerCase();
                                htmlEvolucion += `
                                    <div class="fase-evolucion interactiva-evolucion${esSeleccionadoHijo ? " actual-evolucion" : ""}" data-evo-nombre="${nombreHijo.toLowerCase()}">
                                        ${sprites[nombreHijo]
                                            ? `<img src="${sprites[nombreHijo]}" class="imagen-evolucion">`
                                            : ""}
                                        <div class="nombre-evolucion">${nombreHijo.toUpperCase()}</div>
                                    </div>
                                `;
                            });

                            htmlEvolucion += `
                                    </div>
                                </div>
                            `;
                        }
                        // Caso 3: Sin evoluciones (pokémon básico)
                        else {
                            const esSeleccionado = nombreBase.toLowerCase() === datosPokemon.name.toLowerCase();
                            htmlEvolucion = `
                                <div style="display: flex; justify-content: center;">
                                    <div class="fase-evolucion interactiva-evolucion${esSeleccionado ? " actual-evolucion" : ""}" data-evo-nombre="${nombreBase.toLowerCase()}">
                                        ${sprites[nombreBase] ? `<img src="${sprites[nombreBase]}" alt="${nombreBase}" class="imagen-evolucion">` : ""}
                                        <div class="nombre-evolucion">${nombreBase.toUpperCase()}</div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                    
                    html.evolucion.innerHTML = htmlEvolucion;

                    // Hacemos clicable cada fase de evolución para buscar ese pokémon
                    const elementos = html.evolucion.querySelectorAll('.interactiva-evolucion:not(.actual-evolucion)');
                    elementos.forEach(elemento => {
                        elemento.addEventListener('click', function() {
                            const nombre = this.getAttribute('data-evo-nombre');
                            html.entrada.value = nombre;
                            html.modo.value = "pokemon";
                            moduloBusqueda.handlers.onBuscar();
                        });
                    });
                },
                
                // Actualiza los badges que indican fuente de datos
                badges() {
                    try {
                        const badgeDerecha = document.getElementById('badge-datos-derecha');
                        const badgeIzquierda = document.getElementById('badge-datos-izquierda');
                        
                        if (badgeDerecha) {
                            badgeDerecha.style.display = 'block';
                            badgeDerecha.style.visibility = 'hidden';
                        }
                        if (badgeIzquierda) {
                            badgeIzquierda.style.display = 'block';
                            badgeIzquierda.style.visibility = 'hidden';
                        }

                        // Configuramos el badge derecho según la fuente de datos
                        if (badgeDerecha) {
                            if (state.desdeCache) {
                                badgeDerecha.textContent = 'DESDE CACHÉ';
                                badgeDerecha.classList.remove('fuente-api');
                                badgeDerecha.classList.add('fuente-cache');
                            } else {
                                badgeDerecha.textContent = 'DESDE API';
                                badgeDerecha.classList.remove('fuente-cache');
                                badgeDerecha.classList.add('fuente-api');
                            }
                        }

                        // Posicionamos los badges después de un breve delay
                        setTimeout(() => {
                            try {
                                moduloBusqueda.utils.posicionarBadges();
                                if (badgeIzquierda) badgeIzquierda.style.visibility = 'visible';
                                if (badgeDerecha) badgeDerecha.style.visibility = 'visible';
                            } catch (e) {}
                        }, 20);
                    } catch (e) {}
                },
                
                // Renderiza la información de una habilidad
                habilidad(datosHabilidad, pokemones) {
                    // Buscamos la descripción en español, si no en inglés
                    let efecto = datosHabilidad.effect_entries.find(e => e.language.name === "es")?.effect
                              || datosHabilidad.effect_entries.find(e => e.language.name === "en")?.effect
                              || "Sin descripción.";
                    
                    const nombre = datosHabilidad.name.replace(/-/g, " ").toUpperCase();
                    const idStr = "#" + datosHabilidad.id;
                    
                    moduloBusqueda.utils.ocultarResultados();
                    html.contenedorHabilidad.style.display = "block";
                    
                    // Actualizamos todos los elementos con la información
                    html.tituloHabilidad.textContent = nombre;
                    html.idHabilidad.textContent = idStr;
                    html.efectoHabilidad.textContent = efecto;
                    html.tituloGrid.textContent = `POKÉMON CON ESTA HABILIDAD (${pokemones.length})`;
                    html.grid.innerHTML = pokemones.join("");

                    // Hacemos clicable cada tarjeta de pokémon para buscarlo
                    const tarjetas = html.grid.querySelectorAll(".tarjeta-pokemon-habilidad");
                    tarjetas.forEach(tarjeta => {
                        tarjeta.addEventListener("click", function() {
                            let nombre = this.getAttribute("data-nombre-poke");
                            html.entrada.value = nombre;
                            html.modo.value = "pokemon";
                            moduloBusqueda.handlers.onBuscar();
                        });
                    });
                }
            },

            handlers: {
                // Maneja la búsqueda principal (pokémon o habilidad)
                async onBuscar() {
                    const modo = html.modo.value;
                    const termino = html.entrada.value.trim().toLowerCase();

                    if (!termino) {
                        moduloBusqueda.utils.mostrarError("ERROR: POKÉMON NO ENCONTRADO");
                        return;
                    }

                    moduloBusqueda.utils.mostrarCargando();

                    try {
                        if (modo === "pokemon") {
                            // Buscamos el pokémon (con caché)
                            const resultado = await cacheCompartido.buscarPokemon(termino);
                            
                            // Manejo de fallback si cacheCompartido falla
                            if (!resultado) {
                                const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${termino}`);
                                if (!respuesta.ok)
                                     throw new Error();
                                const datosPokemon = await respuesta.json();
                                
                                // Guardamos en caché para futuras búsquedas
                                const cache = cacheCompartido.obtenerCache();
                                const entrada = { data: datosPokemon, ts: Date.now() };
                                if (datosPokemon.name) 
                                    cache[datosPokemon.name.toString().toLowerCase()] = entrada;
                                if (datosPokemon.id !== undefined && datosPokemon.id !== null) 
                                    cache[String(datosPokemon.id)] = entrada;
                                cacheCompartido.establecerCache(cache);
                                
                                state.desdeCache = false;
                                state.datosActuales = datosPokemon;
                            } else {
                                state.desdeCache = resultado.fromCache;
                                state.datosActuales = resultado.data;
                            }

                            // Obtenemos datos adicionales: especie y evolución
                            const datosEspecie = await moduloBusqueda.api.buscarEspecie(state.datosActuales.species.url);
                            
                            let datosEvolucion = null;
                            let sprites = {};
                            
                            // Si tiene cadena de evolución, la obtenemos
                            if (datosEspecie.evolution_chain?.url) {
                                datosEvolucion = await moduloBusqueda.api.buscarEvolucion(datosEspecie.evolution_chain.url);
                                
                                if (datosEvolucion) {
                                    let cadena = datosEvolucion.chain;
                                    let nombreBase = cadena.species.name;
                                    let hijas = cadena.evolves_to || [];
                                    let todosNombres = [nombreBase];

                                    // Recolectamos todos los nombres en la cadena
                                    hijas.forEach(h => {
                                        todosNombres.push(h.species.name);
                                        if (h.evolves_to && h.evolves_to.length > 0) {
                                            h.evolves_to.forEach(nieto => {
                                                todosNombres.push(nieto.species.name);
                                            });
                                        }
                                    });

                                    // Obtenemos los sprites de todos los pokémon en la cadena
                                    await Promise.all(todosNombres.map(async (nombre) => {
                                        try {
                                            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
                                            if (res.ok) {
                                                const data = await res.json();
                                                sprites[nombre] = data.sprites.front_default || "";
                                            } else {
                                                sprites[nombre] = "";
                                            }
                                        } catch {
                                            sprites[nombre] = "";
                                        }
                                    }));
                                }
                            }

                            // Agregamos al historial y renderizamos
                            cacheCompartido.agregarAlHistorico(state.datosActuales);
                            moduloBusqueda.render.pokemon(state.datosActuales, datosEspecie, datosEvolucion, sprites);
                            
                        } else if (modo === "habilidad") {
                            // Búsqueda de habilidad
                            const respuesta = await fetch(`https://pokeapi.co/api/v2/ability/${termino}`);
                            if (!respuesta.ok) {
                                moduloBusqueda.utils.mostrarError("ERROR: HABILIDAD NO ENCONTRADA");
                                return;
                            }
                            const datosHabilidad = await respuesta.json();
                            
                            // Obtenemos todos los pokémon que tienen esta habilidad
                            const arregloPokemones = datosHabilidad.pokemon;
                            const pokemonesHtml = await Promise.all(arregloPokemones.map(async infoPokemon => {
                                let numeroPokemon = infoPokemon.pokemon.url.split("/").filter(Boolean).pop();
                                let urlImagen = "";
                                
                                // Intentamos obtener la imagen de cada pokémon
                                try {
                                    const respuestaPokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${numeroPokemon}`);
                                    if (respuestaPokemon.ok) {
                                        const datosPokemon = await respuestaPokemon.json();
                                        urlImagen = datosPokemon.sprites.front_default || "";
                                    }
                                } catch {}
                                
                                // Creamos la tarjeta para este pokémon
                                return `
                                    <div class="tarjeta-pokemon-habilidad" data-nombre-poke="${infoPokemon.pokemon.name}">
                                        <img class="imagen-pokemon-habilidad" src="${urlImagen}" alt="${infoPokemon.pokemon.name}">
                                        <div class="nombre-pokemon-habilidad">
                                          ${infoPokemon.pokemon.name.replace(/-/g," ").toUpperCase()}
                                          ${infoPokemon.is_hidden ? '<span class="texto-oculto-habilidad"> (oculta)</span>' : ''}
                                        </div>
                                    </div>
                                `;
                            }));

                            moduloBusqueda.render.habilidad(datosHabilidad, pokemonesHtml);
                        }
                    } catch (e) {
                        moduloBusqueda.utils.mostrarError("ERROR: POKÉMON NO ENCONTRADO");
                    }
                },
                
                // Maneja la tecla Enter en el campo de búsqueda
                onEnter(e) {
                    if (e.key === 'Enter') moduloBusqueda.handlers.onBuscar();
                }
            },

            init() {
                if (PaginaBusqueda) {
                    moduloBusqueda.utils.crearBadges();
                    
                    // Asignamos event listeners
                    if (html.boton) {
                        html.boton.addEventListener('click', moduloBusqueda.handlers.onBuscar);
                    }
                    if (html.entrada) {
                        html.entrada.addEventListener('keydown', moduloBusqueda.handlers.onEnter);
                    }
                    
                    // Configuramos el reposicionamiento de badges en redimensiones
                    let timeoutPosicionamiento = null;
                    function programarPosicionamiento() {
                        if (timeoutPosicionamiento) clearTimeout(timeoutPosicionamiento);
                        timeoutPosicionamiento = setTimeout(moduloBusqueda.utils.posicionarBadges, 40);
                    }

                    window.addEventListener('resize', programarPosicionamiento);
                    window.addEventListener('scroll', programarPosicionamiento, { passive: true });

                    // Exponemos la función para uso externo si es necesario
                    window.__posicionarBadgesPokemon = programarPosicionamiento;
                    
                    // Comprobamos si hay una búsqueda pendiente desde el histórico
                    try {
                        const busquedaDesdeHistorico = localStorage.getItem('busqueda_desde_historico');
                        if (busquedaDesdeHistorico) {
                            html.entrada.value = busquedaDesdeHistorico;
                            html.modo.value = "pokemon";
                            localStorage.removeItem('busqueda_desde_historico');
                            moduloBusqueda.handlers.onBuscar();
                        }
                    } catch (e) {}
                }
            }
        };

        // Módulo de batalla (para vs.html)
        const moduloBatalla = {
            calculos: {
                // Calcula el multiplicador de daño entre tipos
                async multiplicadorTipo(tiposAtacante, tiposDefensor) {
                    let multiplicador = 1;
                    for (const a of tiposAtacante) {
                        const datosTipo = await cacheCompartido.obtenerDatosTipo(a.toLowerCase());
                        if (!datosTipo) continue;
                        
                        const relaciones = datosTipo.damage_relations;
                        for (const d of tiposDefensor) {
                            const dLower = d.toString().toLowerCase();
                            // Verificamos relaciones de daño
                            if (relaciones.double_damage_to.some(x => x.name === dLower)) 
                                multiplicador *= 2;
                            if (relaciones.half_damage_to.some(x => x.name === dLower)) 
                                multiplicador *= 0.5;
                            if (relaciones.no_damage_to.some(x => x.name === dLower)) 
                                multiplicador *= 0;
                        }
                    }
                    return multiplicador;
                },
                
                // Suma todas las estadísticas base de un pokémon
                sumarEstadisticasBase(datosPokemon) {
                   if (!datosPokemon || !datosPokemon.stats) return 0;
                    let total = 0;
                    for (const stat of datosPokemon.stats) {
                        total += stat.base_stat || 0;
                    }
                    return total;
                }
            },

            render: {
                // Renderiza una tarjeta de pokémon en la página de batalla
                tarjeta(elementoDestino, datosPokemon, fromCache) {
                    if (!elementoDestino) return;
                    
                    const imagen = datosPokemon.sprites && 
                        (datosPokemon.sprites.front_default || 
                         (datosPokemon.sprites.other && 
                          datosPokemon.sprites.other['official-artwork'] && 
                          datosPokemon.sprites.other['official-artwork'].front_default)) 
                        ? (datosPokemon.sprites.front_default || datosPokemon.sprites.other['official-artwork'].front_default) 
                        : '';
                    
                    const tipos = (datosPokemon.types || []).map(t => t.type.name.toUpperCase());
                    const id = datosPokemon.id;
                    const nombre = (datosPokemon.name || '').toUpperCase();

                    elementoDestino.innerHTML = `
                        <div class="contenido-tarjeta">
                            <div class="badge-tarjeta-vs ${fromCache ? 'cache' : 'api'}">${fromCache ? '📦CACHÉ' : '🪩API'}</div>
                            <img class="imagen-tarjeta-vs" src="${imagen}" alt="${nombre}">
                            <div class="nombre-tarjeta-vs">#${id} ${nombre}</div>
                            <div class="tipos-tarjeta-vs">
                                ${tipos.map(t => `<div class="tipo-tarjeta-vs">${t}</div>`).join('')}
                            </div>
                            <div class="corazon-tarjeta-vs">❤</div>
                        </div>
                    `;

                    // Actualizamos el estado de la batalla y guardamos los datos
                    moduloBatalla.handlers.actualizarEstadoBatalla();
                    try { 
                        elementoDestino.__pokeData = datosPokemon; 
                    } catch(e){}
                },
                
                // Renderiza una tarjeta de resultado con puntaje
                tarjetaResultado(elemento, datosPokemon, fromCache, puntaje) {
                    if (!elemento) return;
                    
                    const imagen = datosPokemon.sprites && 
                        (datosPokemon.sprites.front_default || 
                         (datosPokemon.sprites.other && 
                          datosPokemon.sprites.other['official-artwork'] && 
                          datosPokemon.sprites.other['official-artwork'].front_default)) 
                        ? (datosPokemon.sprites.front_default || datosPokemon.sprites.other['official-artwork'].front_default) 
                        : '';
                    
                    const tipos = (datosPokemon.types || []).map(t => t.type.name.toUpperCase());
                    const id = datosPokemon.id;
                    const nombre = (datosPokemon.name || '').toUpperCase();
                    
                    elemento.innerHTML = `
                        <div class="contenido-tarjeta">
                            <div class="badge-tarjeta-vs ${fromCache ? 'cache' : 'api'}">${fromCache ? 'CACHÉ' : 'API'}</div>
                            <img class="imagen-tarjeta-vs" src="${imagen}" alt="${nombre}">
                            <div class="nombre-tarjeta-vs">${nombre}</div>
                            <div class="tipos-tarjeta-vs">
                                ${tipos.map(t => `<div class="tipo-tarjeta-vs">${t}</div>`).join('')}
                            </div>
                            <div class="linea-punteada-tarjeta">--------</div>
                            <div class="puntaje-tarjeta-vs">${puntaje.toFixed(1)} pts</div>
                            <div class="corazon-tarjeta-vs">❤</div>
                        </div>
                    `;
                },
                
                // Renderiza la comparación de estadísticas lado a lado
                comparacionEstadisticas(pokemon1, pokemon2) {
                    const stats = ['hp','attack','defense','special-attack','special-defense','speed'];
                    const labels = {
                        'hp': 'HP',
                        'attack': 'ATK',
                        'defense': 'DEF',
                        'special-attack': 'SP.ATK',
                        'special-defense': 'SP.DEF',
                        'speed': 'SPD'
                    };
                    
                    html.comparacionEstadisticas.innerHTML = '';
                    
                    stats.forEach(statKey => {
                        const stat1 = (pokemon1.stats.find(s => s.stat.name === statKey)?.base_stat) || 0;
                        const stat2 = (pokemon2.stats.find(s => s.stat.name === statKey)?.base_stat) || 0;

                        // Normalizamos los valores para que la suma no exceda 100%
                        let pct1 = Math.min(100, Math.round((stat1 / 100) * 100));
                        let pct2 = Math.min(100, Math.round((stat2 / 100) * 100));

                        if (pct1 + pct2 > 100) {
                            const escala = 100 / (pct1 + pct2);
                            pct1 = Math.round(pct1 * escala);
                            pct2 = Math.round(pct2 * escala);
                        }
                        
                        // Determinamos cuál es mayor para resaltarlo
                        const izquierdaMayor = stat1 > stat2;
                        const derechaMayor = stat2 > stat1;
                        
                        const fila = document.createElement('div');
                        fila.className = 'fila-estadistica';

                        // Mapa de colores para cada estadística
                        const mapaColores = {
                            'hp': { left: '#9fff7a', right: '#ffd54d' },
                            'attack': { left: '#3fe6df', right: '#9fff7a' },
                            'defense': { left: '#3fe6df', right: '#ffd54d' },
                            'special-attack': { left: '#9fff7a', right: '#ffd54d' },
                            'special-defense': { left: '#9fff7a', right: '#ffd54d' },
                            'speed': { left: '#3fe6df', right: '#9fff7a' }
                        };
                        const colores = mapaColores[statKey] || { left: '#3fe6df', right: '#9fff7a' };

                        // Calculamos el ancho de las barras
                        const llenadoIzquierda = Math.min(50, Math.round((stat1 / 100) * 50));
                        const llenadoDerecha = Math.min(50, Math.round((stat2 / 100) * 50));
                        
                        fila.innerHTML = `
                            <div class="numero-estadistica ${izquierdaMayor ? 'mayor' : ''}">${stat1}</div>
                            <div class="barra-externa-estadistica barra-centro">
                                <div class="relleno-izquierda" style="width:${llenadoIzquierda}%; background:${colores.left};"></div>
                                <div class="relleno-derecha" style="width:${llenadoDerecha}%; background:${colores.right};"></div>
                                <div class="etiqueta-centro">${labels[statKey] || statKey.toUpperCase()}</div>
                            </div>
                            <div class="numero-estadistica ${derechaMayor ? 'mayor' : ''}">${stat2}</div>
                        `;
                        html.comparacionEstadisticas.appendChild(fila);
                    });
                },
                
                // Muestra el cálculo detallado del puntaje
                calculoPuntaje(pokemon1, pokemon2, multiplicador1, multiplicador2, puntaje1, puntaje2) {
                    const nombre1 = (pokemon1 && pokemon1.name) ? pokemon1.name.toLowerCase() : 'pokemon 1';
                    const nombre2 = (pokemon2 && pokemon2.name) ? pokemon2.name.toLowerCase() : 'pokemon 2';
                    
                    html.calculoPuntaje.innerHTML = `
                        <pre style="white-space:pre-wrap;font-family:inherit;text-align:left;">
    <strong>Stats Base Total:</strong> ${nombre1}: ${moduloBatalla.calculos.sumarEstadisticasBase(pokemon1)} | ${nombre2}: ${moduloBatalla.calculos.sumarEstadisticasBase(pokemon2)}
    <strong>Multiplicador de Tipo:</strong> ${nombre1}: x${multiplicador1.toFixed(2)} | ${nombre2}: x${multiplicador2.toFixed(2)}
    <strong>Puntaje Final:</strong> ${nombre1}: ${puntaje1.toFixed(1)} | ${nombre2}: ${puntaje2.toFixed(1)}
                        </pre>
                    `;
                },
                
                // Muestra las ventajas de tipo entre los dos pokémon
                async ventajasTipo(pokemon1, pokemon2, multiplicador1, multiplicador2) {
                    html.elementoVentajas.innerHTML = '<p>⚡ VENTAJAS DE TIPO</p><div class="divisor-ventaja"></div>';
                    
                    // Función auxiliar para generar una frase descriptiva de la ventaja
                    async function fraseResumen(tiposAtacante, tiposDefensor, multiplicador) {
                        const atk = (tiposAtacante || []).map(t => t.toLowerCase());
                        const def = (tiposDefensor || []).map(t => t.toLowerCase());

                        // Verificamos relaciones específicas de tipo
                        for (const a of atk) {
                            const datosTipo = await cacheCompartido.obtenerDatosTipo(a);
                            if (!datosTipo) continue;
                            const relaciones = datosTipo.damage_relations;
                            for (const d of def) {
                                if (relaciones.double_damage_to.some(x => x.name === d)) 
                                    return `${a} es súper efectivo contra ${d}`;
                                if (relaciones.half_damage_to.some(x => x.name === d)) 
                                    return `${a} es poco efectivo contra ${d}`;
                                if (relaciones.no_damage_to.some(x => x.name === d)) 
                                    return `${a} no es efectivo contra ${d}`;
                            }
                        }

                        // Frases genéricas basadas en el multiplicador
                        if (multiplicador === 0) return `${atk.join('/')} no es efectivo contra ${def.join('/')}`;
                        if (multiplicador < 1) return `${atk.join('/')} es poco efectivo contra ${def.join('/')}`;
                        if (multiplicador > 1) return `${atk.join('/')} es súper efectivo contra ${def.join('/')}`;
                        return `${atk.join('/')} tiene efecto neutro contra ${def.join('/')}`;
                    }

                    // Creamos las cajas para cada dirección del ataque
                    const caja1 = document.createElement('div');
                    caja1.className = 'caja-ventaja ' + 
                        (multiplicador1>1 ? 'doble' : (multiplicador1<1 ? 'mitad' : 'neutra'));
                    caja1.innerHTML = `
                        <div class="encabezado-ventaja">${pokemon1.name.toLowerCase()} vs ${pokemon2.name.toLowerCase()}: 
                            <span class="multiplicador-ventaja">x${multiplicador1.toFixed(2)}</span>
                        </div>
                        <div class="cuerpo-ventaja"><div class="linea-ventaja">Cargando...</div></div>
                    `;
                    
                    const caja2 = document.createElement('div');
                    caja2.className = 'caja-ventaja ' + 
                        (multiplicador2>1 ? 'doble' : (multiplicador2<1 ? 'mitad' : 'neutra'));
                    caja2.innerHTML = `
                        <div class="encabezado-ventaja">${pokemon2.name.toLowerCase()} vs ${pokemon1.name.toLowerCase()}: 
                            <span class="multiplicador-ventaja">x${multiplicador2.toFixed(2)}</span>
                        </div>
                        <div class="cuerpo-ventaja"><div class="linea-ventaja">Cargando...</div></div>
                    `;
                    
                    html.elementoVentajas.appendChild(caja1);
                    html.elementoVentajas.appendChild(caja2);

                    // Llenamos las frases descriptivas
                    try {
                        const frase1 = await fraseResumen(
                            (pokemon1.types || []).map(t => t.type.name.toLowerCase()),
                            (pokemon2.types || []).map(t => t.type.name.toLowerCase()),
                            multiplicador1
                        );
                        const frase2 = await fraseResumen(
                            (pokemon2.types || []).map(t => t.type.name.toLowerCase()),
                            (pokemon1.types || []).map(t => t.type.name.toLowerCase()),
                            multiplicador2
                        );
                        
                        caja1.querySelector('.linea-ventaja').textContent = frase1;
                        caja2.querySelector('.linea-ventaja').textContent = frase2;
                    } catch (e) {}
                }
            },

            handlers: {
                // Maneja la búsqueda de un pokémon en la página de batalla
                async onBuscar(entradaElemento, tarjetaElemento) {
                    const termino = entradaElemento.value.trim();
                    if (!termino) return;

                    // Limpiamos resultados anteriores
                    moduloBatalla.handlers.limpiarResultadosBatalla();

                    // Mostramos estado de carga
                    tarjetaElemento.innerHTML = '<div class="contenido-tarjeta" style="align-items:center;justify-content:center;font-size:14px;">Cargando...</div>';
                    
                    try {
                        const resultado = await cacheCompartido.buscarPokemon(termino);
                        moduloBatalla.render.tarjeta(tarjetaElemento, resultado.data, resultado.fromCache);

                        // Si es una búsqueda nueva (no de caché), la agregamos al histórico
                        if (resultado && resultado.fromCache === false) {
                            try { 
                                cacheCompartido.agregarAlHistorico(resultado.data); 
                            } catch(e){}
                        }
                    } catch (e) {
                        // Mostramos error si no se encuentra el pokémon
                        tarjetaElemento.innerHTML = '<div class="contenido-tarjeta" style="align-items:center;justify-content:center;font-size:14px;color:#900;">No encontrado</div>';
                        moduloBatalla.handlers.actualizarEstadoBatalla();
                    }
                },
                
                // Limpia todos los resultados de batalla
                limpiarResultadosBatalla() {
                    try {
                        if (html.resultadoBatalla) html.resultadoBatalla.style.display = 'none';
                        if (html.centroTarjetas) html.centroTarjetas.style.display = '';
                        if (html.tarjetaResultado1) { 
                            html.tarjetaResultado1.innerHTML = ''; 
                            html.tarjetaResultado1.__pokeData = null; 
                        }
                        if (html.tarjetaResultado2) { 
                            html.tarjetaResultado2.innerHTML = ''; 
                            html.tarjetaResultado2.__pokeData = null; 
                        }
                        if (html.tarjetaResultado1) { html.tarjetaResultado1.classList.remove('ganador'); }
                        if (html.tarjetaResultado2) { html.tarjetaResultado2.classList.remove('ganador'); }
                        if (html.rectanguloOverlay) { 
                            html.rectanguloOverlay.classList.remove('activo'); 
                            html.rectanguloOverlay.onclick = null; 
                        }
                    } catch (e) {}
                },
                
                // Actualiza el estado del botón de batalla (activado/desactivado)
                actualizarEstadoBatalla() {
                    const existe1 = html.tarjeta1 && html.tarjeta1.querySelector('.contenido-tarjeta') && html.tarjeta1.querySelector('.nombre-tarjeta-vs');
                    const existe2 = html.tarjeta2 && html.tarjeta2.querySelector('.contenido-tarjeta') && html.tarjeta2.querySelector('.nombre-tarjeta-vs');
                    
                    // Activamos el botón de batalla solo si ambos pokémon están cargados
                    if (existe1 && existe2) {
                        if (html.cajaInferior) html.cajaInferior.style.display = 'none';
                        if (html.rectanguloOverlay) {
                            html.rectanguloOverlay.classList.add('activo');
                            html.rectanguloOverlay.onclick = () => { 
                                if (html.rectanguloOverlay.classList.contains('activo')) 
                                    moduloBatalla.handlers.ejecutarBatalla(); 
                            };
                        }
                    } else {
                        if (html.cajaInferior) html.cajaInferior.style.display = '';
                        if (html.rectanguloOverlay) {
                            html.rectanguloOverlay.classList.remove('activo');
                            html.rectanguloOverlay.onclick = null;
                        }
                    }
                },
                
                // Ejecuta la batalla calculando resultados
                async ejecutarBatalla() {
                    if (!html.rectanguloOverlay || !html.rectanguloOverlay.classList.contains('activo')) return;

                    // Ocultamos el botón central
                    if (html.centroTarjetas) html.centroTarjetas.style.display = 'none';
                    
                    // Obtenemos los datos de los pokémon
                    const pokemon1 = html.tarjetaResultado1.__pokeData || document.getElementById('card1')?.__pokeData;
                    const pokemon2 = html.tarjetaResultado2.__pokeData || document.getElementById('card2')?.__pokeData;
                    
                    if (!pokemon1 || !pokemon2) return;

                    // Calculamos multiplicadores de tipo
                    const tiposAtaque1 = (pokemon1.types || []).map(t => t.type.name.toLowerCase());
                    const tiposAtaque2 = (pokemon2.types || []).map(t => t.type.name.toLowerCase());
                    
                    const multiplicador1 = await moduloBatalla.calculos.multiplicadorTipo(tiposAtaque1, tiposAtaque2);
                    const multiplicador2 = await moduloBatalla.calculos.multiplicadorTipo(tiposAtaque2, tiposAtaque1);

                    // Calculamos puntajes
                    const base1 = moduloBatalla.calculos.sumarEstadisticasBase(pokemon1);
                    const base2 = moduloBatalla.calculos.sumarEstadisticasBase(pokemon2);
                    const puntaje1 = base1 * multiplicador1;
                    const puntaje2 = base2 * multiplicador2;

                    // Renderizamos resultados
                    moduloBatalla.render.tarjetaResultado(html.tarjetaResultado1, pokemon1, false, puntaje1);
                    moduloBatalla.render.tarjetaResultado(html.tarjetaResultado2, pokemon2, false, puntaje2);

                    // Determinamos y marcamos al ganador
                    try {
                        [html.tarjetaResultado1, html.tarjetaResultado2].forEach(rc => { 
                            try { 
                                const b = rc && rc.querySelector && rc.querySelector('.insignia-ganador'); 
                                if (b) b.remove(); 
                            } catch(e) {} 
                        });
                        
                        html.tarjetaResultado1.classList.remove('ganador');
                        html.tarjetaResultado2.classList.remove('ganador');
                        
                        if (puntaje1 > puntaje2) {
                            html.tarjetaResultado1.classList.add('ganador');
                            try { 
                                const insignia = document.createElement('div'); 
                                insignia.className = 'insignia-ganador'; 
                                insignia.textContent = '🏆 GANADOR'; 
                                html.tarjetaResultado1.appendChild(insignia); 
                            } catch(e) {}
                        } else if (puntaje2 > puntaje1) {
                            html.tarjetaResultado2.classList.add('ganador');
                            try { 
                                const insignia = document.createElement('div'); 
                                insignia.className = 'insignia-ganador'; 
                                insignia.textContent = '🏆 GANADOR'; 
                                html.tarjetaResultado2.appendChild(insignia); 
                            } catch(e) {}
                        }
                    } catch(e) {}

                    // Renderizamos análisis detallado
                    await moduloBatalla.render.ventajasTipo(pokemon1, pokemon2, multiplicador1, multiplicador2);
                    moduloBatalla.render.comparacionEstadisticas(pokemon1, pokemon2);
                    moduloBatalla.render.calculoPuntaje(pokemon1, pokemon2, multiplicador1, multiplicador2, puntaje1, puntaje2);

                    // Mostramos la sección de resultados
                    if (html.resultadoBatalla) html.resultadoBatalla.style.display = '';
                    if (html.cajaInferior) html.cajaInferior.style.display = 'none';
                },
                
                // Maneja la tecla Enter en los campos de búsqueda
                onEnter(entrada, boton) {
                    return (e) => { 
                        if (e.key === 'Enter') boton.click(); 
                    };
                }
            },

            init() {
                if (PaginaBatalla) {
                    // Configuramos los botones de búsqueda para ambos pokémon
                    if (html.boton1 && html.entrada1 && html.tarjeta1) {
                        html.boton1.addEventListener('click', 
                            () => moduloBatalla.handlers.onBuscar(html.entrada1, html.tarjeta1));
                        html.entrada1.addEventListener('keydown', 
                            moduloBatalla.handlers.onEnter(html.entrada1, html.boton1));
                    }
                    
                    if (html.boton2 && html.entrada2 && html.tarjeta2) {
                        html.boton2.addEventListener('click', 
                            () => moduloBatalla.handlers.onBuscar(html.entrada2, html.tarjeta2));
                        html.entrada2.addEventListener('keydown', 
                            moduloBatalla.handlers.onEnter(html.entrada2, html.boton2));
                    }
                }
            }
        };

        // Módulo para manejar las listas de favoritos e histórico
        const moduloListas = {
            utils: {
                // Carga el estado desde localStorage
                cargarEstado() {
                    if (PaginaFavoritos) {
                        state.favoritos = JSON.parse(localStorage.getItem("favoritos_poke") || "[]");
                    } else if (PaginaHistorico) {
                        state.historico = JSON.parse(localStorage.getItem("historico_poke") || "[]");
                        state.favoritos = JSON.parse(localStorage.getItem("favoritos_poke") || "[]");
                    }
                },
                
                // Guarda los favoritos en localStorage
                guardarFavoritos() {
                    localStorage.setItem('favoritos_poke', JSON.stringify(state.favoritos));
                },
                
                // Guarda el histórico en localStorage
                guardarHistorico() {
                    localStorage.setItem("historico_poke", JSON.stringify(state.historico));
                },
                
                // Muestra el mensaje de lista vacía
                renderizarVacio() {
                    if (PaginaFavoritos) {
                        html.contenedorFavoritos.innerHTML = templates.vacioFavoritos();
                        if (html.botonLimpiarFavoritos) {
                            html.botonLimpiarFavoritos.style.display = 'none';
                        }
                    } else if (PaginaHistorico) {
                        html.contenedorHistorico.innerHTML = templates.vacioHistorico();
                    }
                },
                
                // Muestra el botón de limpiar favoritos
                mostrarBotonLimpiarFavoritos() {
                    if (html.botonLimpiarFavoritos) {
                        html.botonLimpiarFavoritos.style.display = 'inline-block';
                    }
                },
                
                // Actualiza la vista de favoritos
                actualizarVistaFavoritos() {
                    moduloListas.utils.cargarEstado();
                    
                    if (state.favoritos.length === 0) {
                        moduloListas.utils.renderizarVacio();
                        return;
                    }
                    
                    moduloListas.utils.mostrarBotonLimpiarFavoritos();
                    
                    // Mostramos en orden inverso (más recientes primero)
                    const listaReversa = state.favoritos.slice().reverse();
                    
                    html.contenedorFavoritos.innerHTML = listaReversa.map(favorito => 
                        templates.tarjetaFavoritos(favorito)
                    ).join('');

                    moduloListas.handlers.asignarEventosFavoritos();
                },
                
                // Actualiza la vista del histórico
                actualizarVistaHistorico() {
                    moduloListas.utils.cargarEstado();
                    
                    if (state.historico.length === 0) {
                        moduloListas.utils.renderizarVacio();
                        return;
                    }
                    
                    // Mostramos en orden inverso (más recientes primero)
                    const historicoReverso = state.historico.slice().reverse();
                    
                    html.contenedorHistorico.innerHTML = historicoReverso.map(pokemon => {
                        const esFavorito = state.favoritos.some(f => f.id === pokemon.id);
                        return templates.tarjetaHistorico(pokemon, esFavorito);
                    }).join('');
                    
                    moduloListas.handlers.asignarEventosHistorico();
                }
            },

            handlers: {
                // Asigna eventos a los elementos de favoritos
                asignarEventosFavoritos() {
                    const root = html.contenedorFavoritos || document;
                    root.querySelectorAll('.boton-eliminar').forEach(boton => {
                        boton.onclick = moduloListas.handlers.onBorrarFavorito;
                    });

                    root.querySelectorAll('.tarjeta-historico').forEach(tarjeta => {
                        tarjeta.onclick = moduloListas.handlers.onClickTarjeta;
                    });
                },
                
                // Asigna eventos a los elementos del histórico
                asignarEventosHistorico() {
                    const root = html.contenedorHistorico || document;
                    root.querySelectorAll('.boton-eliminar').forEach(boton => {
                        boton.onclick = moduloListas.handlers.onBorrarHistorico;
                    });
                    
                    root.querySelectorAll('.boton-favorito').forEach(boton => {
                        boton.onclick = moduloListas.handlers.onToggleFavorito;
                    });
                    
                    root.querySelectorAll('.tarjeta-historico').forEach(tarjeta => {
                        tarjeta.onclick = moduloListas.handlers.onClickTarjeta;
                    });
                },
                
                // Maneja la limpieza de todos los favoritos
                onLimpiarFavoritos() {
                    if (confirm('¿Seguro que deseas borrar todos los favoritos?')) {
                        localStorage.removeItem('favoritos_poke');
                        moduloListas.utils.actualizarVistaFavoritos();
                    }
                },
                
                // Maneja la limpieza de todo el histórico
                onLimpiarHistorico() {
                    if (confirm("¿Seguro que deseas borrar todo el histórico?")) {
                        localStorage.removeItem("historico_poke");
                        moduloListas.utils.actualizarVistaHistorico();
                    }
                },
                
                // Elimina un pokémon de favoritos
                onBorrarFavorito(e) {
                    e.stopPropagation(); // Evita que el clic se propague a la tarjeta
                    const el = e.target.closest('.tarjeta-historico');
                    const id = parseInt(el && el.dataset && el.dataset.id);
                    state.favoritos = state.favoritos.filter(p => p.id !== id);
                    moduloListas.utils.guardarFavoritos();
                    moduloListas.utils.actualizarVistaFavoritos();
                },
                
                // Elimina un pokémon del histórico
                onBorrarHistorico(e) {
                    e.stopPropagation();
                    const id = parseInt(e.target.closest('.tarjeta-historico').dataset.id);
                    state.historico = state.historico.filter(p => p.id !== id);
                    moduloListas.utils.guardarHistorico();
                    moduloListas.utils.actualizarVistaHistorico();
                },
                
                // Agrega o quita un pokémon de favoritos desde el histórico
                onToggleFavorito(e) {
                    e.stopPropagation();
                    const id = parseInt(e.target.closest('.tarjeta-historico').dataset.id);
                    const pokemon = state.historico.find(p => p.id === id);
                    const indice = state.favoritos.findIndex(f => f.id === id);
                    
                    if (indice === -1) {
                        // Agregar a favoritos
                        state.favoritos.push({
                            id: pokemon.id,
                            nombre: pokemon.nombre,
                            imagen: pokemon.imagen,
                            tipos: pokemon.tipos || [],
                            habilidades: pokemon.habilidades || []
                        });
                    } else {
                        // Quitar de favoritos
                        state.favoritos.splice(indice, 1);
                    }
                    
                    moduloListas.utils.guardarFavoritos();
                    moduloListas.utils.actualizarVistaHistorico();
                },
                
                // Maneja el clic en una tarjeta para buscar ese pokémon
                onClickTarjeta(e) {
                    // No hacemos nada si se hizo clic en botones de acción
                    if (e.target.closest('.boton-eliminar') || e.target.closest('.boton-favorito')) return;

                    const tarjeta = e.currentTarget;
                    const id = tarjeta.dataset.id;
                    const nombreAttr = tarjeta.getAttribute('data-nombre');
                    let nombre = '';
                    
                    // Preferimos usar ID si está disponible, si no el nombre
                    if (id !== undefined && id !== null && String(id).trim() !== '') {
                        nombre = String(id).trim();
                    } else if (nombreAttr) {
                        nombre = String(nombreAttr).trim();
                    }
                    
                    if (nombre) {
                        // Guardamos la búsqueda para que se ejecute al volver a index.html
                        localStorage.setItem('busqueda_desde_historico', nombre.toLowerCase());
                    }
                    
                    // Redirigimos a la página de búsqueda
                    window.location.href = 'index.html';
                }
            },

            init() {
                if (PaginaFavoritos) {
                    if (html.botonLimpiarFavoritos) {
                        html.botonLimpiarFavoritos.addEventListener("click", moduloListas.handlers.onLimpiarFavoritos);
                    }
                    
                    moduloListas.utils.actualizarVistaFavoritos();
                    
                    // Escuchamos cambios en localStorage desde otras pestañas
                    window.addEventListener('storage', function(e) {
                        if (e.key === 'favoritos_poke') {
                            moduloListas.utils.actualizarVistaFavoritos();
                        }
                    });
                } else if (PaginaHistorico) {
                    if (html.botonLimpiarHistorico) {
                        html.botonLimpiarHistorico.addEventListener("click", moduloListas.handlers.onLimpiarHistorico);
                    }
                    
                    moduloListas.utils.actualizarVistaHistorico();
                    
                    window.addEventListener('storage', function(e) {
                        if (e.key === 'historico_poke' || e.key === 'favoritos_poke') {
                            moduloListas.utils.actualizarVistaHistorico();
                        }
                    });
                }
            }
        };

        // Módulo principal que inicializa toda la aplicación
        return {
            init() {
                // Limpiamos caché expirada al iniciar
                cacheCompartido.limpiarCacheExpirado();
                
                // Inicializamos el módulo correspondiente según la página
                if (PaginaBusqueda) {
                    moduloBusqueda.init();
                }
                
                if (PaginaBatalla) {
                    moduloBatalla.init();
                }
                
                if (PaginaFavoritos || PaginaHistorico) {
                    moduloListas.init();
                }
            }
        };
    })();
    
    // Inicializamos la aplicación
    pokemonTodo.init();
    
    // Gestión del estado activo en la barra de navegación
    try {
        (function() {
            const navItems = Array.from(document.querySelectorAll('.navegacion a, .navegacion button'));
            const botonBuscar = document.getElementById('boton-buscar');

            // Función auxiliar para extraer la clave de navegación de una URL
            function keyFromHref(href) {
                if (!href) return '';
                return href.split('/').filter(Boolean).pop();
            }

            // Intentamos cargar el estado guardado
            const stored = localStorage.getItem('nav_active');
            if (stored) {
                navItems.forEach(i => {
                    const href = i.getAttribute && i.getAttribute('href');
                    const key = keyFromHref(href) || i.dataset.key || '';
                    i.classList.toggle('active', key === stored || i.id === stored);
                });
                if (botonBuscar && stored === 'buscar') botonBuscar.classList.add('active');
            } else {
                // Determinamos la página actual
                const raw = location.pathname.split('/').pop() || 'index.html';
                const page = keyFromHref(raw) || 'index.html';
                navItems.forEach(i => {
                    const href = i.getAttribute && i.getAttribute('href');
                    const key = keyFromHref(href) || i.dataset.key || '';
                    i.classList.toggle('active', key === page || (page === 'index.html' && (key === 'index.html' || key === '')));
                });
            }

            // Guardamos el estado al hacer clic en un elemento de navegación
            navItems.forEach(i => {
                i.addEventListener('click', function(e) {
                    try {
                        const href = i.getAttribute && i.getAttribute('href');
                        const key = href ? keyFromHref(href) : (i.id || i.dataset.key || '');
                        if (key) localStorage.setItem('nav_active', key);
                    } catch (e) {}
                    navItems.forEach(n => n.classList.remove('active'));
                    i.classList.add('active');
                });
            });

            // Manejo especial para el botón de búsqueda
            if (botonBuscar) {
                botonBuscar.addEventListener('click', function() {
                    try { 
                        localStorage.setItem('nav_active', 'buscar'); 
                    } catch (e) {}
                    botonBuscar.classList.add('active');
                    navItems.forEach(n => n.classList.remove('active'));
                });
            }
        })();
    } catch (e) {}

})();