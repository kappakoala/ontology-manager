/**
 * 异步任务管理路由
 * 支持大文档处理、要素提取等耗时操作的异步任务管理
 */
const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');

// ──────────────────────────────────────
// 固定路径路由（必须在 /:id 之前注册）
// ──────────────────────────────────────

// GET /api/tasks/stats/summary - 任务统计概览
router.get('/stats/summary', (req, res) => {
  const byStatus = db.prepare(
    'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
  ).all();

  const summary = {};
  for (const row of byStatus) {
    summary[row.status] = row.count;
  }

  res.json({ data: summary });
});

// ──────────────────────────────────────
// GET /api/tasks - 获取任务列表
// ──────────────────────────────────────
router.get('/', (req, res) => {
  const { status, type, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status=?'; params.push(status); }
  if (type) { sql += ' AND type=?'; params.push(type); }

  sql += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const tasks = db.prepare(sql).all(...params);

  // 附加最新日志
  for (const task of tasks) {
    const recentLogs = db.prepare(
      'SELECT level, message, created_at FROM task_logs WHERE task_id=? ORDER BY created_at DESC LIMIT 5'
    ).all(task.id);
    task.recent_logs = recentLogs;
    // 解析 JSON 字段
    try { task.input = JSON.parse(task.input || '{}'); } catch (_) {}
    try { task.output = JSON.parse(task.output || 'null'); } catch (_) {}
  }

  const total = db.prepare('SELECT COUNT(*) as n FROM tasks' + (status ? ' WHERE status=?' : '')).get(...(status ? [status] : []));

  res.json({ data: tasks, total: total.n });
});

// ──────────────────────────────────────
// GET /api/tasks/:id - 获取任务详情
// ──────────────────────────────────────
router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  // 解析 JSON 字段
  try { task.input = JSON.parse(task.input || '{}'); } catch (_) {}
  try { task.output = JSON.parse(task.output || 'null'); } catch (_) {}

  // 获取全部日志
  task.logs = db.prepare(
    'SELECT level, message, created_at FROM task_logs WHERE task_id=? ORDER BY created_at ASC'
  ).all(task.id);

  res.json({ data: task });
});

// ──────────────────────────────────────
// POST /api/tasks - 创建异步任务
// ──────────────────────────────────────
router.post('/', (req, res) => {
  const { type, input, priority = 'medium', file_id, domain_id } = req.body;
  if (!type) return res.status(400).json({ error: '任务类型不能为空' });

  const validTypes = ['document-parse', 'element-extract', 'relation-build', 'batch-process'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `不支持的类型: ${type}，支持: ${validTypes.join(', ')}` });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tasks (id, type, status, progress, priority, input, file_id, domain_id)
    VALUES (?, ?, 'pending', 0, ?, ?, ?, ?)
  `).run(id, type, priority, JSON.stringify(input || {}), file_id || null, domain_id || null);

  // 添加初始日志
  db.prepare('INSERT INTO task_logs (id, task_id, level, message) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), id, 'info', `任务已创建，类型: ${type}，优先级: ${priority}`);

  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  try { task.input = JSON.parse(task.input || '{}'); } catch (_) {}

  res.json({ data: task });
});

// ──────────────────────────────────────
// PUT /api/tasks/:id - 更新任务状态
// ──────────────────────────────────────
router.put('/:id', (req, res) => {
  const { status, progress, output, error } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status=?');
    params.push(status);

    // 状态变更时更新时间戳
    if (status === 'processing') {
      updates.push('started_at=datetime(\'now\',\'localtime\')');
      db.prepare('INSERT INTO task_logs (id, task_id, level, message) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), req.params.id, 'info', '任务开始处理');
    }
    if (status === 'completed') {
      updates.push('completed_at=datetime(\'now\',\'localtime\')');
      db.prepare('INSERT INTO task_logs (id, task_id, level, message) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), req.params.id, 'info', '任务处理完成');
    }
    if (status === 'failed') {
      updates.push('completed_at=datetime(\'now\',\'localtime\')');
      db.prepare('INSERT INTO task_logs (id, task_id, level, message) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), req.params.id, 'error', `任务失败: ${error || '未知错误'}`);
    }
  }

  if (progress !== undefined) {
    updates.push('progress=?');
    params.push(Math.min(100, Math.max(0, progress)));
  }

  if (output !== undefined) {
    updates.push('output=?');
    params.push(JSON.stringify(output));
  }

  if (error !== undefined) {
    updates.push('error=?');
    params.push(error);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有需要更新的字段' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id=?`).run(...params);

  const updated = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  try { updated.input = JSON.parse(updated.input || '{}'); } catch (_) {}
  try { updated.output = JSON.parse(updated.output || 'null'); } catch (_) {}

  res.json({ data: updated });
});

// ──────────────────────────────────────
// DELETE /api/tasks/:id - 取消/删除任务
// ──────────────────────────────────────
router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  // 只能取消未完成的任务
  if (['pending', 'queued', 'processing'].includes(task.status)) {
    db.prepare('UPDATE tasks SET status=?, completed_at=datetime(\'now\',\'localtime\') WHERE id=?')
      .run('cancelled', req.params.id);
    db.prepare('INSERT INTO task_logs (id, task_id, level, message) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), req.params.id, 'warn', '任务已被取消');
  } else {
    // 已完成/失败的任务直接删除
    db.prepare('DELETE FROM task_logs WHERE task_id=?').run(req.params.id);
    db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  }

  res.json({ success: true });
});

// ──────────────────────────────────────
// GET /api/tasks/:id/logs - 获取任务日志
// ──────────────────────────────────────
router.get('/:id/logs', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const task = db.prepare('SELECT id FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  const logs = db.prepare(
    'SELECT level, message, created_at FROM task_logs WHERE task_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(req.params.id, Number(limit), Number(offset));

  res.json({ data: logs });
});

// ──────────────────────────────────────
// POST /api/tasks/:id/logs - 添加任务日志
// ──────────────────────────────────────
router.post('/:id/logs', (req, res) => {
  const { level = 'info', message } = req.body;
  if (!message) return res.status(400).json({ error: '日志消息不能为空' });

  const task = db.prepare('SELECT id FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  db.prepare('INSERT INTO task_logs (id, task_id, level, message) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), req.params.id, level, message);

  res.json({ success: true });
});

module.exports = router;
