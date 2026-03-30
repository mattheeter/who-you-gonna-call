const { d3 } = window;

function formatWeekLabel(date) {
  // Keep this compact and consistent for tooltips (UTC so it matches parsing in `map/data.js`)
  const fmt = d3.utcFormat("%b %-d, %Y");
  return fmt(date);
}

export class TimelineVis {
  constructor({ id }) {
    this.id = id;
    this.rows = [];
    this.data = [];
    this.missingCreatedDateCount = 0;
  }

  setRows(rows) {
    this.rows = rows || [];
  }

  prepareData() {
    const validRows = [];
    let missing = 0;
    this.rows.forEach((row) => {
      if (!row.createdDate) {
        missing += 1;
        return;
      }
      validRows.push(row);
    });
    this.missingCreatedDateCount = missing;

    const rolled = d3.rollups(
      validRows,
      (v) => v.length,
      (d) => d3.utcWeek.floor(d.createdDate)
    );

    this.data = rolled
      .map(([weekStart, count]) => ({ weekStart, count }))
      .sort((a, b) => a.weekStart - b.weekStart);
  }

  initVis() {
    this.prepareData();

    const container = d3.select(this.id);
    container.selectAll("*").remove();

    const margin = { top: 18, right: 16, bottom: 36, left: 54 };
    const outerWidth = 980;
    const outerHeight = 220;
    const width = outerWidth - margin.left - margin.right;
    const height = outerHeight - margin.top - margin.bottom;

    if (!this.data.length) {
      container
        .append("div")
        .attr("class", "timeline-empty")
        .style("color", "#94a3b8")
        .style("padding", "12px")
        .text(
          this.missingCreatedDateCount > 0
            ? `${this.missingCreatedDateCount} calls missing DATE_CREATED (excluded from timeline).`
            : "No timeline data for selected service types."
        );
      return;
    }

    const svg = container
      .append("svg")
      .attr("class", "timeline-svg")
      .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
      .attr("width", "100%")
      .attr("height", outerHeight);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const extent = d3.extent(this.data, (d) => d.weekStart);
    const x = d3.scaleUtc().domain(extent).range([0, width]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d) => d.count) || 0])
      .nice()
      .range([height, 0]);

    const xAxis = d3.axisBottom(x).ticks(d3.utcMonth.every(1)).tickFormat(d3.utcFormat("%b"));
    const yAxis = d3.axisLeft(y).ticks(5);

    g.append("g").attr("class", "timeline-axis timeline-axis-y").call(yAxis);
    g.append("g")
      .attr("class", "timeline-axis timeline-axis-x")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    g.append("text")
      .attr("class", "timeline-axis-label")
      .attr("x", 0)
      .attr("y", -6)
      .text("Requests");

    const barWidth = Math.max(1, Math.floor(width / Math.max(1, this.data.length)) - 1);

    const bars = g
      .append("g")
      .attr("class", "timeline-bars")
      .selectAll("rect")
      .data(this.data)
      .join("rect")
      .attr("x", (d) => x(d.weekStart))
      .attr("y", (d) => y(d.count))
      .attr("width", barWidth)
      .attr("height", (d) => height - y(d.count))
      .attr("rx", 2)
      .attr("fill", "#69b3a2");

    if (this.missingCreatedDateCount > 0) {
      svg
        .append("text")
        .attr("class", "timeline-note")
        .attr("x", margin.left)
        .attr("y", outerHeight - 8)
        .text(`${this.missingCreatedDateCount} calls missing DATE_CREATED (excluded from timeline).`);
    }

    bars
      .on("mouseover", (event, d) => {
        d3.select("#tooltip")
          .style("display", "block")
          .html(
            `<div class="tooltip_body">
              <div class="tooltip_header">
                <span class="tooltip_dot" style="background:#69b3a2"></span>
                <strong class="tooltip_title">Week of ${formatWeekLabel(d.weekStart)}</strong>
              </div>
              <dl class="tooltip_details">
                <div class="tooltip_row">
                  <dt>NUMBER OF CALLS</dt><dd>${d.count}</dd>
                </div>
              </dl>
            </div>`
          )
          .style("border", "1px solid #69b3a2");
      })
      .on("mousemove", (event) => {
        d3.select("#tooltip")
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY + 15}px`);
      })
      .on("mouseout", () => {
        d3.select("#tooltip").style("display", "none");
      });
  }
}

