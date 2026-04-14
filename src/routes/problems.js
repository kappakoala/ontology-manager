const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');

// 获取问题列表
router.get('/', (req, res) => {
  const { domain_id, level } = req.query;
  let sql = `
    SELECT p.*, d.name as domain_name,
      (SELECT COUNT(*) FROM problems child WHERE child.parent_id=p.id) as child_count
    FROM problems p
    LEFT JOIN domains d ON p.domain_id=d.id WHERE 1=1
  `;
  const params = [];
  if (domain_id) { sql += ' AND p.domain_id=?'; params.push(domain_id); }
  if (level) { sql += ' AND p.level=?'; params.push(level); }
  sql += ' ORDER BY p.level, p.name';
  res.json({ data: db.prepare(sql).all(...params) });
});

// 创建问题
router.post('/', (req, res) => {
  const { name, description, level, domain_id, concept_id, parent_id } = req.body;
  if (!name || !level) return res.status(400).json({ error: '问题名称和层级不能为空' });
  const id = uuidv4();
  db.prepare(`INSERT INTO problems (id, name, description, level, domain_id, concept_id, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, description || null, level, domain_id || null, concept_id || null, parent_id || null);
  res.json({ data: db.prepare('SELECT * FROM problems WHERE id=?').get(id) });
});

// 更新问题
router.put('/:id', (req, res) => {
  const { name, description, level, domain_id, concept_id, parent_id } = req.body;
  db.prepare(`UPDATE problems SET name=?, description=?, level=?, domain_id=?, concept_id=?, parent_id=? WHERE id=?`)
    .run(name, description || null, level, domain_id || null, concept_id || null, parent_id || null, req.params.id);
  res.json({ data: db.prepare('SELECT * FROM problems WHERE id=?').get(req.params.id) });
});

// 删除问题
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM problems WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// 获取目标列表
router.get('/goals', (req, res) => {
  const { domain_id } = req.query;
  let sql = `SELECT g.*, d.name as domain_name, p.name as problem_name
             FROM goals g
             LEFT JOIN domains d ON g.domain_id=d.id
             LEFT JOIN problems p ON g.problem_id=p.id WHERE 1=1`;
  const params = [];
  if (domain_id) { sql += ' AND g.domain_id=?'; params.push(domain_id); }
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post('/goals', (req, res) => {
  const { name, description, problem_id, domain_id, indicator } = req.body;
  if (!name) return res.status(400).json({ error: '目标名称不能为空' });
  const id = uuidv4();
  db.prepare(`INSERT INTO goals (id, name, description, problem_id, domain_id, indicator) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, name, description || null, problem_id || null, domain_id || null, indicator || null);
  res.json({ data: db.prepare('SELECT * FROM goals WHERE id=?').get(id) });
});

router.put('/goals/:id', (req, res) => {
  const { name, description, problem_id, domain_id, indicator } = req.body;
  db.prepare(`UPDATE goals SET name=?, description=?, problem_id=?, domain_id=?, indicator=? WHERE id=?`)
    .run(name, description || null, problem_id || null, domain_id || null, indicator || null, req.params.id);
  res.json({ data: db.prepare('SELECT * FROM goals WHERE id=?').get(req.params.id) });
});

router.delete('/goals/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
