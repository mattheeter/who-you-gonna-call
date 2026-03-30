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

    const actions = L.DomUtil.create("div", "service-type-actions", panel);
    const selectAllButton = L.DomUtil.create("button", "select-all-btn", actions);
    selectAllButton.type = "button";
    selectAllButton.textContent = "Select All";

    const deselectAllButton = L.DomUtil.create("button", "deselect-all-btn", actions);
    deselectAllButton.type = "button";
    deselectAllButton.textContent = "Deselect All";

    const checkboxes = [];

    SERVICE_TYPES.forEach((serviceType) => {
      const label = L.DomUtil.create("label", "service-type-label", panel);
      const checkbox = L.DomUtil.create("input", "", label);
      checkbox.type = "checkbox";
      checkbox.value = serviceType.value;
      checkbox.checked = initialSelected.includes(serviceType.value);
      label.appendChild(document.createTextNode(` ${serviceType.label}`));

      checkboxes.push(checkbox);
      labels.push({
        label,
        type: serviceType.value,
        originalText: serviceType.label
      });
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    L.DomEvent.on(button, "click", (event) => {
      L.DomEvent.stop(event);
      panel.style.display = panel.style.display === "none" ? "block" : "none";
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

    labels.forEach(({ label, type, originalText }) => {
      label.lastChild.textContent = ` ${originalText} (${counts[type].toLocaleString()})`;
    });
  };

  return control;
}
