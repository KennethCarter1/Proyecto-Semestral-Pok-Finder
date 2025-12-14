/* ================================
   Kenneth - Index
================================ */

document.addEventListener("DOMContentLoaded", () => {

    const KC_inputBusqueda = document.querySelector(".KC-input-busqueda");
    const KC_botonBuscar = document.querySelector(".KC-boton-buscar");
    const KC_contenedorResultado = document.querySelector(".KC-Resultado");
    const KC_modoBusqueda = document.getElementById("KC-modo-busqueda");

    const KC_manejarBusqueda = async () => {
        const modo = KC_modoBusqueda.value;
        const KC_valorBusqueda = KC_inputBusqueda.value.trim().toLowerCase();
        KC_contenedorResultado.innerHTML = "";

        if (!KC_valorBusqueda) {
            KC_contenedorResultado.innerHTML = `
            <div class="KC-alerta-error">
                ERROR: POKÉMON NO ENCONTRADO
            </div>
            `;
            return;
        }

        KC_contenedorResultado.innerHTML = `<p class="KC-cargando"><strong>CARGANDO DATOS...</strong></p>`;

        try {
            if (modo === "KC-pokemon") {

                const KC_respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${KC_valorBusqueda}`);
                if (!KC_respuesta.ok) {
                    throw new Error("No encontrado");
                }
                const KC_data = await KC_respuesta.json();


                const KC_especie_res = await fetch(KC_data.species.url);
                if (!KC_especie_res.ok) {
                    throw new Error("No se pudo obtener especie");
                }
                const KC_especie = await KC_especie_res.json();


                let KC_evolucion_html = "<span>No disponible.</span>";
                if (KC_especie.evolution_chain && KC_especie.evolution_chain.url) {
                    const KC_evo_res = await fetch(KC_especie.evolution_chain.url);
                    if (KC_evo_res.ok) {
                        const KC_evo_data = await KC_evo_res.json();


                        const KC_evo_names = [];
                        let current = KC_evo_data.chain;
                        while (current) {
                            KC_evo_names.push(current.species.name);
                            if (current.evolves_to && current.evolves_to.length > 0) {
                                current = current.evolves_to[0];
                            } else {
                                current = null;
                            }
                        }

                        const KC_evoImgs = [];
                        for (let i = 0; i < KC_evo_names.length; i++) {
                            let evoNombre = KC_evo_names[i];
                            let evoObj = {};
                            try {
                                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${evoNombre}`);
                                if (res.ok) {
                                    const data = await res.json();
                                    evoObj.name = evoNombre.toUpperCase();
                                    if (data.sprites && data.sprites.front_default) {
                                        evoObj.img = data.sprites.front_default;
                                    } else {
                                        evoObj.img = null;
                                    }
                                } else {
                                    evoObj.name = evoNombre.toUpperCase();
                                    evoObj.img = null;
                                }
                            } catch {
                                evoObj.name = evoNombre.toUpperCase();
                                evoObj.img = null;
                            }
                            KC_evoImgs.push(evoObj);
                        }

                        KC_evolucion_html = "";
for (let idx = 0; idx < KC_evoImgs.length; idx++) {
    let evo = KC_evoImgs[idx];

    const isCurrent = evo.name.toLowerCase() === KC_data.name.toLowerCase();
    KC_evolucion_html += `<div class="KC-evo-fase KC-evo-interactiva${isCurrent ? ' KC-evo-actual' : ''}" data-evo-name="${evo.name.toLowerCase()}">`;
    if (evo.img) {
        KC_evolucion_html += `<img src="${evo.img}" alt="${evo.name}" class="KC-evo-img">`;
    }
    KC_evolucion_html += `<div class="KC-evo-nombre">${evo.name}</div></div>`;
    if (idx < KC_evoImgs.length - 1) {
        KC_evolucion_html += '<span class="KC-evo-arrow"> ➔ </span>';
    }
}
                    }
                }

                // Tipos
                const KC_tipos_html = KC_data.types
                    .map(tipoObj => `<span class="KC-badge-tipo">${tipoObj.type.name.toUpperCase()}</span>`)
                    .join('');

                // Habilidades
                let KC_habilidad_normal = KC_data.abilities.find(a => !a.is_hidden);
                let KC_habilidad_oculta = KC_data.abilities.find(a => a.is_hidden);

                let KC_habilidades_html = "";
                if (KC_habilidad_normal) {
                    KC_habilidades_html += `<span class="KC-badge-habilidad-normal">${KC_habilidad_normal.ability.name.charAt(0).toUpperCase() + KC_habilidad_normal.ability.name.slice(1)}</span>`;
                }
                if (KC_habilidad_oculta) {
                    KC_habilidades_html += `<span class="KC-badge-habilidad-oculta">${KC_habilidad_oculta.ability.name.charAt(0).toUpperCase() + KC_habilidad_oculta.ability.name.slice(1)} <span class="KC-habilidad-oculta-etiqueta">(Oculta)</span></span>`;
                }


                const KC_stats = KC_data.stats
                    .map(function(statObj) {
                        const maxStat = 100;
                        let porcentaje = Math.round((statObj.base_stat / maxStat) * 100);
                        if (porcentaje > 100) porcentaje = 100;
                        return `
                        <li class="KC-pokemon-stat">
                            <span class="KC-stat-nombre">${statObj.stat.name.toUpperCase()}:</span>
                            <div class="KC-stat-barra-externa">
                            <div class="KC-stat-barra-interna" style="width: ${porcentaje}%;"></div>
                            </div>
                        </li>
                        `;
                    })
                    .join('');

                KC_contenedorResultado.innerHTML = `
                <div class="KC-pokemon-detalle">
                    <div class="KC-pokemon-img-center">
                        <img src="${KC_data.sprites.front_default}" alt="${KC_data.name}" class="KC-pokemon-img">
                    </div>
                    <h2 class="KC-pokemon-titulo">#${KC_data.id} ${KC_data.name.toUpperCase()}</h2>
                    <div class="KC-pokemon-titulo-linea"></div>
                    <div class="KC-tipo-lista">
                        ${KC_tipos_html}
                    </div>
                    <p class="KC-pokemon-habilidades"><strong>HABILIDADES</strong></p>
                    <div class="KC-habilidad-lista">
                        ${KC_habilidades_html}
                    </div>
                    <ul class="KC-pokemon-stats">
                        ${KC_stats}
                    </ul>
                    <div class="KC-corazon-fav">
                        <span class="KC-corazon-emoji">❤️</span>
                    </div>
                    <div class="KC-pokemon-titulo-linea-cortadas"></div>
                    <div class="KC-pokemon-evolucion">
                        <strong>CADENA DE EVOLUCIÓN</strong>
                        <div class="KC-evo-cadena">
                            ${KC_evolucion_html}
                        </div>
                    </div>
                </div>
                `;

                                
