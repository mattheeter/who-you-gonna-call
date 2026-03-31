import { loadServiceRows } from "../map/data.js";
import { TimelineVis } from "./timeline.js";
import { SERVICE_TYPES } from "../map/constants.js";

class FrequencyVis {
  /**
   * @param {string} group_by
   * @param {string} id - CSS selector for the chart container
   * @param {{ outerHeight?: number, syncHeightToContainer?: boolean, color?: string }} [options] - outerHeight: total SVG height (inner plot = outerHeight - margins)
   */
  constructor(group_by, id, options = {}) {
    this.rows = [];
    this.id = id;
    this.groupBy = group_by || "neighborhood";
    this.selectedRowIds = null; // Set<string> | null
    this.outerHeight = options.outerHeight ?? 600;
    this.syncHeightToContainer = options.syncHeightToContainer ?? false;
    this.color = options.color ?? "#69b3a2";
  }

  initVis() {
    if (this.syncHeightToContainer) {
      const el = document.querySelector(this.id);
      const h = el?.clientHeight;
      if (h && h > 0) {
        this.outerHeight = Math.round(h);
      }
    }

    // Redraw from scratch so selection changes don't stack duplicate charts.
    d3.select(this.id).selectAll("*").remove();

    /* Extra bottom space so slanted x-axis tick labels stay inside the SVG */
    const margin = { top: 20, right: 30, bottom: 52, left: 150 };
    const width = 350 - margin.left - margin.right;
    const height = this.outerHeight - margin.top - margin.bottom;

    const rows = this.selectedRowIds
      ? this.rows.filter((row) => this.selectedRowIds.has(row.rowId))
      : this.rows;

    // Group the data by the chosen attribute.
    let data = d3.group(rows, d => d[this.groupBy])
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

    if (!this.data.length) {
      d3.select(this.id)
        .append("div")
        .attr("class", "chart-empty")
        .style("color", "#94a3b8")
        .style("padding", "12px")
        .text("No data for selected service types.");
      return;
    }

    const svgWidth = width + margin.left + margin.right;
    this.svg = d3.select(this.id)
      .append("svg")
        .attr("viewBox", `0 0 ${svgWidth} ${this.outerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add X axis
    this.xAxis = d3.scaleLinear()
      .domain([0, d3.max(this.data, (d) => d.value) || 0])
      .nice()
      .range([ 0, width]);
    this.svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(this.xAxis).tickSizeOuter(0))
      .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.35em")
        .attr("dy", "0.35em")
        .attr("transform", "rotate(-45)");
    
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
        .attr("fill", this.color);

    const accent = this.color;
    this.bars
      .on("mouseover", (event, d) => {
        d3.select("#tooltip")
          .style("display", "block")
          .html(`
            <div class="tooltip_body">
              <div class="tooltip_header">
                <span class="tooltip_dot" style="background:${accent}"></span>
                <strong class="tooltip_title">${d.key}</strong>
              </div>
              <dl class="tooltip_details">
                <div class="tooltip_row">
                  <dt>NUMBER OF CALLS</dt><dd>${d.value}</dd>
                </div>
              </dl>
            </div>
          `)
          .style("border", `1px solid ${accent}`);
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

    this.brushLayer = this.svg.append("g").attr("class", "brush");
    this.brush = d3.brushY().on("start brush end", ({ selection, type }) => {
      if (selection) {
        const [y0, y1] = selection;
        const selectedKeys = new Set(
          this.bars
            .style("opacity", "0.1")
            .filter(d => {
              // If any point on a bar is encompassed by the brush, we include it. 
              let min = this.yAxis(d.key);
              let max = this.yAxis(d.key) + (this.yAxis.bandwidth());
              return (
                // The brush is within a bar
                (y0 >= min && y1 <= max) ||
                // The brush is partially in one and its neighbor
                (y0 <= max && y1 >= max) ||
                (y0 <= min && y1 >= min)
              )
            })
            .style("opacity", "1.0")
            .data()
            .map((d) => d.key)
        );

        if (type === "end") {
          const selectedRowIds = new Set(
            this.rows
              .filter((row) => selectedKeys.has(row[this.groupBy]))
              .map((row) => row.rowId)
          );

          window.dispatchEvent(
            new CustomEvent("rowSelectionChanged", {
              detail: {
                source: `frequency:${this.groupBy}`,
                selectedRowIds: Array.from(selectedRowIds)
              }
            })
          );
        }
      }

      else {
          this.bars.style("opacity", "1.0");
          if (type === "end") {
            window.dispatchEvent(
              new CustomEvent("rowSelectionChanged", {
                detail: { source: `frequency:${this.groupBy}`, selectedRowIds: null }
              })
            );
          }
      }
    });

    this.brushLayer.call(this.brush);
    this.barsLayer.raise();
  }

  async loadData() {
    this.rows = await loadServiceRows(SERVICE_TYPES);
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
    }
  }
}

export async function initializeAttributeViews() {
  const allRows = await loadServiceRows(SERVICE_TYPES);

  const timeline = new TimelineVis({ id: "#timeline" });

  const neighborhoodFreq = new FrequencyVis("neighborhood", "#neighborhood_freq", {
    outerHeight: 680,
    syncHeightToContainer: true,
    color: "#4361ee"
  });

  const neighborhoodEl = document.querySelector("#neighborhood_freq");
  if (neighborhoodEl) {
    let lastHeight = -1;
    const ro = new ResizeObserver((entries) => {
      const h = Math.round(entries[0].contentRect.height);
      if (h < 2 || h === lastHeight) return;
      lastHeight = h;
      neighborhoodFreq.initVis();
    });
    ro.observe(neighborhoodEl);
  }
  const lowerChartHeight = 210;
  const receivedFreq = new FrequencyVis("methodReceived", "#received_freq", {
    outerHeight: lowerChartHeight,
    color: "#a78bfa"
  });
  const deptFreq = new FrequencyVis("agency", "#dept_freq", {
    outerHeight: lowerChartHeight,
    color: "#f59e0b"
  });
  const priorityFreq = new FrequencyVis("priority", "#priority_freq", {
    outerHeight: lowerChartHeight,
    color: "#ef4444"
  });

  const getInitialSelectedServiceTypes = () => {
    const selected = window.__selectedServiceTypes;
    if (Array.isArray(selected) && selected.length) return selected;
    return SERVICE_TYPES.map((s) => s.value);
  };

  let selectedServiceTypes = getInitialSelectedServiceTypes();
  let selectedRowIds = null; // Set<string> | null
  let timeEndDate = null; // Date | null
  let playTimer = null;

  const statusEl = document.querySelector("#play-timeline-status");
  const playBtn = document.querySelector("#play-timeline");
  const resetBtn = document.querySelector("#reset-filters");

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text || "";
  };

  const stopAnimation = () => {
    if (playTimer) {
      window.clearInterval(playTimer);
      playTimer = null;
    }
    if (playBtn) playBtn.textContent = "Play";
  };

  const render = () => {
    const filteredRows = allRows
      .filter((row) => selectedServiceTypes.includes(row.serviceType))
      .filter((row) => {
        if (!timeEndDate) return true;
        return row.createdDate && row.createdDate <= timeEndDate;
      });
    const finalRows = selectedRowIds
      ? filteredRows.filter((row) => selectedRowIds.has(row.rowId))
      : filteredRows;

    timeline.setRows(finalRows);
    timeline.initVis();

    neighborhoodFreq.rows = filteredRows;
    neighborhoodFreq.selectedRowIds = selectedRowIds;
    neighborhoodFreq.initVis();

    receivedFreq.rows = filteredRows;
    receivedFreq.selectedRowIds = selectedRowIds;
    receivedFreq.initVis();

    deptFreq.rows = filteredRows;
    deptFreq.selectedRowIds = selectedRowIds;
    deptFreq.initVis();

    priorityFreq.rows = filteredRows;
    priorityFreq.selectedRowIds = selectedRowIds;
    priorityFreq.initVis();
  };

  render();

  window.addEventListener("serviceTypeSelectionChanged", (event) => {
    const next = event?.detail?.selectedServiceTypes;
    if (!Array.isArray(next)) return;
    selectedServiceTypes = next;
    stopAnimation();
    timeEndDate = null;
    window.dispatchEvent(
      new CustomEvent("timeFilterChanged", { detail: { endDateIso: null } })
    );
    render();
  });

  window.addEventListener("rowSelectionChanged", (event) => {
    const { selectedRowIds: nextIds } = event?.detail || {};
    selectedRowIds = Array.isArray(nextIds) ? new Set(nextIds) : null;
    render();
  });

  window.addEventListener("timeFilterChanged", (event) => {
    const { endDateIso } = event?.detail || {};
    timeEndDate = endDateIso ? new Date(endDateIso) : null;
    render();
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      stopAnimation();
      selectedRowIds = null;
      timeEndDate = null;
      setStatus("");
      window.dispatchEvent(new CustomEvent("rowSelectionChanged", { detail: { source: "ui", selectedRowIds: null } }));
      window.dispatchEvent(new CustomEvent("timeFilterChanged", { detail: { endDateIso: null } }));
      window.dispatchEvent(new Event("resetAllFilters"));
      render();
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (playTimer) {
        stopAnimation();
        setStatus("");
        return;
      }

      const rowsForTypes = allRows.filter((row) =>
        selectedServiceTypes.includes(row.serviceType) && row.createdDate
      );
      const extent = d3.extent(rowsForTypes, (d) => d.createdDate);
      const minDate = extent[0];
      const maxDate = extent[1];
      if (!minDate || !maxDate) {
        setStatus("No dated calls to animate.");
        return;
      }

      playBtn.textContent = "Pause";
      let cursor = new Date(minDate);
      timeEndDate = cursor;
      window.dispatchEvent(
        new CustomEvent("timeFilterChanged", { detail: { endDateIso: cursor.toISOString() } })
      );
      setStatus(`Through ${cursor.toLocaleDateString()}`);

      // Finish in ~30 seconds regardless of date span.
      const durationMs = 30_000;
      const startMs = minDate.getTime();
      const endMs = maxDate.getTime();
      const spanMs = Math.max(1, endMs - startMs);
      const startedAt = performance.now();
      let lastDayKey = null;

      playTimer = window.setInterval(() => {
        const elapsed = performance.now() - startedAt;
        const t = Math.min(1, Math.max(0, elapsed / durationMs));
        const targetMs = startMs + spanMs * t;
        cursor = d3.utcDay.floor(new Date(targetMs));
        if (cursor < minDate) cursor = minDate;
        if (cursor > maxDate) cursor = maxDate;

        const dayKey = cursor.toISOString().slice(0, 10);
        if (dayKey === lastDayKey && t < 1) {
          return; // avoid spamming renders when still in same day
        }
        lastDayKey = dayKey;

        timeEndDate = cursor;
        window.dispatchEvent(
          new CustomEvent("timeFilterChanged", { detail: { endDateIso: cursor.toISOString() } })
        );
        setStatus(`Through ${cursor.toLocaleDateString()}`);

        if (t >= 1 || cursor >= maxDate) {
          stopAnimation();
          setStatus(`Done (${maxDate.toLocaleDateString()})`);
        }
      }, 33);
    });
  }
}
