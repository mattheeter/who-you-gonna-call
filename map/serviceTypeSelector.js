import { SERVICE_TYPES } from "./constants.js";

const { L } = window;

export function createServiceTypeSelectorControl({ map, onSelectionChange, initialSelected = [] }) {
  const control = L.control({ position: "topright" });
  let labels = [];

  control.onAdd = function onAdd() {
    const container = L.DomUtil.create("div", "service-type-selector leaflet-control");
    const button = L.DomUtil.create("button", "service-type-toggle", container);
    button.type = "button";
    button.textContent = "Service Types";
    button.setAttribute("aria-label", "Toggle service type visibility");

    const panel = L.DomUtil.create("div", "service-type-panel", container);
    panel.style.display = "none";

    const setPanelOpen = (open) => {
      panel.style.display = open ? "block" : "none";
      container.classList.toggle("service-type-panel-open", open);
    };

    const actions = L.DomUtil.create("div", "service-type-actions", panel);
    const selectAllButton = L.DomUtil.create("button", "select-all-btn", actions);
    selectAllButton.type = "button";
    selectAllButton.textContent = "Select All";

    const deselectAllButton = L.DomUtil.create("button", "deselect-all-btn", actions);
    deselectAllButton.type = "button";
    deselectAllButton.textContent = "Deselect All";

    const rows = L.DomUtil.create("div", "service-type-rows", panel);

    const checkboxes = [];

    SERVICE_TYPES.forEach((serviceType) => {
      const label = L.DomUtil.create("label", "service-type-row", rows);
      const checkbox = L.DomUtil.create("input", "service-type-checkbox", label);
      checkbox.type = "checkbox";
      checkbox.value = serviceType.value;
      checkbox.checked = initialSelected.includes(serviceType.value);

      const labelText = L.DomUtil.create("span", "service-type-row-label", label);
      labelText.textContent = serviceType.label;

      const countSpan = L.DomUtil.create("span", "service-type-row-count", label);
      countSpan.textContent = "0";

      checkboxes.push(checkbox);
      labels.push({
        label,
        labelText,
        countSpan,
        type: serviceType.value,
        originalText: serviceType.label
      });
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    L.DomEvent.on(button, "click", (event) => {
      L.DomEvent.stop(event);
      setPanelOpen(panel.style.display === "none");
    });

    const updateSelection = () => {
      const selected = checkboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
      onSelectionChange(selected);
    };

    checkboxes.forEach((checkbox) => {
      L.DomEvent.on(checkbox, "change", updateSelection);
    });

    L.DomEvent.on(selectAllButton, "click", (event) => {
      L.DomEvent.stop(event);
      checkboxes.forEach((checkbox) => {
        checkbox.checked = true;
      });
      updateSelection();
    });

    L.DomEvent.on(deselectAllButton, "click", (event) => {
      L.DomEvent.stop(event);
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      updateSelection();
    });

    updateSelection();

    return container;
  };

  control.updateCounts = function updateCounts(rows) {
    const counts = SERVICE_TYPES.reduce((serviceTypeCounts, serviceType) => {
      serviceTypeCounts[serviceType.value] = 0;
      return serviceTypeCounts;
    }, {});

    rows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(counts, row.serviceType)) {
        counts[row.serviceType] += 1;
      }
    });

    labels.forEach(({ labelText, countSpan, type, originalText }) => {
      labelText.textContent = originalText;
      countSpan.textContent = counts[type].toLocaleString();
    });
  };

  return control;
}
