const fs = require('fs');
const p = 'src/components/SchemaGraph/index.vue';
const s = fs.readFileSync(p, 'utf8');
console.log('len', s.length, 'lines', s.split(/\r?\n/).length);
for (const term of ['dialog', 'Dialog', 'edge', 'toolbar', 'node', 'drawer', 'menu']) {
  console.log('\n---TERM ' + term + '---');
  let pos = 0, c = 0;
  while ((pos = s.indexOf(term, pos)) >= 0 && c < 5) {
    const start = Math.max(0, s.lastIndexOf('\n', Math.max(0, pos - 420)));
    let end = s.indexOf('\n', pos + 700);
    if (end < 0) end = s.length;
    console.log(s.slice(start, end));
    console.log('---');
    pos += term.length;
    c++;
  }
}
