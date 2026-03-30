import { addBoundariesLayer } from "./boundaries.js";
import { SERVICE_TYPES } from "./constants.js";
import { createMap, createShowOnlySelectedControl } from "./controls.js";
import { loadServiceRows } from "./data.js";
import { createEncodingModel } from "./encodings.js";
import { createLegendControl } from "./legend.js";
import { drawPoints } from "./render.js";
import { createServiceTypeSelectorControl } from "./serviceTypeSelector.js";

class ServiceCallMap {
  constructor() {
    this.rows = [];
    this.encodingModel = null;
    this.map = null;
    this.markerLayer = null;
    this.heatMap = null;
    this.pointRenderer = null;
    this.legendControl = null;
    this.showOnlySelectedControl = null;
    this.serviceTypeSelectorControl = null;
    this.selectedServiceTypes = ['MTL-FRN', 'PTHOLE', 'SLPYST'];
  }

  initVis() {
    const mapState = createMap();
    this.map = mapState.map;
    this.markerLayer = mapState.markerLayer;
    this.heatMap = mapState.heatMap;
    this.pointRenderer = mapState.pointRenderer;

    this.legendControl = createLegendControl({
      map: this.map,
      onModeChange: () => this.updateVis(),
      onLegendClick: (key) => this.handleLegendClick(key)
    });

    this.showOnlySelectedControl = createShowOnlySelectedControl({
      map: this.map,
      onToggle: () => this.updateVis()
    });

    this.serviceTypeSelectorControl = createServiceTypeSelectorControl({
      map: this.map,
      onSelectionChange: (selected) => {
        this.selectedServiceTypes = selected;
        this.updateVis();
      },
      initialSelected: this.selectedServiceTypes
    }).addTo(this.map);
  }

  async loadData() {
    this.rows = await loadServiceRows(SERVICE_TYPES);
  }

  updateVis() {
    if (!this.rows.length) return; // wait until the csv is ready

    const filteredRows = this.rows.filter(row => this.selectedServiceTypes.includes(row.serviceType));
    this.encodingModel = createEncodingModel(filteredRows);

    if (filteredRows.length === 0) {
      this.legendControl.setNoPoints();
      this.markerLayer.clearLayers();
      return;
    }

    const modeState = this.encodingModel.getModeState(this.legendControl.getMode());
    const activeKeys = this.legendControl.updateModeState(modeState);

    drawPoints({
      points: modeState.points,
      activeKeys,
      pointRenderer: this.pointRenderer,
      markerLayer: this.markerLayer,
      showOnlySelected: this.showOnlySelectedControl.isShowOnlySelected()
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
      this.serviceTypeSelectorControl.updateCounts(this.rows);
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
