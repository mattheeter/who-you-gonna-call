import { COLOR_BY_OPTIONS } from "./constants.js";

const { d3, L } = window;

export function createLegendControl({ map, onModeChange, onLegendClick }) {
  let colorBySelect;
  let currentModeState = null;
  let rowsSelection;
  let statusElement;
  let unmappedElement;
  const activeLegendKeysByMode = new Map();
  const legend = L.control({ position: "bottomleft" });

  function getMode() {
    return colorBySelect.value;
  }

  function getValidKeys(entries) {
    return new Set(entries.map((entry) => entry.key));
  }

  function reconcileActiveKeys(mode, validKeys) {
    const existingKeys = activeLegendKeysByMode.get(mode);
    if (!existingKeys) return new Set(validKeys);

    const activeKeys = new Set();
    existingKeys.forEach((key) => {
      if (validKeys.has(key)) {
        activeKeys.add(key);
      }
    });

    return activeKeys.size ? activeKeys : new Set(validKeys);
  }

  legend.onAdd = function onAdd() {
    const wrapper = L.DomUtil.create("div", "legend-wrapper");
    const legendBox = L.DomUtil.create("div", "legend", wrapper);
    const select = L.DomUtil.create("select", "legend-select", legendBox);
    select.setAttribute("aria-label", "Color points by");

    COLOR_BY_OPTIONS.forEach((option) => {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      select.appendChild(optionEl);
    });

    colorBySelect = select;
    statusElement = L.DomUtil.create("div", "legend-status", legendBox);
    statusElement.textContent = "Loading legend...";
    rowsSelection = d3.select(L.DomUtil.create("div", "legend-rows", legendBox));
    unmappedElement = L.DomUtil.create("div", "legend-unmapped", wrapper);

    L.DomEvent.disableClickPropagation(wrapper); // keep map drags and clicks out of the control
    L.DomEvent.disableScrollPropagation(wrapper);

    select.addEventListener("change", () => {
      onModeChange();
      select.blur();
    });

    rowsSelection.node().addEventListener("click", (event) => {
      const rowButton = event.target.closest(".legend-row");
      if (!rowButton) return;
      onLegendClick(rowButton.dataset.legendKey);
    });

    this._div = wrapper;
    return wrapper;
  };

  legend.addTo(map);

  return {
    getMode() {
      return getMode();
    },
    setModeState(modeState) {
      currentModeState = modeState;
    },
    updateModeState(modeState) {
      currentModeState = modeState;

      const mode = getMode();
      const activeKeys = reconcileActiveKeys(mode, getValidKeys(modeState.entries));
      activeLegendKeysByMode.set(mode, activeKeys);
      return activeKeys;
    },
    toggleSelection(key) {
      const entries = currentModeState ? currentModeState.entries : [];
      if (!entries.length) return;

      const mode = getMode();
      const validKeys = getValidKeys(entries);
      const activeKeys = reconcileActiveKeys(mode, validKeys);

      if (activeKeys.size === entries.length) {
        activeLegendKeysByMode.set(mode, new Set([key]));
        return;
      }

      if (activeKeys.has(key)) {
        activeKeys.delete(key);
      } else {
        activeKeys.add(key);
      }

      if (activeKeys.size) {
        activeLegendKeysByMode.set(mode, activeKeys);
        return;
      }

      activeLegendKeysByMode.set(mode, new Set(validKeys));
    },
    render() {
      const entries = currentModeState ? currentModeState.entries : [];
      if (!entries.length) {
        statusElement.textContent = "Loading legend...";
        rowsSelection.selectAll("button.legend-row").remove();
        unmappedElement.textContent = "";
        return;
      }

      const mode = getMode();
      const activeKeys = reconcileActiveKeys(mode, getValidKeys(entries));
      activeLegendKeysByMode.set(mode, activeKeys);
      statusElement.textContent = "";
      unmappedElement.textContent =
        currentModeState.unmappedCount > 0
          ? `${currentModeState.unmappedCount.toLocaleString()} not mapped`
          : "";

      const rowButtons = rowsSelection
        .selectAll("button.legend-row")
        .data(entries, (entry) => entry.key)
        .join("button")
        .attr("type", "button")
        .attr("class", "legend-row")
        .attr("data-legend-key", (entry) => entry.key);

      rowButtons
        .classed("is-active", (entry) => activeKeys.has(entry.key))
        .classed("is-inactive", (entry) => !activeKeys.has(entry.key))
        .attr("aria-pressed", (entry) => String(activeKeys.has(entry.key)));

      rowButtons
        .selectAll("span")
        .data((entry) => [
          { className: "legend-dot", value: entry.color },
          { className: "legend-label", value: entry.label },
          { className: "legend-count", value: entry.count }
        ])
        .join("span")
        .attr("class", (part) => part.className)
        .style("background", (part) =>
          part.className === "legend-dot" ? part.value : null
        )
        .text((part) =>
          part.className === "legend-dot" ? "" : String(part.value)
        );
    },
    setError(message) {
      currentModeState = null;
      statusElement.textContent = message;
      rowsSelection.selectAll("button.legend-row").remove();
      unmappedElement.textContent = "";
    }
  };
}
