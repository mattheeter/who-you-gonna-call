import { HIGHLIGHT_FILL_OPACITY, HIGHLIGHT_STROKE_OPACITY } from "./constants.js";

const { L } = window;

export function drawPoints({ points, activeKeys, pointRenderer, markerLayer }) {
  markerLayer.clearLayers(); // redraw from scratch so legend filters fully reset the layer

  var latLngs = Array();
  points.forEach(({ row, fillColor, legendKey }) => {
    if (!activeKeys.has(legendKey)) return;
    if (row.latitude === null || row.longitude === null) return;
    latLngs.push([row.latitude, row.longitude]);
  });
  markerLayer.addLayer(L.heatLayer(latLngs, {radius: 30, pane:"heatPane",}))


  points.forEach(({ row, fillColor, legendKey }) => {
    if (!activeKeys.has(legendKey)) return;
    if (row.latitude === null || row.longitude === null) return;

    const marker = L.circleMarker([row.latitude, row.longitude], {
      radius: 5,
      color: "#1f2937",
      weight: 0.5,
      opacity: HIGHLIGHT_STROKE_OPACITY,
      renderer: pointRenderer,
      fillColor,
      fillOpacity: HIGHLIGHT_FILL_OPACITY,
      pane: "markerPane"
    });
    const timeText =
      row.responseTimeDays === null
        ? "Unavailable"
        : `${row.responseTimeDays} ${row.responseTimeDays === 1 ? "day" : "days"}`;

    marker.bindTooltip(
      `<div class="tooltip_body">
        <div class="tooltip_header">
          <span class="tooltip_dot" style="background:${fillColor}"></span>
          <strong class="tooltip_title">${row.srTypeDesc}</strong>
        </div>
        <dl class="tooltip_details">
          <div class="tooltip_row">
            <dt>Neighborhood</dt><dd>${row.neighborhood}</dd>
          </div>
          <div class="tooltip_row">
            <dt>Agency</dt><dd>${row.agency}</dd>
          </div>
          <div class="tooltip_row">
            <dt>Method received</dt><dd>${row.methodReceived}</dd>
          </div>
          <div class="tooltip_row">
            <dt>Priority</dt><dd>${row.priority}</dd>
          </div>
          <div class="tooltip_row">
            <dt>Resolution</dt><dd>${timeText}</dd>
          </div>
          <div class="tooltip_row">
            <dt>Created</dt><dd>${row.createdDateLabel}</dd>
          </div>
          <div class="tooltip_row">
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
