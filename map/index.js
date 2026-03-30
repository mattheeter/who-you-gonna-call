import { addBoundariesLayer } from "./boundaries.js";
import { createBrushController } from "./brush.js";
import { createMap } from "./controls.js";
import { SERVICE_TYPES } from "./constants.js";
import { loadServiceRows } from "./data.js";
import { createEncodingModel } from "./encodings.js";
import { createLegendControl } from "./legend.js";
import { drawPoints } from "./render.js";
import { createServiceTypeSelectorControl } from "./serviceTypeSelector.js";

function getBrushedModeState(modeState, brushedRows) {
  if (!brushedRows) return modeState;

  const countsByKey = modeState.points.reduce((counts, point) => {
    if (brushedRows.has(point.row.rowId)) {
      counts.set(point.legendKey, (counts.get(point.legendKey) || 0) + 1);
    }
    return counts;
  }, new Map());

  return {
    ...modeState,
    entries: modeState.entries.map((entry) => ({
      ...entry,
      count: countsByKey.get(entry.key) || 0
    }))
  };
}

class ServiceCallMap {
  constructor() {
    this.rows = [];
    this.encodingModel = null;
    this.map = null;
    this.markerLayer = null;
    this.heatMap = null;
    this.pointRenderer = null;
    this.legendControl = null;
    this.brushController = null;
    this.serviceTypeSelectorControl = null;
    this.selectedServiceTypes = ["PTHOLE"];
    this.selectedRowIds = null; // Set<string> | null
    this.mapBrushedRowIds = null; // Set<string> | null
    this.timeEndDate = null; // Date | null
  }

  emitServiceTypeSelectionChanged(selectedServiceTypes) {
    // Shared selection state for the attribute viewer (charts).
    window.__selectedServiceTypes = selectedServiceTypes;
    window.dispatchEvent(
      new CustomEvent("serviceTypeSelectionChanged", {
        detail: { selectedServiceTypes },
      })
    );
  }

  emitRowSelectionChanged(selectedRowIds) {
    window.dispatchEvent(
      new CustomEvent("rowSelectionChanged", {
        detail: {
          source: "map",
          selectedRowIds: selectedRowIds ? Array.from(selectedRowIds) : null
        }
      })
    );
  }

  initVis() {
    const mapState = createMap();
    this.map = mapState.map;
    this.markerLayer = mapState.markerLayer;
    this.heatMap = mapState.heatMap;
    this.pointRenderer = mapState.pointRenderer;
    this.brushController = createBrushController({
      map: this.map,
      onBrushChange: () => this.updateVis()
    });

    this.legendControl = createLegendControl({
      map: this.map,
      onModeChange: () => this.updateVis(),
      onLegendClick: (key) => this.handleLegendClick(key)
    });

    this.serviceTypeSelectorControl = createServiceTypeSelectorControl({
      map: this.map,
      initialSelected: this.selectedServiceTypes,
      onSelectionChange: (selectedServiceTypes) => {
        this.selectedServiceTypes = selectedServiceTypes;
        this.emitServiceTypeSelectionChanged(selectedServiceTypes);
        this.updateVis();
      }
    });
    this.serviceTypeSelectorControl.addTo(this.map);

    // Ensure listeners have an initial value even before the control triggers.
    this.emitServiceTypeSelectionChanged(this.selectedServiceTypes);

    window.addEventListener("rowSelectionChanged", (event) => {
      const { source, selectedRowIds } = event?.detail || {};
      if (source === "map") return;
      this.selectedRowIds = Array.isArray(selectedRowIds) ? new Set(selectedRowIds) : null;
      this.updateVis();
    });

    window.addEventListener("timeFilterChanged", (event) => {
      const { endDateIso } = event?.detail || {};
      this.timeEndDate = endDateIso ? new Date(endDateIso) : null;
      this.updateVis();
    });

    window.addEventListener("resetAllFilters", () => {
      this.selectedRowIds = null;
      this.timeEndDate = null;
      if (this.brushController?.clearSelection) {
        this.brushController.clearSelection();
      } else {
        this.updateVis();
      }
    });
  }

  async loadData() {
    this.rows = await loadServiceRows(SERVICE_TYPES);
    this.serviceTypeSelectorControl.updateCounts(this.rows);
  }

  updateVis() {
    if (!this.rows.length) return; // wait until the csv is ready

    const filteredRows = this.rows
      .filter((row) => this.selectedServiceTypes.includes(row.serviceType))
      .filter((row) => {
        if (!this.timeEndDate) return true;
        return row.createdDate && row.createdDate <= this.timeEndDate;
      });

    if (!filteredRows.length) {
      this.encodingModel = null;
      this.markerLayer.clearLayers();
      this.heatMap.setLatLngs([]);
      this.legendControl.setNoPoints();
      return;
    }

    this.encodingModel = createEncodingModel(filteredRows);

    const modeState = this.encodingModel.getModeState(this.legendControl.getMode());
    const activeKeys = this.legendControl.updateModeState(modeState);
    const visiblePoints = modeState.points.filter(
      ({ row, legendKey }) =>
        activeKeys.has(legendKey) &&
        row.latitude !== null &&
        row.longitude !== null
    );
    const brushedRows = this.brushController
      ? this.brushController.setPoints(visiblePoints)
      : null;
    this.mapBrushedRowIds = brushedRows;
    const activeRowIds = this.selectedRowIds || this.mapBrushedRowIds;
    this.legendControl.setModeState(getBrushedModeState(modeState, brushedRows));

    drawPoints({
      points: modeState.points,
      activeKeys,
      brushedRows: activeRowIds,
      pointRenderer: this.pointRenderer,
      markerLayer: this.markerLayer,
      heatMap: this.heatMap,
      map: this.map
    });
    this.legendControl.render();
  }

  handleLegendClick(key) {
    if (!this.rows.length || !this.encodingModel) return;
    this.legendControl.toggleSelection(key);
    this.updateVis();
  }

  async initialize() {
    this.initVis();

    addBoundariesLayer(this.map).catch((error) => {
      console.error("Failed to load boundary GeoJSON:", error);
    });

    try {
      await this.loadData();
      this.updateVis();
    } catch (error) {
      console.error("Failed to load 311 CSV:", error);
      this.legendControl.setError("Could not load data file.");
    }
  }
}

export async function initializeMapVisualization() {
  const serviceCallMap = new ServiceCallMap();
  await serviceCallMap.initialize();
}
