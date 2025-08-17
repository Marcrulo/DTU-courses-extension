// Get course ID from URL
// Example: https://kurser.dtu.dk/course/<course-id>
const courseId = window.location.pathname.split('/').pop();

// Load id_to_name mapping from JSON file
async function loadIdToName() {
  try {
    const response = await fetch(chrome.runtime.getURL("id_to_name.json"));
    return await response.json();
  } catch (err) {
    console.error("Error loading id_to_name.json", err);
    throw err; // rethrow so the caller knows it failed
  }
}

// Load graph data from JSON file for a specific courseId
async function loadGraph(courseId) {
  try {
    const response = await fetch(chrome.runtime.getURL("graphs.json"));
    const data = await response.json();
    return data[courseId];
  } catch (err) {
    console.error("Error loading graphs.json", err);
    throw err;
  }
}

/*
Graph JSON structure example:

{
  "01001": {
    "name": "Math",
    "nodes": [
      {"id": "01003", "level": -1},
      {"id": "01567", "level": 1}
    ],
    "edges": [
      {"source": "01003", "target": "01001"},
      {"source": "01001", "target": "01567"}
    ],
    "max_subseq": 1,
    "max_prereq": 1,
    "subseq_height": 1,
    "prereq_height": 5
  }
}
*/

(async () => {
  const graph = await loadGraph(courseId);
  const mapping = await loadIdToName();

  // Insert new rows into the second table on the page
  const tables = document.querySelectorAll("table");
  const table = tables[1];

  const rowBefore = table.insertRow();
  const cell_before1 = rowBefore.insertCell();
  const cell_before2 = rowBefore.insertCell();

  // Disclaimer row
  const rowDisclaimer = table.insertRow();
  const cell_disclaimer = rowDisclaimer.insertCell();
  cell_disclaimer.colSpan = 2;
  cell_disclaimer.innerHTML =
    `<label style='font-style: italic; color: gray;'>
      The graph shows all possible paths of courses leading to/from ${courseId}. <br>
      However, it is rarely required to take all the courses shown!
    </label>`;

  const rowPrereq = table.insertRow();
  const cell_title_prereq = rowPrereq.insertCell();
  const cell_content_prereq = rowPrereq.insertCell();

  const rowSubseq = table.insertRow();
  const cell_title_subseq = rowSubseq.insertCell();
  const cell_content_subseq = rowSubseq.insertCell();

  // Footer / contact row
  const rowContact = table.insertRow();
  const cell_contact = rowContact.insertCell();
  cell_contact.colSpan = 2;
  cell_contact.innerHTML =
    `<label style='font-style: italic; color: gray; font-size: 8px;'>
      <br><br>You are welcome to contribute to the project by <br>
      leaving feedback or suggesting improvements: <br>
      <a href="https://github.com/your-repo" target="_blank">https://github.com/your-repo</a>
    </label>`;

  const rowAfter = table.insertRow();
  const cell_after1 = rowAfter.insertCell();
  const cell_after2 = rowAfter.insertCell();

  // Section titles
  cell_title_prereq.innerHTML = "<label>Prerequisite course <br> paths</label>";
  cell_title_subseq.innerHTML = "<label>Subsequent course <br> paths</label>";

  // Section dividers
  [cell_before1, cell_before2, cell_after1, cell_after2].forEach(cell => {
    cell.innerHTML = `<div style="border-top: 1px solid #b50404; margin: 10px 0;"></div>`;
  });

  /* ====== BUILD TABLES ====== */
  function buildTables(courseId, graph) {
    const { max_subseq = 0, max_prereq = 0, subseq_height = 0, prereq_height = 0 } = graph;

    const table_prereq = Array.from({ length: prereq_height }, () =>
      Array(max_prereq + 1).fill(null)
    );
    const table_subseq = Array.from({ length: subseq_height }, () =>
      Array(max_subseq + 1).fill(null)
    );

    const prereq_row = {};
    const subseq_row = {};

    // Place nodes in correct table depending on level
    for (const { id, level } of graph.nodes) {
      if (level < 0) {
        if (!(level in prereq_row)) prereq_row[level] = 0;
        table_prereq[prereq_row[level]][max_prereq + level] = id;
        prereq_row[level]++;
      } else if (level > 0) {
        if (!(level in subseq_row)) subseq_row[level] = 0;
        table_subseq[subseq_row[level]][level] = id;
        subseq_row[level]++;
      }
    }

    // Place the courseId itself
    if (prereq_height > 0) table_prereq[0][max_prereq] = courseId;
    if (subseq_height > 0) table_subseq[0][0] = courseId;

    // Ensure non-empty tables
    if (table_prereq.length === 0) table_prereq.push([null]);
    if (table_subseq.length === 0) table_subseq.push([null]);

    // Add spacing columns
    for (let row of table_prereq) {
      for (let j = 1; j < row.length; j += 2) row.splice(j, 0, null);
    }
    for (let row of table_subseq) {
      for (let j = 1; j < row.length; j += 2) row.splice(j, 0, null);
    }

    // Helper: sort values in each column alphabetically
    function sortColumns(table) {
      const rows = table.length;
      const cols = table[0]?.length || 0;

      for (let col = 0; col < cols; col++) {
        const values = [];
        for (let row = 0; row < rows; row++) {
          if (table[row][col] !== null) values.push(table[row][col]);
        }
        values.sort();
        for (let row = 0; row < rows; row++) {
          table[row][col] = row < values.length ? values[row] : null;
        }
      }
    }

    // Helper: center values vertically in each column
    function centerColumns(table) {
      const rows = table.length;
      const cols = table[0]?.length || 0;

      for (let col = 0; col < cols; col++) {
        const values = [];
        for (let row = 0; row < rows; row++) {
          if (table[row][col] !== null) values.push(table[row][col]);
        }
        const filled = values.length;
        if (filled === 0) continue;

        const topPadding = Math.floor((rows - filled) / 2);
        for (let row = 0; row < rows; row++) {
          const idx = row - topPadding;
          table[row][col] = idx >= 0 && idx < filled ? values[idx] : null;
        }
      }
    }

    sortColumns(table_prereq);
    sortColumns(table_subseq);
    centerColumns(table_prereq);
    centerColumns(table_subseq);

    return { table_prereq, table_subseq };
  }

  const { table_prereq, table_subseq } = buildTables(courseId, graph);

  /* ====== RENDER TABLES ====== */
  function renderTable(table, type, fontSizeBase) {
    return `
      <table id='course-overview-${type}' style="width: 100%; border-collapse: separate;">
        ${table.map(row => `
          <tr>
            ${row.map((cell, index) => `
              <td id='${cell ? cell + "_" + type : ""}'
                  style="width: ${index % 2 === 0 ? "30px" : "50px"};">
                ${cell ? `
                  <a href="https://kurser.dtu.dk/course/${cell}"
                     class="tooltip-link"
                     style="color: #b50404; text-decoration: none; font-size: ${fontSizeBase - (type === "prereq" ? graph.max_prereq : graph.max_subseq)}px;">
                    ${cell}
                    <span class="tooltip-text">${mapping[cell] || "No info available"}</span>
                  </a>` : ""}
              </td>`).join("")}
          </tr>`).join("")}
      </table>
    `;
  }

  // Fill content cells
  cell_content_prereq.innerHTML = renderTable(table_prereq, "prereq", 16);
  cell_content_subseq.innerHTML = renderTable(table_subseq, "subseq", 16);

  // Replace with labels if empty
  function isTableEmpty(table) {
    return table.every(row => row.every(cell => cell === null));
  }
  if (isTableEmpty(table_prereq)) {
    cell_content_prereq.innerHTML =
      `<label style="font-style: italic; color: gray;">This course does not have any prerequisites</label>`;
  }
  if (isTableEmpty(table_subseq)) {
    cell_content_subseq.innerHTML =
      `<label style="font-style: italic; color: gray;">This course does not lead to any other courses</label>`;
  }

  // Highlight "endpoints" of prereq/subseq tables
  cell_content_prereq.querySelectorAll("td:last-child").forEach(cell => {
    cell.style.fontStyle = "italic";
    cell.style.textDecoration = "underline";
    cell.style.color = "#b50404";
  });
  cell_content_subseq.querySelectorAll("td:first-child").forEach(cell => {
    cell.style.fontStyle = "italic";
    cell.style.textDecoration = "underline";
    cell.style.color = "#b50404";
  });

  /* ====== DRAW STATIC LEADERLINES ====== */
  for (const edge of graph.edges) {
    for (const suffix of ["_prereq", "_subseq"]) {
      const startNode = document.getElementById(edge.source + suffix);
      const endNode = document.getElementById(edge.target + suffix);
      if (startNode && endNode) {
        new LeaderLine(startNode, endNode, {
          size: 2,
          color: "rgba(36, 4, 9, 0.3)",
          path: "straight",
          endPlug: "arrow3",
          startSocket: "right",
          endSocket: "left",
        });
      }
    }
  }

  /* ====== INTERACTIVE HIGHLIGHTING ====== */
  let tempLines = [];
  let highlightedLinks = [];

  document.querySelectorAll(".tooltip-link").forEach(link => {
    link.addEventListener("mouseenter", () => {
      const table_id = "_" + link.closest("table").id.split("-")[2]; // "_prereq" or "_subseq"
      const hoveredId = link.href.split("/").pop();

      // Find edges connected to hovered course
      const connectedEdges = graph.edges.filter(
        e => e.source === hoveredId || e.target === hoveredId
      );

      // Collect all connected IDs
      const connectedIds = new Set([hoveredId]);
      connectedEdges.forEach(e => {
        connectedIds.add(e.source);
        connectedIds.add(e.target);
      });

      // Highlight connected nodes
      connectedIds.forEach(id => {
        const elems = document.querySelectorAll(`td[id='${id}${table_id}'] .tooltip-link`);
        elems.forEach(el => {
          el.style.fontWeight = "bold";
          el.style.textDecoration = "underline";
          el.style.color = "#b50404";
          highlightedLinks.push(el);
        });
      });

      // Draw temporary leaderlines
      connectedEdges.forEach(edge => {
        const startNode = document.getElementById(edge.source + table_id);
        const endNode = document.getElementById(edge.target + table_id);
        if (startNode && endNode) {
          const line = new LeaderLine(startNode, endNode, {
            size: 3,
            color: "rgba(181, 4, 4, 0.9)",
            path: "straight",
            endPlug: "arrow3",
            startSocket: "right",
            endSocket: "left",
          });
          tempLines.push(line);
        }
      });
    });

    link.addEventListener("mouseleave", () => {
      // Remove temporary lines
      tempLines.forEach(line => line.remove());
      tempLines = [];

      // Remove highlights
      highlightedLinks.forEach(el => {
        el.style.fontWeight = "";
        el.style.textDecoration = "";
        el.style.color = "";
      });
      highlightedLinks = [];
    });
  });
})();
