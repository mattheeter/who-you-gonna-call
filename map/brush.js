const { d3, L } = window;
const DISABLED_HANDLERS = [
  "dragging",
  "touchZoom",
  "doubleClickZoom",
  "scrollWheelZoom",
  "boxZoom",
  "keyboard"
];

function setMapNavigationEnabled(map, isEnabled) {
  DISABLED_HANDLERS.forEach((handlerName) => {
    const handler = map[handlerName];
    if (!handler) return;

    if (isEnabled) {
      handler.enable();
    } else {
      handler.disable();
    }
  });

  const zoomControl = map.getContainer().querySelector(".leaflet-control-zoom");
  if (zoomControl) {
    zoomControl.style.pointerEvents = isEnabled ? "" : "none";
  }
}

function getSelectedRows(selection, points, map) {
  if (!selection) return null;

  const [[x0, y0], [x1, y1]] = selection;
  const selectedRows = new Set();

  points.forEach(({ row }) => {
    const point = map.latLngToContainerPoint([row.latitude, row.longitude]);
    if (point.x >= x0 && point.x <= x1 && point.y >= y0 && point.y <= y1) {
      selectedRows.add(row);
    }
  });

  return selectedRows;
}

export function createBrushController({ map, onBrushChange }) {
  let points = [];
  let selection = null;
  let isBrushMode = false;

  const overlay = d3
    .select(map.getContainer())
    .append("svg")
    .attr("class", "map-brush-overlay")
    .attr("aria-hidden", "true")
    .style("display", "none");
  const overlayNode = overlay.node();
  L.DomEvent.disableClickPropagation(overlayNode);
  L.DomEvent.disableScrollPropagation(overlayNode);
  ["mousedown", "mousemove", "mouseup", "click", "dblclick"].forEach((eventName) => {
    L.DomEvent.on(overlayNode, eventName, L.DomEvent.stopPropagation);
  });

  const brushLayer = overlay.append("g");

  const brush = d3.brush().on("start brush end", ({ selection: nextSelection }) => {
    selection = nextSelection
      ? nextSelection.map(([x, y]) => [x, y])
      : null;
    onBrushChange();
  });

  function updateSize() {
    const size = map.getSize();
    overlay.attr("width", size.x).attr("height", size.y);
    brush.extent([
      [0, 0],
      [size.x, size.y]
    ]);
    brushLayer.call(brush);

    if (selection) {
      brushLayer.call(brush.move, selection);
    }
  }

  const BrushControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const container = L.DomUtil.create("div", "leaflet-bar");
      const button = L.DomUtil.create("button", "leaflet-control-brush", container);
      button.type = "button";
      button.textContent = "Brush";
      button.title = "Toggle brush selection";
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", "false");

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        isBrushMode = !isBrushMode;
        overlay.classed("is-active", isBrushMode).style("display", isBrushMode ? null : "none");
        button.textContent = isBrushMode ? "Drag" : "Brush";
        button.setAttribute("aria-pressed", String(isBrushMode));
        setMapNavigationEnabled(map, !isBrushMode);

        if (isBrushMode) {
          updateSize();
          return;
        }

        selection = null;
        brushLayer.call(brush.move, null);
        onBrushChange();
      });

      return container;
    }
  });

  map.addControl(new BrushControl());
  map.on("resize", () => {
    if (isBrushMode) {
      updateSize();
    }
  });

  updateSize();

  return {
    setPoints(nextPoints) {
      points = nextPoints;
      return getSelectedRows(selection, points, map);
    }
  };
}
