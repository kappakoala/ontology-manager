const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');

// 获取所有领域（树形结构）
router.get('/', (req, res) => {
  const domains = db.prepare('SELECT * FROM domains ORDER BY type, name').all();
  res.json({ data: domains });
});

// 创建领域
router.post('/', (req, res) => {
  const { name, description, type = 'domain', parent_id } = req.body;
  if (!name) return res.status(400).json({ error: '领域名称不能为空' });
  try {
    const id = uuidv4();
    db.prepare(`INSERT INTO domains (id, name, description, type, parent_id) VALUES (?, ?, ?, ?, ?)`)
      .run(id, name, description, type, parent_id || null);
    res.json({ data: db.prepare('SELECT * FROM domains WHERE id=?').get(id) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 更新领域
router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  db.prepare(`UPDATE domains SET name=?, description=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, description, req.params.id);
  res.json({ data: db.prepare('SELECT * FROM domains WHERE id=?').get(req.params.id) });
});

// 删除领域
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM domains WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// 获取领域下的概念统计
router.get('/:id/stats', (req, res) => {
  const domain = db.prepare('SELECT * FROM domains WHERE id=?').get(req.params.id);
  if (!domain) return res.status(404).json({ error: '领域不存在' });
  const conceptCount = db.prepare('SELECT COUNT(*) as n FROM concepts WHERE domain_id=?').get(req.params.id);
  const byType = db.prepare('SELECT element_type, COUNT(*) as n FROM concepts WHERE domain_id=? GROUP BY element_type').all(req.params.id);
  res.json({ domain, concept_count: conceptCount.n, by_element_type: byType });
});

module.exports = router;