const evoElems = KC_contenedorResultado.querySelectorAll('.KC-evo-interactiva');
evoElems.forEach(elem => {
    elem.addEventListener('click', function() {
        const nombre = this.getAttribute('data-evo-name');
        KC_inputBusqueda.value = nombre;
        KC_botonBuscar.click();
    });
});
            } else if (modo === "KC-habilidad") {
    // ========== BUSCAR HABILIDAD ==========
    const respuesta = await fetch(`https://pokeapi.co/api/v2/ability/${KC_valorBusqueda}`);
    if (!respuesta.ok) {
        KC_contenedorResultado.innerHTML = `
          <div class="KC-alerta-error">
            ERROR: HABILIDAD NO ENCONTRADA
          </div>
        `;
        return;
    }
    const habilidad = await respuesta.json();


    let efecto = habilidad.effect_entries.find(e => e.language.name === "es")?.effect
               || habilidad.effect_entries.find(e => e.language.name === "en")?.effect
               || "Sin descripción.";


    const habilidadNombre = habilidad.name.replace(/-/g, ' ').toUpperCase();
    const habilidadId = "#" + habilidad.id;


    const pkmoArr = habilidad.pokemon;
    const totalPkm = pkmoArr.length;


    const pokemonGrids = await Promise.all(pkmoArr.map(async pkInfo => {
     
        let pokeNum = pkInfo.pokemon.url.split("/").filter(Boolean).pop();
   
        let imgUrl = "";
        try {
            const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeNum}`);
            if (pokeRes.ok) {
                const pokeData = await pokeRes.json();
                imgUrl = pokeData.sprites.front_default || "";
            }
        } catch {}
       return `
  <div class="KC-hab-poke-card" data-pokename="${pkInfo.pokemon.name}">
    <img class="KC-hab-poke-img" src="${imgUrl}" alt="${pkInfo.pokemon.name}">
    <div class="KC-hab-poke-name">
      ${pkInfo.pokemon.name.replace(/-/g," ").toUpperCase()}
      ${pkInfo.is_hidden ? '<span class="KC-oculta-texto"> (oculta)</span>' : ''}
    </div>
  </div>
`;
    }));

    KC_contenedorResultado.innerHTML = `
      <div class="KC-ability-detalle">
        <div class="KC-ability-header">
          <span class="KC-estrella">✨</span>
          <span class="KC-ability-title">${habilidadNombre}</span>
          <span class="KC-ability-id">${habilidadId}</span>
        </div>
        <div class="KC-pokemon-titulo-linea"></div>
        <div class="KC-hab-efecto-titulo">EFECTO</div>
        <div class="KC-hab-efecto-text">${efecto}</div>
        <div class="KC-hab-pk-titulo">
          POKÉMON CON ESTA HABILIDAD (${totalPkm})
        </div>
        <div class="KC-hab-poke-grid">
          ${pokemonGrids.join("")}
        </div>
      </div>
    `;
    const pokeCards = KC_contenedorResultado.querySelectorAll(".KC-hab-poke-card");
pokeCards.forEach(card => {
  card.addEventListener("click", function() {
    let nombre = this.getAttribute("data-pokename");
    KC_inputBusqueda.value = nombre;
    KC_modoBusqueda.value = "KC-pokemon";  
    KC_botonBuscar.click();
  });
});

}
        } catch (KC_error) {
            KC_contenedorResultado.innerHTML = `
  <div class="KC-alerta-error">
    ERROR: POKÉMON NO ENCONTRADO
  </div>
`;
        }
    };

    KC_botonBuscar.addEventListener('click', KC_manejarBusqueda);
    KC_inputBusqueda.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') KC_manejarBusqueda();
    });

});