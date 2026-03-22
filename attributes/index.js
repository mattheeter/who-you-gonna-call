import { loadServiceRows } from "../map/data.js";

class FrequencyVis {
  constructor(group_by, id) {
    this.rows = [];
    this.id = id;
    this.groupBy = group_by || "neighborhood";
  }

  initVis() {
    var margin = {top: 20, right: 30, bottom: 40, left: 125},
      width = 400 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    // Group the data by the chosen attribute.
    this.data = d3.group(this.rows, d => d[this.groupBy])
    // For each array of values (group), get the length to be used as the group's value.
    // TODO: Enusre we're using the correct service type 
    // I think data.js handles this, but need to check
    this.values = this.data.values().toArray().map(d => d.length)
    this.keys = this.data.keys().toArray()

    this.svg = d3.select(this.id)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add X axis
    this.xAxis = d3.scaleLinear()
      .domain(d3.extent(this.values))
      .range([ 1.5, width]);
    this.svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(this.xAxis).tickSizeOuter(0))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
    // Add Y axis
    this.yAxis = d3.scaleBand()
      .range([ 0, height ])
      .domain(this.keys)
      .padding(.1);
    this.svg.append("g")
      .call(d3.axisLeft(this.yAxis).tickSizeOuter(0));

  // Add bars
  this.svg
    .selectAll()
    .data(this.keys)
    .join("rect")
    .attr("x", this.xAxis(0))
    .attr("y", d => this.yAxis(d))
    .attr("width", (_, i) => this.xAxis(this.values[i]))
    .attr("height", this.yAxis.bandwidth() )
    .attr("fill", "#69b3a2")
  }

  async loadData() {
    this.rows = await loadServiceRows();
  }

  updateVis() {
  }

  async initialize() {

    try {
      await this.loadData();
      this.initVis();
      this.updateVis();
    } catch (error) {
      console.error("Failed to load 311 CSV:", error);
      this.legendControl.setError("Could not load data file.");
    }
  }
}

export async function initializeAttributeViews() {
  const neighborhoodFreq = new FrequencyVis("neighborhood", "#neighborhood_freq");
  await neighborhoodFreq.initialize();
  const receivedFreq = new FrequencyVis("methodReceived", "#received_freq");
  await receivedFreq.initialize();
}
