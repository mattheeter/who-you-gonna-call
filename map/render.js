import { HIGHLIGHT_FILL_OPACITY, HIGHLIGHT_STROKE_OPACITY, LOW_FILL_OPACITY, LOW_STROKE_OPACITY, GRAY_COLOR } from "./constants.js";
import { SERVICE_TYPES } from "./constants.js";

const { L } = window;

export function drawPoints({ points, activeKeys, pointRenderer, markerLayer }) {
  markerLayer.clearLayers(); // redraw from scratch so legend filters fully reset the layer

  const selectedMarkers = [];
  const deselectedMarkers = [];

  points.forEach(({ row, fillColor, legendKey }) => {
    if (row.latitude === null || row.longitude === null) return;

    const isActive = activeKeys.has(legendKey);
    const finalFillColor = isActive ? fillColor : GRAY_COLOR;
    const fillOpacity = isActive ? HIGHLIGHT_FILL_OPACITY : LOW_FILL_OPACITY;
    const strokeOpacity = isActive ? HIGHLIGHT_STROKE_OPACITY : LOW_STROKE_OPACITY;

    const marker = L.circleMarker([row.latitude, row.longitude], {
      radius: 3,
      color: "#1f2937",
      weight: 0.5,
      opacity: strokeOpacity,
      renderer: pointRenderer,
      fillColor: finalFillColor,
      fillOpacity
    });
    const timeText =
      row.responseTimeDays === null
        ? "Unavailable"
        : `${row.responseTimeDays} ${row.responseTimeDays === 1 ? "day" : "days"}`;

    marker.bindTooltip(
      `<div class="map-tooltip__body">
        <div class="map-tooltip__header">
          <span class="map-tooltip__dot" style="background:${finalFillColor}"></span>
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
        tooltipElement.style.setProperty("--map-tooltip-accent", finalFillColor);
      }
    });

    if (isActive) {
      selectedMarkers.push(marker);
    } else {
      deselectedMarkers.push(marker);
    }
  });

  // Add selected markers first (on top)
  selectedMarkers.forEach(marker => markerLayer.addLayer(marker));
  // Then deselected markers (behind)
  deselectedMarkers.forEach(marker => markerLayer.addLayer(marker));
}
