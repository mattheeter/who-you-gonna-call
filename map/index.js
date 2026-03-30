import { addBoundariesLayer } from "./boundaries.js";
import { createMap } from "./controls.js";
import { loadServiceRows } from "./data.js";
import { createEncodingModel } from "./encodings.js";
import { createLegendControl } from "./legend.js";
import { drawPoints } from "./render.js";

class ServiceCallMap {
  constructor() {
    this.rows = [];
    this.encodingModel = null;
    this.map = null;
    this.markerLayer = null;
    this.heatMap = null;
    this.pointRenderer = null;
    this.legendControl = null;
  }

  initVis() {
    const mapState = createMap();
    this.map = mapState.map;
    this.markerLayer = mapState.markerLayer;
    this.heatMap = mapState.heatLayer;
    this.pointRenderer = mapState.pointRenderer;

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

    drawPoints({
      points: modeState.points,
      activeKeys,
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
