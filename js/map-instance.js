import { priceLabel, shortPrice } from "./format.js";
import { openListingInNewTab } from "./listing-detail.js";

/* КАРТА (главная, со списком) */
export const map = L.map("map").setView([43.238, 76.913], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
export const clusterLayer = L.markerClusterGroup();
map.addLayer(clusterLayer);

export function renderMarkers(items) {
  clusterLayer.clearLayers();
  items.forEach(item => {
    const icon = L.divIcon({ className: "", html: `<div class="price-pin">${shortPrice(item)}</div>`, iconSize: null });
    const marker = L.marker([item.lat, item.lng], { icon });
    const firstImg = (item.images && item.images.length) ? item.images[0] : item.imageUrl;
    const popupImg = firstImg ? `<img src="${firstImg}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:6px">` : "";
    marker.bindPopup(`${popupImg}<b>${priceLabel(item)}</b><br>${item.rooms}-комн. · ${item.area} м² · ${item.floor}/${item.floorsTotal} эт.<br>${item.district} р-н, ул. ${item.street}`);
    marker.on("click", () => openListingInNewTab(item.id));
    clusterLayer.addLayer(marker);
  });
}
