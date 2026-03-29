import { BOUNDARIES_GEOJSON_URL } from "./constants.js";

const { L } = window;

// renderer padding is relative to map size (default ~0.1)
// larger buffer matches tile-style pre-rendering while panning
const BOUNDARY_RENDERER_PADDING = 2;
const BOUNDARIES_PANE = "boundariesPane";

export async function addBoundariesLayer(map) {
  const response = await fetch(BOUNDARIES_GEOJSON_URL);
  if (!response.ok) {
    throw new Error(`Boundaries request failed: ${response.status}`);
  }
  const data = await response.json();

  // below overlayPane (400) where circle markers render and above tilePane (200)
  const boundariesPane = map.getPane(BOUNDARIES_PANE) ?? map.createPane(BOUNDARIES_PANE);
  boundariesPane.style.zIndex = "350";

  const layer = L.geoJSON(data, {
    pane: BOUNDARIES_PANE,
    renderer: L.svg({ padding: BOUNDARY_RENDERER_PADDING, pane: BOUNDARIES_PANE }),
    style: {
      color: "#666666",
      weight: 1.75,
      opacity: 1,
      fillColor: "#94a3b8",
      fillOpacity: 0.28
    }
  });

  layer.addTo(map);
  return layer;
}
