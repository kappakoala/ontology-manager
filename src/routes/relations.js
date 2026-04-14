const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');

// 方法论定义的17种关系类型
const RELATION_TYPES = [
  { type: '分类', desc: '元素被拆分成多个同类元素而形成的关系', source: '无限制', target: '同类' },
  { type: '包含', desc: '政务本体元素应用到业务中而与领域建立的关系', source: '无限制', target: '无限制' },
  { type: '实施', desc: '主体为改变某个对象状态，与某些行为表现的关系', source: '主体', target: '行为' },
  { type: '利用', desc: '主体在实施某些行为时，与某些客体发生的关系', source: '行为', target: '客体' },
  { type: '在',   desc: '与行为产生的时空关系', source: '主体', target: '时间/空间' },
  { type: '确认', desc: '先确定当前两系统所处领域', source: '领域', target: '同类' },
  { type: '提出', desc: '对象主体根据自身诉求而向政务对象提出问题而建立的关系', source: '对象主体', target: '问题' },
  { type: '制定', desc: '政务主体为了解决对象主体提出的某个或某些问题而制定目标', source: '政务主体', target: '目标' },
  { type: '表现', desc: '以数量值刻画问题、目标', source: '指标', target: '问题/目标' },
  { type: '解决', desc: '政务主体制定目标为了满足某些诉求而与问题建立的关系', source: '目标', target: '问题' },
  { type: '实现', desc: '主体在实施某些行为时，与对象状态发生的变化', source: '主体', target: '对象状态' },
  { type: '依据', desc: '实施行为所依据的客体', source: '行为', target: '客体' },
  { type: '参考', desc: '实施行为所参考的客体', source: '行为', target: '客体' },
  { type: '输入', desc: '实施行为所输入的客体', source: '行为', target: '客体' },
  { type: '输出', desc: '实施行为所输出的客体', source: '行为', target: '客体' },
  { type: '集约', desc: '政务职能具体落地到功能的映射关系', source: '职能', target: '客体' },
  { type: '前置', desc: '行为与行为之间存在先后顺序，构成动作流程', source: '行为', target: '行为' },
];

// 获取关系类型列表
router.get('/types', (req, res) => {
  res.json({ data: RELATION_TYPES });
});

// 获取关系列表
router.get('/', (req, res) => {
  const { domain_id, source_id, target_id, relation_type } = req.query;
  let sql = `
    SELECT r.*,
      cs.name as source_name, cs.element_type as source_type,
      ct.name as target_name, ct.element_type as target_type,
      d.name as domain_name
    FROM relations r
    JOIN concepts cs ON r.source_id=cs.id
    JOIN concepts ct ON r.target_id=ct.id
    LEFT JOIN domains d ON r.domain_id=d.id
    WHERE 1=1
  `;
  const params = [];
  if (domain_id) { sql += ' AND r.domain_id=?'; params.push(domain_id); }
  if (source_id) { sql += ' AND r.source_id=?'; params.push(source_id); }
  if (target_id) { sql += ' AND r.target_id=?'; params.push(target_id); }
  if (relation_type) { sql += ' AND r.relation_type=?'; params.push(relation_type); }
  sql += ' ORDER BY r.created_at DESC';

  res.json({ data: db.prepare(sql).all(...params) });
});

// 创建关系
router.post('/', (req, res) => {
  const { source_id, target_id, relation_type, rel_kind = 'static', label, note, domain_id } = req.body;
  if (!source_id || !target_id || !relation_type) {
    return res.status(400).json({ error: '发起方、目标方和关系类型不能为空' });
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO relations (id, source_id, target_id, relation_type, rel_kind, label, note, domain_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, source_id, target_id, relation_type, rel_kind, label || null, note || null, domain_id || null);

  res.json({
    data: db.prepare(`
      SELECT r.*, cs.name as source_name, ct.name as target_name
      FROM relations r
      JOIN concepts cs ON r.source_id=cs.id
      JOIN concepts ct ON r.target_id=ct.id
      WHERE r.id=?
    `).get(id)
  });
});

// 更新关系
router.put('/:id', (req, res) => {
  const { relation_type, rel_kind, label, note } = req.body;
  db.prepare(`UPDATE relations SET relation_type=?, rel_kind=?, label=?, note=? WHERE id=?`)
    .run(relation_type, rel_kind, label || null, note || null, req.params.id);
  res.json({ success: true });
});

// 删除关系
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM relations WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// 获取图谱数据（用于可视化）
router.get('/graph', (req, res) => {
  const { domain_id, limit = 200 } = req.query;

  let conceptSql = 'SELECT id, name, element_type, system_role, is_universal FROM concepts WHERE 1=1';
  const cParams = [];
  if (domain_id) { conceptSql += ' AND domain_id=?'; cParams.push(domain_id); }
  conceptSql += ` LIMIT ${parseInt(limit)}`;
  const concepts = db.prepare(conceptSql).all(...cParams);

  const conceptIds = concepts.map(c => c.id);
  if (conceptIds.length === 0) return res.json({ nodes: [], edges: [] });

  const placeholders = conceptIds.map(() => '?').join(',');
  const relations = db.prepare(`
    SELECT r.id, r.source_id, r.target_id, r.relation_type, r.rel_kind,
           cs.name as source_name, ct.name as target_name
    FROM relations r
    JOIN concepts cs ON r.source_id=cs.id
    JOIN concepts ct ON r.target_id=ct.id
    WHERE r.source_id IN (${placeholders}) AND r.target_id IN (${placeholders})
  `).all(...conceptIds, ...conceptIds);

  res.json({ nodes: concepts, edges: relations });
});

module.exports = router;
