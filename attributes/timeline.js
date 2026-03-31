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

    const margin = { top: 6, right: 8, bottom: 20, left: 44 };
    const outerWidth = 980;
    const outerHeight = 108;
    const width = outerWidth - margin.left - margin.right;
    const height = outerHeight - margin.top - margin.bottom;

    if (!this.data.length) {
      container
        .append("div")
        .attr("class", "timeline-empty")
        .style("color", "#94a3b8")
        .style("padding", "6px 8px")
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
    const yAxis = d3.axisLeft(y).ticks(4);

    g.append("g").attr("class", "timeline-axis timeline-axis-y").call(yAxis);
    g.append("g")
      .attr("class", "timeline-axis timeline-axis-x")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    // Width from `width / n` ignores real time gaps and makes bars huge when few weeks
    // have data—bars then overlap. Size each bar from the smallest pixel gap between
    // adjacent weeks, with a cap so sparse timelines stay readable.
    const barPadding = 2;
    const maxBarCap = 32;
    const xs = this.data.map((d) => x(d.weekStart));
    let barWidth = 8;
    if (this.data.length >= 2) {
      const gaps = [];
      for (let i = 0; i < xs.length - 1; i += 1) {
        gaps.push(xs[i + 1] - xs[i]);
      }
      const minGap = Math.min(...gaps);
      barWidth = Math.max(1, Math.min(maxBarCap, minGap - barPadding));
    } else if (this.data.length === 1) {
      barWidth = Math.min(maxBarCap, Math.max(4, width * 0.12));
    }

    const barX = (d) => {
      const cx = x(d.weekStart);
      return Math.min(Math.max(0, cx - barWidth / 2), width - barWidth);
    };

    const bars = g
      .append("g")
      .attr("class", "timeline-bars")
      .selectAll("rect")
      .data(this.data)
      .join("rect")
      .attr("x", barX)
      .attr("y", (d) => y(d.count))
      .attr("width", barWidth)
      .attr("height", (d) => height - y(d.count))
      .attr("rx", 2)
      .attr("fill", "#69b3a2");

    // Brush sits above bars and captures pointer events, so bar mouseover rarely fires.
    // Track pointer on the SVG and show the nearest week's call count in the shared tooltip.
    const weekTimes = this.data.map((d) => d.weekStart.getTime());
    const pickNearestWeek = (xDate) => {
      const t = xDate.getTime();
      if (!weekTimes.length) return null;
      let idx = d3.bisectLeft(weekTimes, t);
      if (idx <= 0) return this.data[0];
      if (idx >= this.data.length) return this.data[this.data.length - 1];
      const prev = this.data[idx - 1];
      const next = this.data[idx];
      return t - weekTimes[idx - 1] <= weekTimes[idx] - t ? prev : next;
    };

    const showWeekTooltip = (event, d) => {
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
                  <dt>Calls this week</dt><dd>${d.count.toLocaleString()}</dd>
                </div>
              </dl>
            </div>`
        )
        .style("border", "1px solid #69b3a2")
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY + 15}px`);
    };

    svg
      .on("mousemove.timeline-tooltip", (event) => {
        const [mx, my] = d3.pointer(event, g.node());
        if (mx < 0 || mx > width || my < 0 || my > height) {
          d3.select("#tooltip").style("display", "none");
          return;
        }
        const xDate = x.invert(mx);
        const d = pickNearestWeek(xDate);
        if (!d) return;
        showWeekTooltip(event, d);
      })
      .on("mouseleave.timeline-tooltip", () => {
        d3.select("#tooltip").style("display", "none");
      });

    const brushLayer = g.append("g").attr("class", "timeline-brush");
    const brush = d3.brushX().extent([
      [0, 0],
      [width, height]
    ]).on("start brush end", ({ selection, type }) => {
      if (!selection) {
        if (type === "end") {
          window.dispatchEvent(
            new CustomEvent("rowSelectionChanged", {
              detail: { source: "timeline", selectedRowIds: null }
            })
          );
        }
        return;
      }

      const [x0, x1] = selection;
      const start = x.invert(x0);
      const end = x.invert(x1);

      if (type === "end") {
        const selectedRowIds = new Set();
        this.rows.forEach((row) => {
          if (!row.createdDate || !row.rowId) return;
          if (row.createdDate >= start && row.createdDate <= end) {
            selectedRowIds.add(row.rowId);
          }
        });

        window.dispatchEvent(
          new CustomEvent("rowSelectionChanged", {
            detail: { source: "timeline", selectedRowIds: Array.from(selectedRowIds) }
          })
        );
      }
    });
    brushLayer.call(brush);

    if (this.missingCreatedDateCount > 0) {
      svg
        .append("text")
        .attr("class", "timeline-note")
        .attr("x", margin.left + 4)
        .attr("y", outerHeight - 4)
        .text(`${this.missingCreatedDateCount} calls missing DATE_CREATED (excluded from timeline).`);
    }

  }
}

