const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');

// 搜索（全文检索）
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ data: [] });

  const concepts = db.prepare(`
    SELECT 'concept' as type, id, name, element_type as subtype, definition as description
    FROM concepts WHERE name LIKE ? OR definition LIKE ? OR alias LIKE ?
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);

  const domains = db.prepare(`
    SELECT 'domain' as type, id, name, 'domain' as subtype, description
    FROM domains WHERE name LIKE ? OR description LIKE ?
    LIMIT 10
  `).all(`%${q}%`, `%${q}%`);

  res.json({ data: [...concepts, ...domains] });
});

// 统计总览
router.get('/stats', (req, res) => {
  const totalConcepts = db.prepare('SELECT COUNT(*) as n FROM concepts').get().n;
  const totalDomains = db.prepare('SELECT COUNT(*) as n FROM domains').get().n;
  const totalRelations = db.prepare('SELECT COUNT(*) as n FROM relations').get().n;
  const totalProblems = db.prepare('SELECT COUNT(*) as n FROM problems').get().n;
  const totalGoals = db.prepare('SELECT COUNT(*) as n FROM goals').get().n;

  const byElementType = db.prepare(`
    SELECT element_type, COUNT(*) as n FROM concepts GROUP BY element_type
  `).all();

  const bySystemRole = db.prepare(`
    SELECT system_role, COUNT(*) as n FROM concepts GROUP BY system_role
  `).all();

  const recentConcepts = db.prepare(`
    SELECT c.id, c.name, c.element_type, c.created_at, d.name as domain_name
    FROM concepts c LEFT JOIN domains d ON c.domain_id=d.id
    ORDER BY c.created_at DESC LIMIT 5
  `).all();

  res.json({
    totals: { concepts: totalConcepts, domains: totalDomains, relations: totalRelations, problems: totalProblems, goals: totalGoals },
    by_element_type: byElementType,
    by_system_role: bySystemRole,
    recent_concepts: recentConcepts
  });
});

// 导出 JSON
router.get('/export', (req, res) => {
  const { domain_id } = req.query;
  let filter = '';
  const params = [];
  if (domain_id) { filter = ' WHERE domain_id=?'; params.push(domain_id); }

  const data = {
    version: '1.0',
    methodology: '知识本体方法论说明v3.7',
    exported_at: new Date().toISOString(),
    domains: db.prepare('SELECT * FROM domains' + (domain_id ? ' WHERE id=?' : '')).all(...(domain_id ? [domain_id] : [])),
    concepts: db.prepare('SELECT * FROM concepts' + filter).all(...params),
    attributes: domain_id
      ? db.prepare('SELECT a.* FROM attributes a JOIN concepts c ON a.concept_id=c.id WHERE c.domain_id=?').all(domain_id)
      : db.prepare('SELECT * FROM attributes').all(),
    relations: db.prepare('SELECT * FROM relations' + filter).all(...params),
    problems: db.prepare('SELECT * FROM problems' + filter).all(...params),
    goals: db.prepare('SELECT * FROM goals' + filter).all(...params),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ontology-export-${Date.now()}.json"`);
  res.json(data);
});

// 导入 JSON
router.post('/import', (req, res) => {
  const data = req.body;
  if (!data || !data.concepts) return res.status(400).json({ error: '无效的导入数据' });

  const importOne = db.transaction((data) => {
    let counts = { domains: 0, concepts: 0, relations: 0, attributes: 0 };

    for (const d of (data.domains || [])) {
      const exists = db.prepare('SELECT id FROM domains WHERE id=?').get(d.id);
      if (!exists) {
        db.prepare('INSERT INTO domains (id, name, description, type, parent_id) VALUES (?,?,?,?,?)')
          .run(d.id, d.name, d.description, d.type || 'domain', d.parent_id || null);
        counts.domains++;
      }
    }
    for (const c of (data.concepts || [])) {
      const exists = db.prepare('SELECT id FROM concepts WHERE id=?').get(c.id);
      if (!exists) {
        db.prepare(`INSERT INTO concepts (id, name, alias, definition, element_type, system_role, domain_id, is_universal, note)
                    VALUES (?,?,?,?,?,?,?,?,?)`)
          .run(c.id, c.name, c.alias, c.definition, c.element_type, c.system_role, c.domain_id, c.is_universal || 0, c.note);
        counts.concepts++;
      }
    }
    for (const a of (data.attributes || [])) {
      const exists = db.prepare('SELECT id FROM attributes WHERE id=?').get(a.id);
      if (!exists) {
        db.prepare('INSERT INTO attributes (id, concept_id, name, value, attr_type, data_type, note) VALUES (?,?,?,?,?,?,?)')
          .run(a.id, a.concept_id, a.name, a.value, a.attr_type, a.data_type, a.note);
        counts.attributes++;
      }
    }
    for (const r of (data.relations || [])) {
      const exists = db.prepare('SELECT id FROM relations WHERE id=?').get(r.id);
      if (!exists) {
        db.prepare('INSERT INTO relations (id, source_id, target_id, relation_type, rel_kind, label, note, domain_id) VALUES (?,?,?,?,?,?,?,?)')
          .run(r.id, r.source_id, r.target_id, r.relation_type, r.rel_kind, r.label, r.note, r.domain_id);
        counts.relations++;
      }
    }
    return counts;
  });

  try {
    const counts = importOne(data);
    res.json({ success: true, imported: counts });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
