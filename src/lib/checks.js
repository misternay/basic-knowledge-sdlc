// Exercise checking shared by the app and scripts/check-content.mjs.
// A check is either { label, pattern, negate? } (regex tested against the
// lower-cased answer with comments removed) or
// { label, json: { path, op, value? } } (answer parsed as JSON).

export function stripComments(code, lang) {
  let c = String(code || '');
  if (lang === 'sql') c = c.replace(/--.*$/gm, '');
  if (lang === 'javascript' || lang === 'typescript') {
    c = c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }
  if (lang === 'shell' || lang === 'yaml' || lang === 'dockerfile' || lang === 'python') {
    c = c.replace(/^\s*#.*$/gm, '');
  }
  return c;
}

export function getPath(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function runJsonCheck(spec, code) {
  let data;
  try { data = JSON.parse(code); } catch { return false; }
  const v = getPath(data, spec.path || '');
  switch (spec.op) {
    case 'exists': return v !== undefined && v !== null;
    case 'equals': return v === spec.value;
    case 'contains': return Array.isArray(v) ? v.includes(spec.value) : typeof v === 'string' && v.includes(spec.value);
    case 'containsAll': return Array.isArray(v) && Array.isArray(spec.value) && spec.value.every((x) => v.includes(x));
    case 'matches': try { return new RegExp(spec.value, 'i').test(String(v ?? '')); } catch { return false; }
    default: return false;
  }
}

export function compileCheck(check) {
  if (check.json) return null;
  try { return new RegExp(check.pattern, 'im'); } catch { return undefined; }
}

export function runChecks(exercise, code) {
  const lc = stripComments(code, exercise.lang).toLowerCase();
  return (exercise.checks || []).map((check) => {
    let ok = false;
    if (check.json) ok = runJsonCheck(check.json, code);
    else {
      const re = compileCheck(check);
      ok = re ? re.test(lc) : false;
    }
    if (check.negate) ok = !ok;
    return { label: check.label, ok };
  });
}
