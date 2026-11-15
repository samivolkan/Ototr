import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Execute the real relative server modules in VM tests; npm dependencies remain
// the test's explicit external bindings. Module scope prevents name collisions.
export async function edgeSource(url) {
  const cache = new Map();
  let serial = 0;
  async function visit(file) {
    if (cache.has(file.href)) return cache.get(file.href);
    const name = '__edgeModule' + serial++;
    cache.set(file.href, name);
    let source = await readFile(file, 'utf8'), prefix = '';
    const imports = [...source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\r?\n/gm)];
    for (const match of imports) {
      if (match[2].startsWith('.')) {
        const child = await visit(new URL(match[2],file));
        prefix += 'const {' + match[1].replace(/\s+as\s+/g, ':') + '} = ' + child + ';\n';
      }
      source = source.replace(match[0], '');
    }
    const exports = [...source.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)/gm)].map(match=>match[1]);
    source = source.replace(/^export\s+/gm,'');
    const body=stripTypeScriptTypes(source,{mode:'transform'});
    chunks.push('const '+name+'=(()=>{\n'+prefix+body+'\nreturn {'+exports.join(',')+'};\n})();');
    return name;
  }
  const chunks=[];
  // The entry stays in global VM scope for tests that inspect its public helpers.
  let entry=await readFile(url,'utf8'), bindings='';
  for(const match of [...entry.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\r?\n/gm)]) {
    if(match[2].startsWith('.')) bindings+='const {'+match[1].replace(/\s+as\s+/g,':')+'}='+await visit(new URL(match[2],url))+';\n';
    entry=entry.replace(match[0],'');
  }
  return chunks.join('\n')+'\n'+bindings+stripTypeScriptTypes(entry,{mode:'transform'});
}
