import { CINCINNATI_CENTER, DEFAULT_ZOOM } from "./constants.js";

const { L } = window;

function createToolbarButtonControl({ position, className, onCreate, onClick }) {
  return L.Control.extend({
    options: { position },
    onAdd() {
      const container = L.DomUtil.create("div", "leaflet-bar");
      const button = L.DomUtil.create("button", className, container);
      button.type = "button";
      onCreate(button);

      L.DomEvent.disableClickPropagation(container); // keep toolbar clicks from reaching the map
      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        onClick(button);
      });

      return container;
    }
  });
}

export function createMap() {
  const map = L.map("map", {
    center: CINCINNATI_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false, // add zoom later so it stacks with custom controls
    preferCanvas: true, // render many points more efficiently
    minZoom: 10,
    maxZoom: 19
  });
  const pointRenderer = L.canvas({ padding: 0.5 }); // reuse a canvas renderer for all markers

  map.getPane("tooltipPane").style.zIndex = 900; // keep tooltips above markers and controls
  L.control.zoom({ position: "topleft" }).addTo(map); // restore zoom with the desired placement

  const streetLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
    }
  );
  const aerialLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    }
  );

  let isAerialActive = false;
  streetLayer.addTo(map);

  const BasemapToggleControl = createToolbarButtonControl({
    position: "topleft",
    className: "leaflet-control-basemap-toggle",
    onCreate: (button) => {
      button.textContent = isAerialActive ? "Streets" : "Aerial";
      button.title = isAerialActive ? "Switch to street basemap" : "Switch to aerial basemap";
      button.setAttribute("aria-label", button.title);
    },
    onClick: (button) => {
      if (isAerialActive) {
        map.removeLayer(aerialLayer);
        streetLayer.addTo(map);
      } else {
        map.removeLayer(streetLayer);
        aerialLayer.addTo(map);
      }

      isAerialActive = !isAerialActive;
      button.textContent = isAerialActive ? "Streets" : "Aerial";
      button.title = isAerialActive ? "Switch to street basemap" : "Switch to aerial basemap";
      button.setAttribute("aria-label", button.title);
    }
  });
  const RecenterControl = createToolbarButtonControl({
    position: "topleft",
    className: "leaflet-control-recenter",
    onCreate: (button) => {
      button.textContent = "Center";
      button.title = "Re-center map";
      button.setAttribute("aria-label", "Re-center map");
    },
    onClick: () => map.setView(CINCINNATI_CENTER, DEFAULT_ZOOM)
  });

  map.addControl(new RecenterControl());
  map.addControl(new BasemapToggleControl());

  const heatMap = L.heatLayer({ radius: 15 }).addTo(map);
  let heatMapVisible = true;

  const setHeatMapVisibility = (visible) => {
    heatMapVisible = visible;
    const heatCanvas = heatMap._canvas;
    if (!heatCanvas) return;
    heatCanvas.style.display = visible ? "" : "none";
    if (visible) {
      heatMap.redraw();
    }
  };

  const HeatMapToggleControl = createToolbarButtonControl({
    position: "topleft",
    className: "leaflet-control-heatmap-toggle",
    onCreate: (button) => {
      button.textContent = "Heatmap";
      button.title = "Hide heatmap";
      button.setAttribute("aria-label", "Hide heatmap");
      button.setAttribute("aria-pressed", "true");
    },
    onClick: (button) => {
      setHeatMapVisibility(!heatMapVisible);
      if (heatMapVisible) {
        button.title = "Hide heatmap";
        button.setAttribute("aria-label", "Hide heatmap");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.title = "Show heatmap";
        button.setAttribute("aria-label", "Show heatmap");
        button.setAttribute("aria-pressed", "false");
      }
    }
  });
  map.addControl(new HeatMapToggleControl());

  return {
    map,
    pointRenderer,
    markerLayer: L.layerGroup().addTo(map), // collect all markers in a single replaceable layer
    heatMap
  };
}
