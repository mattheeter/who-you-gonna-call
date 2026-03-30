import { addBoundariesLayer } from "./boundaries.js";
import { createBrushController } from "./brush.js";
import { createMap } from "./controls.js";
import { loadServiceRows } from "./data.js";
import { createEncodingModel } from "./encodings.js";
import { createLegendControl } from "./legend.js";
import { drawPoints } from "./render.js";

function getBrushedModeState(modeState, brushedRows) {
  if (!brushedRows) return modeState;

  const countsByKey = modeState.points.reduce((counts, point) => {
    if (brushedRows.has(point.row)) {
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
  }

  async loadData() {
    this.rows = await loadServiceRows();
    this.encodingModel = createEncodingModel(this.rows);
  }

  updateVis() {
    if (!this.rows.length || !this.encodingModel) return; // wait until the csv and encoding model are ready

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
    this.legendControl.setModeState(getBrushedModeState(modeState, brushedRows));

    drawPoints({
      points: modeState.points,
      activeKeys,
      brushedRows,
      pointRenderer: this.pointRenderer,
      markerLayer: this.markerLayer,
      heatMap: this.heatMap,
      map: this.map,
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
