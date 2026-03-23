import { loadServiceRows } from "../map/data.js";

class FrequencyVis {
  constructor(group_by, id) {
    this.rows = [];
    this.id = id;
    this.groupBy = group_by || "neighborhood";
  }

  initVis() {
    var margin = {top: 20, right: 30, bottom: 40, left: 150},
      width = 300 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    // Group the data by the chosen attribute.
    let data = d3.group(this.rows, d => d[this.groupBy])
    // For each array of values (group), get the length to be used as the group's value.
    // TODO: Enusre we're using the correct service type 
    // I think data.js handles this, but need to check
    let values = data.values().toArray().map(d => d.length)
    let keys = data.keys().toArray()

    this.data = keys.map((k, i) => ({
      key: k,
      value: values[i]
    }));

    // Sort in descending order
    this.data.sort((f, s) => s.value - f.value);

    this.svg = d3.select(this.id)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add X axis
    this.xAxis = d3.scaleLinear()
      .domain(d3.extent(this.data, d => d.value))
      .range([ 0, width]);
    this.svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(this.xAxis).tickSizeOuter(0))
      .selectAll("text")
        .attr("transform", "translate(-10,10)rotate(-90)")
        .style("text-anchor", "end");
    
    // Add Y axis
    this.yAxis = d3.scaleBand()
      .range([ 0, height ])
      .domain(this.data.map(d => d.key))
      .padding(.1);
    this.svg.append("g")
      .call(d3.axisLeft(this.yAxis).tickSizeOuter(0));

    // Add bars
    this.barsLayer = this.svg.append("g");
    this.bars = this.barsLayer
      .selectAll()
      .data(this.data)
      .join("rect")
        .attr("x", this.xAxis(0))
        .attr("y", d => this.yAxis(d.key))
        .attr("width", d => this.xAxis(d.value) - this.xAxis(0))
        .attr("height", this.yAxis.bandwidth())
        .attr("fill", "#69b3a2");
  
    this.bars
      .on("mouseover", (event, d) => {
        d3.select("#tooltip")
          .style("display", "block")
          .html(`
            <div class="map-tooltip__body">
              <div class="map-tooltip__header">
                <span class="map-tooltip__dot"></span>
                <strong class="map-tooltip__title">${d.key}</strong>
              </div>
              <dl class="map-tooltip__details">
                <div class="map-tooltip__row">
                  <dt></dt><dd>${d.value} calls</dd>
                </div>
              </dl>
            </div>
          `);
      })
      .on("mousemove", (event) => {
        d3.select("#tooltip")
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY + 15) + "px");
      })
      .on("mouseout", () => {
        d3.select("#tooltip")
          .style("display", "none");
      });

    this.barsLayer.raise();
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
  const deptFreq = new FrequencyVis("agency", "#dept_freq");
  await deptFreq.initialize();
  const priorityFreq = new FrequencyVis("priority", "#priority_freq");
  await priorityFreq.initialize();
}
