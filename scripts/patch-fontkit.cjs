const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../node_modules/@pdf-lib/fontkit/dist/fontkit.umd.js');
if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes('_proto.getAnchor = function getAnchor(anchor) {') && !content.includes('if (!anchor) return { x: 0, y: 0 };')) {
    content = content.replace(
      '_proto.getAnchor = function getAnchor(anchor) {',
      '_proto.getAnchor = function getAnchor(anchor) { if (!anchor) return { x: 0, y: 0 };'
    );
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('[patch-fontkit] Successfully patched GPOS null anchor check in fontkit.umd.js');
  }
}
