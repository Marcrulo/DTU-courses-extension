// Get course ID from URL
const courseId = window.location.pathname.split('/').pop();

// Load id_to_name mapping
async function loadIdToName() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/Marcrulo/DTU-courses-extension/master/jsons/id_to_name.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("Error loading id_to_name.json", err);
    throw err;
  }
}

// Load graph data for a course
async function loadGraph(courseId) {
  try {
    const response = await fetch('https://raw.githubusercontent.com/Marcrulo/DTU-courses-extension/master/jsons/graphs.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data[courseId];
  } catch (err) {
    console.error("Error loading graphs.json", err);
    throw err;
  }
}

// Utility: check if table is empty
function isTableEmpty(table) { return table.every(row => row.every(cell => cell === null)); }

// Utility: get max column size
function getMaxColumnSize(table) {
  if (!table.length || !table[0].length) return 0;
  let max = 0;
  const cols = table[0].length;
  for (let col = 0; col < cols; col++) {
    let count = 0;
    for (let row = 0; row < table.length; row++) if (table[row][col] !== null) count++;
    if (count > max) max = count;
  }
  return max;
}

(async () => {
  const graph = await loadGraph(courseId);
  const mapping = await loadIdToName();

  const tables = document.querySelectorAll("table");
  const table = tables[1];

  const rowBefore = table.insertRow();
  const cell_before1 = rowBefore.insertCell();
  const cell_before2 = rowBefore.insertCell();

  // Disclaimer
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

  const rowContact = table.insertRow();
  const cell_contact = rowContact.insertCell();
  cell_contact.colSpan = 2;
  cell_contact.innerHTML =
    `<label style='font-style: italic; color: gray; font-size: 8px;'>
      <br><br>You are welcome to contribute to the project by <br>
      leaving feedback or suggesting improvements: <br>
      <a href="https://github.com/Marcrulo/DTU-courses-extension" target="_blank">https://github.com/Marcrulo/DTU-courses-extension</a>
    </label>`;

  const rowAfter = table.insertRow();
  const cell_after1 = rowAfter.insertCell();
  const cell_after2 = rowAfter.insertCell();

  // Titles
  cell_title_prereq.innerHTML = "<label>Prerequisite course <br> paths</label>";
  cell_title_subseq.innerHTML = "<label>Subsequent course <br> paths</label>";

  // Section dividers
  [cell_before1, cell_before2, cell_after1, cell_after2].forEach(cell => {
    cell.innerHTML = `<div style="border-top: 1px solid #b50404; margin: 10px 0;"></div>`;
  });

  /* ====== BUILD TABLES ====== */
  function buildTables(courseId, graph) {
    const { max_subseq = 0, max_prereq = 0, subseq_height = 0, prereq_height = 0 } = graph;

    const table_prereq = Array.from({ length: prereq_height }, () => Array(max_prereq + 1).fill(null));
    const table_subseq = Array.from({ length: subseq_height }, () => Array(max_subseq + 1).fill(null));

    const prereq_row = {};
    const subseq_row = {};

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

    if (prereq_height > 0) table_prereq[0][max_prereq] = courseId;
    if (subseq_height > 0) table_subseq[0][0] = courseId;

    for (let row of table_prereq) for (let j = 1; j < row.length; j += 2) row.splice(j, 0, null);
    for (let row of table_subseq) for (let j = 1; j < row.length; j += 2) row.splice(j, 0, null);

    function sortColumns(table) {
      const rows = table.length, cols = table[0]?.length || 0;
      for (let col = 0; col < cols; col++) {
        const values = [];
        for (let row = 0; row < rows; row++) if (table[row][col] !== null) values.push(table[row][col]);
        values.sort();
        for (let row = 0; row < rows; row++) table[row][col] = row < values.length ? values[row] : null;
      }
    }

    function centerColumns(table) {
      const rows = table.length, cols = table[0]?.length || 0;
      for (let col = 0; col < cols; col++) {
        const values = [];
        for (let row = 0; row < rows; row++) if (table[row][col] !== null) values.push(table[row][col]);
        const filled = values.length;
        if (!filled) continue;
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

  function renderTable(table, type, fontSizeBase) {
    return `
      <table id='course-overview-${type}' style="width: 100%; border-collapse: separate; opacity:0; transition: opacity 0.5s;">
        ${table.map(row => `
          <tr>${row.map((cell,index)=>`
            <td id='${cell ? cell + "_" + type : ""}' style="width:${index%2===0?'30px':'50px'}; text-align:center; vertical-align:middle;">
              ${cell?`<a href="https://kurser.dtu.dk/course/${cell}" class="tooltip-link" style="color:#b50404;text-decoration:none;font-size:${fontSizeBase-(type==='prereq'?graph.max_prereq:graph.max_subseq)}px;">
              ${cell}<span class="tooltip-text">${mapping[cell]||"No info available"}</span></a>`:""}
            </td>`).join("")}
          </tr>`).join("")}
      </table>
    `;
  }

  /* ====== PREVIEW/SHOW LOGIC BASED ON MAX COLUMN SIZE ====== */
  function renderPreview(cellContent, tableData, type, emptyMessage) {
    if (isTableEmpty(tableData)) {
      cellContent.innerHTML = `<label style="font-style: italic; color: gray;">${emptyMessage}</label>`;
      return;
    }

    const maxCol = getMaxColumnSize(tableData);
    if (maxCol > 10) {
      cellContent.innerHTML = `
        <div style="font-style: italic; color: gray; text-align: center; margin: 10px 0;">
          The ${type} graph is quite big. Click the button below to show the full graph.
        </div>
        <div style="text-align: center; margin: 5px 0;">
          <button class="showFullGraph" data-type="${type}" style="padding:5px 10px; cursor:pointer;">Show full graph</button>
        </div>
      `;
    } else {
      renderFullGraph(type);
    }
  }

  /* ====== FULL GRAPH RENDER ====== */
  function renderFullGraph(type) {
    const cellContent = type==="prerequisite"?cell_content_prereq:cell_content_subseq;
    const tableData = type==="prerequisite"?table_prereq:table_subseq;
    const suffix = type==="prerequisite"?"_prereq":"_subseq";

    if (isTableEmpty(tableData)) return;

    cellContent.innerHTML = renderTable(tableData,suffix.slice(1),16);
    const tableEl = cellContent.querySelector("table");
    setTimeout(()=>{tableEl.style.opacity=1;},10);

    if(type==="prerequisite"){
      tableEl.querySelectorAll("td:last-child").forEach(c=>{c.style.fontStyle="italic";c.style.textDecoration="underline";c.style.color="#b50404";});
    } else {
      tableEl.querySelectorAll("td:first-child").forEach(c=>{c.style.fontStyle="italic";c.style.textDecoration="underline";c.style.color="#b50404";});
    }

    for(const edge of graph.edges){
      const startNode=document.getElementById(edge.source+suffix);
      const endNode=document.getElementById(edge.target+suffix);
      if(startNode && endNode){
        new LeaderLine(startNode,endNode,{size:2,color:"rgba(36,4,9,0.3)",path:"straight",endPlug:"arrow3",startSocket:"right",endSocket:"left"});
      }
    }

    let tempLines=[], highlightedLinks=[];
    tableEl.querySelectorAll(".tooltip-link").forEach(link=>{
      link.addEventListener("mouseenter",()=>{
        const hoveredId=link.href.split("/").pop();
        const connectedEdges=graph.edges.filter(e=>e.source===hoveredId || e.target===hoveredId);
        const connectedIds=new Set([hoveredId]);
        connectedEdges.forEach(e=>{connectedIds.add(e.source); connectedIds.add(e.target);});
        connectedIds.forEach(id=>{
          const elems=document.querySelectorAll(`td[id='${id}${suffix}'] .tooltip-link`);
          elems.forEach(el=>{el.style.fontWeight="bold";el.style.textDecoration="underline";el.style.color="#b50404";highlightedLinks.push(el);});
        });
        connectedEdges.forEach(edge=>{
          const startNode=document.getElementById(edge.source+suffix);
          const endNode=document.getElementById(edge.target+suffix);
          if(startNode && endNode){
            const line=new LeaderLine(startNode,endNode,{size:3,color:"rgba(181,4,4,0.9)",path:"straight",endPlug:"arrow3",startSocket:"right",endSocket:"left"});
            tempLines.push(line);
          }
        });
      });
      link.addEventListener("mouseleave",()=>{
        tempLines.forEach(l=>l.remove()); tempLines=[];
        highlightedLinks.forEach(el=>{el.style.fontWeight="";el.style.textDecoration="";el.style.color="";});
        highlightedLinks=[];
      });
    });
  }

  // Render previews
  renderPreview(cell_content_prereq, table_prereq, "prerequisite", "This course does not have any prerequisites");
  renderPreview(cell_content_subseq, table_subseq, "subsequent", "This course does not lead to any other courses");

  // Button click
  document.addEventListener("click", e=>{
    if(e.target && e.target.classList.contains("showFullGraph")){
      const type=e.target.dataset.type;
      renderFullGraph(type);
      e.target.parentElement.remove();
    }
  });

})();
