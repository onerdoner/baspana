import { state } from "./state.js";
import { CITIES } from "./config.js";
import { citySel, districtSel, fillDistricts, fillComplexes, updateCount } from "./search-view.js";
import { map } from "./map-instance.js";

/* МОДАЛЬНОЕ ОКНО ВЫБОРА ГОРОДА */
function renderCityModal() {
  const cityList = document.getElementById("cityModalList");
  const distList = document.getElementById("districtModalList");

  cityList.innerHTML = Object.keys(CITIES).map(c =>
    `<li class="city-option${c === state.modalCity ? " active" : ""}" data-city="${c}">${c}</li>`
  ).join("");

  cityList.querySelectorAll(".city-option").forEach(el => {
    el.addEventListener("click", () => {
      state.modalCity = el.dataset.city;
      state.modalDistrict = "";
      renderCityModal();
    });
  });

  const districts = Object.keys(CITIES[state.modalCity].districts);
  distList.innerHTML =
    `<li class="dist-option${state.modalDistrict === "" ? " active" : ""}" data-dist="">Все районы</li>` +
    districts.map(d =>
      `<li class="dist-option${d === state.modalDistrict ? " active" : ""}" data-dist="${d}">${d}</li>`
    ).join("");

  distList.querySelectorAll(".dist-option").forEach(el => {
    el.addEventListener("click", () => {
      state.modalDistrict = el.dataset.dist;
      distList.querySelectorAll(".dist-option").forEach(x => x.classList.remove("active"));
      el.classList.add("active");
    });
  });
}

function openCityModal() {
  state.modalCity = citySel.value || "Алматы";
  state.modalDistrict = districtSel.value || "";
  renderCityModal();
  document.getElementById("cityModal").classList.add("open");
}

function closeCityModal() {
  document.getElementById("cityModal").classList.remove("open");
}

document.getElementById("cityBtn").addEventListener("click", openCityModal);
document.getElementById("cityModalClose").addEventListener("click", closeCityModal);
document.getElementById("cityModal").addEventListener("click", e => {
  if (e.target.id === "cityModal") closeCityModal();
});

document.getElementById("cityModalSelect").addEventListener("click", () => {
  citySel.value = state.modalCity;
  fillDistricts(districtSel, state.modalCity, true);
  districtSel.value = state.modalDistrict;
  fillComplexes(state.modalCity);
  const c = CITIES[state.modalCity];
  map.setView(c.center, c.zoom);
  const label = state.modalDistrict ? `${state.modalCity}, ${state.modalDistrict} ▾` : `${state.modalCity} ▾`;
  document.getElementById("cityBtn").textContent = label;
  closeCityModal();
  updateCount();
});
