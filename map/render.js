import { HIGHLIGHT_FILL_OPACITY, HIGHLIGHT_STROKE_OPACITY } from "./constants.js";
import { SERVICE_TYPES } from "./constants.js";

const { L } = window;

export function drawPoints({ points, activeKeys, pointRenderer, markerLayer }) {
  markerLayer.clearLayers(); // redraw from scratch so legend filters fully reset the layer

  points.forEach(({ row, fillColor, legendKey }) => {
    if (!activeKeys.has(legendKey)) return;
    if (row.latitude === null || row.longitude === null) return;

    const marker = L.circleMarker([row.latitude, row.longitude], {
      radius: 3,
      color: "#1f2937",
      weight: 0.5,
      opacity: HIGHLIGHT_STROKE_OPACITY,
      renderer: pointRenderer,
      fillColor,
      fillOpacity: HIGHLIGHT_FILL_OPACITY
    });
    const timeText =
      row.responseTimeDays === null
        ? "Unavailable"
        : `${row.responseTimeDays} ${row.responseTimeDays === 1 ? "day" : "days"}`;

    marker.bindTooltip(
      `<div class="map-tooltip__body">
        <div class="map-tooltip__header">
          <span class="map-tooltip__dot" style="background:${fillColor}"></span>
          <strong class="map-tooltip__title">${SERVICE_TYPES.find(s => s.value === row.serviceType)?.label || row.srTypeDesc}</strong>
        </div>
        <dl class="map-tooltip__details">
          <div class="map-tooltip__row">
            <dt>Neighborhood</dt><dd>${row.neighborhood}</dd>
          </div>
          <div class="map-tooltip__row">
            <dt>Agency</dt><dd>${row.agency}</dd>
          </div>
          <div class="map-tooltip__row">
            <dt>Method received</dt><dd>${row.methodReceived}</dd>
          </div>
          <div class="map-tooltip__row">
            <dt>Priority</dt><dd>${row.priority}</dd>
          </div>
          <div class="map-tooltip__row">
            <dt>Resolution</dt><dd>${timeText}</dd>
          </div>
          <div class="map-tooltip__row">
            <dt>Created</dt><dd>${row.createdDateLabel}</dd>
          </div>
          <div class="map-tooltip__row">
            <dt>Updated</dt><dd>${row.updatedDateLabel}</dd>
          </div>
        </dl>
      </div>`,
      {
        className: "map-tooltip",
        direction: "top",
        offset: L.point(0, -10),
        opacity: 1
      }
    );
    marker.on("tooltipopen", ({ tooltip }) => {
      // leaflet creates the tooltip DOM lazily, so the accent CSS variable has to be written after open instead of when the marker is first configured
      const tooltipElement = tooltip.getElement();
      if (tooltipElement) {
        tooltipElement.style.setProperty("--map-tooltip-accent", fillColor);
      }
    });

    markerLayer.addLayer(marker);
  });
}
