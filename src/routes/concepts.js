const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');

// 获取概念列表（支持过滤）
router.get('/', (req, res) => {
  const { domain_id, element_type, system_role, q, is_universal } = req.query;
  let sql = 'SELECT c.*, d.name as domain_name FROM concepts c LEFT JOIN domains d ON c.domain_id=d.id WHERE 1=1';
  const params = [];

  if (domain_id) { sql += ' AND c.domain_id=?'; params.push(domain_id); }
  if (element_type) { sql += ' AND c.element_type=?'; params.push(element_type); }
  if (system_role) { sql += ' AND c.system_role=?'; params.push(system_role); }
  if (is_universal !== undefined) { sql += ' AND c.is_universal=?'; params.push(Number(is_universal)); }
  if (q) {
    sql += ' AND (c.name LIKE ? OR c.definition LIKE ? OR c.alias LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY c.element_type, c.name';

  const concepts = db.prepare(sql).all(...params);

  // 为每个概念附加属性数量
  for (const c of concepts) {
    c.attr_count = db.prepare('SELECT COUNT(*) as n FROM attributes WHERE concept_id=?').get(c.id).n;
    c.relation_count = db.prepare(
      'SELECT COUNT(*) as n FROM relations WHERE source_id=? OR target_id=?'
    ).get(c.id, c.id).n;
  }

  res.json({ data: concepts });
});

// 获取单个概念（带属性和关系）
router.get('/:id', (req, res) => {
  const concept = db.prepare(
    'SELECT c.*, d.name as domain_name FROM concepts c LEFT JOIN domains d ON c.domain_id=d.id WHERE c.id=?'
  ).get(req.params.id);
  if (!concept) return res.status(404).json({ error: '概念不存在' });

  concept.attributes = db.prepare('SELECT * FROM attributes WHERE concept_id=? ORDER BY attr_type, name').all(req.params.id);
  concept.relations_out = db.prepare(`
    SELECT r.*, c.name as target_name, c.element_type as target_type
    FROM relations r JOIN concepts c ON r.target_id=c.id
    WHERE r.source_id=?
  `).all(req.params.id);
  concept.relations_in = db.prepare(`
    SELECT r.*, c.name as source_name, c.element_type as source_type
    FROM relations r JOIN concepts c ON r.source_id=c.id
    WHERE r.target_id=?
  `).all(req.params.id);

  res.json({ data: concept });
});

// 创建概念
router.post('/', (req, res) => {
  const { name, alias, definition, element_type, system_role, domain_id, is_universal, note } = req.body;
  if (!name || !element_type) return res.status(400).json({ error: '名称和要素类型不能为空' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO concepts (id, name, alias, definition, element_type, system_role, domain_id, is_universal, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, alias || null, definition || null, element_type, system_role || 'universal',
         domain_id || null, is_universal ? 1 : 0, note || null);

  res.json({ data: db.prepare('SELECT * FROM concepts WHERE id=?').get(id) });
});

// 更新概念
router.put('/:id', (req, res) => {
  const { name, alias, definition, element_type, system_role, domain_id, is_universal, note } = req.body;
  db.prepare(`
    UPDATE concepts SET name=?, alias=?, definition=?, element_type=?, system_role=?,
    domain_id=?, is_universal=?, note=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(name, alias || null, definition || null, element_type, system_role || 'universal',
         domain_id || null, is_universal ? 1 : 0, note || null, req.params.id);

  res.json({ data: db.prepare('SELECT * FROM concepts WHERE id=?').get(req.params.id) });
});

// 删除概念
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM concepts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── 属性 CRUD ───────────────────────────────
router.get('/:id/attributes', (req, res) => {
  const attrs = db.prepare('SELECT * FROM attributes WHERE concept_id=? ORDER BY attr_type, name').all(req.params.id);
  res.json({ data: attrs });
});

router.post('/:id/attributes', (req, res) => {
  const { name, value, attr_type = 'domain', data_type = 'string', note } = req.body;
  if (!name) return res.status(400).json({ error: '属性名称不能为空' });
  const id = uuidv4();
  db.prepare(`INSERT INTO attributes (id, concept_id, name, value, attr_type, data_type, note) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, name, value || null, attr_type, data_type, note || null);
  res.json({ data: db.prepare('SELECT * FROM attributes WHERE id=?').get(id) });
});

router.put('/:id/attributes/:attrId', (req, res) => {
  const { name, value, attr_type, data_type, note } = req.body;
  db.prepare(`UPDATE attributes SET name=?, value=?, attr_type=?, data_type=?, note=? WHERE id=? AND concept_id=?`)
    .run(name, value || null, attr_type, data_type, note || null, req.params.attrId, req.params.id);
  res.json({ data: db.prepare('SELECT * FROM attributes WHERE id=?').get(req.params.attrId) });
});

router.delete('/:id/attributes/:attrId', (req, res) => {
  db.prepare('DELETE FROM attributes WHERE id=? AND concept_id=?').run(req.params.attrId, req.params.id);
  res.json({ success: true });
});

module.exports = router;
