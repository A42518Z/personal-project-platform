const fs = require('fs');
const p = 'src/components/SchemaGraph/index.vue';
const s = fs.readFileSync(p, 'utf8');
const terms = ['function handleToolbarClick', 'function openPanel', 'function handleCanvasClick', 'on(\'edge', 'lf.on', 'function handleEdgeAdd', 'eventCenter', 'node:click', 'edge:click', 'selection:selected', 'function deleteSelected', 'function arrangeNodes', 'function registerGraphEvents'];
for (const term of terms) {
  console.log('\n===== ' + term + ' =====');
  let pos = s.indexOf(term);
  if (pos < 0) { console.log('not found'); continue; }
  const start = Math.max(0, s.lastIndexOf('\n', Math.max(0, pos - 700)));
  let end = s.indexOf('\nfunction ', pos + term.length + 2000);
  if (end < 0) end = Math.min(s.length, pos + 3500);
  console.log(s.slice(start, end));
}
