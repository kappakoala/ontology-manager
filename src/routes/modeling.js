/**
 * 本体建模路由
 * 流程：文档上传 → MarkItDown 转 Markdown → Hermes Skill 抽取五要素 → 用户确认 → 写入数据库
 */
const express = require('express');
const router = express.Router();
const { db, uuidv4 } = require('../db');
const path = require('path');
const fs = require('fs');
const { execFile, execFileSync } = require('child_process');

// 上传文件临时目录
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 内存 session：fileId -> { markdown, extractedConcepts }
const sessions = new Map();

// ──────────────────────────────────────
// multer 文件上传（不依赖 npm 安装 multer，手动解析二进制流）
// 用 busboy 替代，若未安装则退化到 base64 JSON 上传模式
// ──────────────────────────────────────
let Busboy;
try {
  Busboy = require('busboy');
} catch (e) {
  Busboy = null;
}

/**
 * POST /api/modeling/upload
 * Content-Type: multipart/form-data  或  application/json { filename, base64 }
 * 返回 { fileId, filename, markdown, charCount }
 */
router.post('/upload', async (req, res) => {
  const contentType = req.headers['content-type'] || '';

  // ── 方式 A：JSON base64（用于浏览器 FileReader）──
  if (contentType.includes('application/json')) {
    const { filename = 'doc.txt', base64, text } = req.body;
    const fileId = uuidv4();
    let markdown;

    if (text) {
      // 纯文本直接作为 markdown
      markdown = text;
    } else if (base64) {
      const buf = Buffer.from(base64, 'base64');
      const ext = path.extname(filename).toLowerCase();
      const tmpPath = path.join(UPLOAD_DIR, fileId + ext);
      fs.writeFileSync(tmpPath, buf);
      markdown = await convertToMarkdown(tmpPath, fileId);
    } else {
      return res.status(400).json({ error: '缺少 base64 或 text 字段' });
    }

    sessions.set(fileId, { markdown, concepts: null });
    return res.json({ fileId, filename, markdown, charCount: markdown.length });
  }

  // ── 方式 B：multipart（Busboy）──
  if (!Busboy) {
    return res.status(400).json({ error: '请使用 JSON base64 上传方式（busboy 未安装）' });
  }

  const fileId = uuidv4();
  let savedPath = null;
  let origName = 'file';

  const bb = Busboy({ headers: req.headers });
  bb.on('file', (fieldname, fileStream, info) => {
    origName = info.filename || 'file';
    const ext = path.extname(origName).toLowerCase();
    savedPath = path.join(UPLOAD_DIR, fileId + ext);
    fileStream.pipe(fs.createWriteStream(savedPath));
  });

  bb.on('close', async () => {
    if (!savedPath) return res.status(400).json({ error: '未收到文件' });
    try {
      const markdown = await convertToMarkdown(savedPath, fileId);
      sessions.set(fileId, { markdown, concepts: null });
      res.json({ fileId, filename: origName, markdown, charCount: markdown.length });
    } catch (e) {
      res.status(500).json({ error: '文档转换失败: ' + e.message });
    }
  });

  req.pipe(bb);
});

/**
 * GET /api/modeling/preview/:fileId
 * 返回 markdown 内容
 */
router.get('/preview/:fileId', (req, res) => {
  const session = sessions.get(req.params.fileId);
  if (!session) return res.status(404).json({ error: 'Session 不存在' });
  res.json({ markdown: session.markdown });
});

/**
 * POST /api/modeling/extract
 * Body: { fileId, markdown?(覆盖), domain? }
 * 返回 { concepts: CandidateConcept[] }
 */
router.post('/extract', async (req, res) => {
  const { fileId, markdown: mdOverride, domain = '' } = req.body;
  const session = sessions.get(fileId);
  if (!session) return res.status(404).json({ error: 'Session 不存在，请先上传文档' });

  const markdown = mdOverride || session.markdown;

  try {
    const concepts = await runSkillExtract(markdown, domain);
    session.concepts = concepts;
    sessions.set(fileId, session);
    res.json({ concepts });
  } catch (e) {
    res.status(500).json({ error: '抽取失败: ' + e.message });
  }
});

/**
 * POST /api/modeling/save
 * Body: { fileId, domainId, domainName?, concepts[], relations[] }
 * 写入数据库，返回导入计数
 */
router.post('/save', (req, res) => {
  const { domainId, domainName, concepts = [], relations = [] } = req.body;
  if (!concepts.length) return res.status(400).json({ error: '没有需要保存的概念' });

  // 临时 ID -> 真实 DB ID 的映射
  const idMap = {};

  const doSave = db.transaction(() => {
    let targetDomainId = domainId;

    // 如果需要新建领域
    if (!targetDomainId && domainName) {
      targetDomainId = uuidv4();
      db.prepare('INSERT INTO domains (id, name, description, type) VALUES (?,?,?,?)')
        .run(targetDomainId, domainName, '由本体建模功能自动创建', 'domain');
    }

    let savedConcepts = 0;
    for (const c of concepts) {
      if (!c.confirmed) continue;
      const newId = uuidv4();
      idMap[c.id] = newId;
      db.prepare(`
        INSERT INTO concepts (id, name, alias, definition, element_type, system_role, domain_id, is_universal, note)
        VALUES (?,?,?,?,?,?,?,0,?)
      `).run(newId, c.name, c.alias || null, c.definition || c.source_text || null,
             c.element_type, c.system_role || 'universal', targetDomainId || null, c.note || null);
      savedConcepts++;
    }

    let savedRelations = 0;
    for (const r of relations) {
      const srcId = idMap[r.source_id];
      const tgtId = idMap[r.target_id];
      if (!srcId || !tgtId) continue;
      db.prepare(`
        INSERT INTO relations (id, source_id, target_id, relation_type, rel_kind, label, note, domain_id)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(uuidv4(), srcId, tgtId, r.relation_type, 'static', r.label || null, r.note || null, targetDomainId || null);
      savedRelations++;
    }

    return { concepts: savedConcepts, relations: savedRelations, domainId: targetDomainId };
  });

  try {
    const result = doSave();
    res.json({ success: true, saved: result });
  } catch (e) {
    res.status(500).json({ error: '保存失败: ' + e.message });
  }
});

/**
 * GET /api/modeling/relation-types
 */
router.get('/relation-types', (req, res) => {
  const RELATION_TYPES = [
    { type: '分类', desc: '元素被拆分成多个同类元素而形成的关系' },
    { type: '包含', desc: '本体元素应用到业务中与领域建立的关系' },
    { type: '实施', desc: '主体为改变某个对象状态与行为建立的关系' },
    { type: '利用', desc: '主体实施行为时与客体发生的关系' },
    { type: '在',   desc: '行为与时间/空间产生的关系' },
    { type: '确认', desc: '确定当前两系统所处领域' },
    { type: '提出', desc: '对象主体提出问题与问题建立的关系' },
    { type: '制定', desc: '主体为解决问题而制定目标' },
    { type: '表现', desc: '用数量值刻画问题、目标' },
    { type: '解决', desc: '目标与问题建立的关系' },
    { type: '实现', desc: '主体实施行为与对象状态变化的关系' },
    { type: '依据', desc: '实施行为所依据的客体' },
    { type: '参考', desc: '实施行为所参考的客体' },
    { type: '输入', desc: '实施行为所输入的客体' },
    { type: '输出', desc: '实施行为所输出的客体' },
    { type: '集约', desc: '职能到功能的映射关系' },
    { type: '前置', desc: '行为之间的先后顺序关系' },
  ];
  res.json({ data: RELATION_TYPES });
});

// ──────────────────────────────────────
// 工具函数
// ──────────────────────────────────────

/**
 * 将文件转换为 Markdown
 * 优先使用 markitdown（Python CLI），不可用时退化为纯文本读取
 */
async function convertToMarkdown(filePath, fileId) {
  return new Promise((resolve, reject) => {
    // 尝试 markitdown
    execFile('markitdown', [filePath], { timeout: 30000 }, (err, stdout, stderr) => {
      if (!err && stdout.trim()) {
        return resolve(stdout.trim());
      }
      // 退化：尝试直接读取为文本
      try {
        const ext = path.extname(filePath).toLowerCase();
        if (['.txt', '.md', '.text'].includes(ext)) {
          return resolve(fs.readFileSync(filePath, 'utf-8'));
        }
        // 对于 docx/pdf，返回提示信息让用户粘贴文本
        resolve(`[文档已上传，路径: ${filePath}]\n\n请在下方文本框中粘贴文档内容，或安装 markitdown 自动转换：\npip install markitdown\n\n---\n`);
      } catch (readErr) {
        reject(readErr);
      }
    });
  });
}

/**
 * 调用 Hermes knowledge-ontology-modeling skill 进行五要素抽取
 * Skill 路径：~/.hermes/skills/knowledge/knowledge-ontology-modeling/
 * 若 Skill 不可用，使用规则基线提取
 */
async function runSkillExtract(markdown, domain) {
  const skillDir = path.join(process.env.HOME, '.hermes/skills/knowledge/knowledge-ontology-modeling');
  const skillExists = fs.existsSync(skillDir);

  if (skillExists) {
    return await callHermesSkill(skillDir, markdown, domain);
  }

  // 回退：基于关键词规则的轻量提取
  return ruleBasedExtract(markdown, domain);
}

/**
 * 调用 Hermes Skill（写临时输入文件，执行 skill，读取输出）
 */
async function callHermesSkill(skillDir, markdown, domain) {
  const tmpInput = path.join(UPLOAD_DIR, `skill_input_${Date.now()}.json`);
  const tmpOutput = path.join(UPLOAD_DIR, `skill_output_${Date.now()}.json`);

  const input = {
    action: 'extract',
    content: markdown,
    domain: domain,
    scope: 'concepts',
    output_format: 'json'
  };

  fs.writeFileSync(tmpInput, JSON.stringify(input, null, 2));

  return new Promise((resolve, reject) => {
    // 尝试执行 skill 的主脚本
    const scriptCandidates = [
      path.join(skillDir, 'run.js'),
      path.join(skillDir, 'index.js'),
      path.join(skillDir, 'extract.py'),
    ];

    const script = scriptCandidates.find(s => fs.existsSync(s));
    if (!script) {
      // Skill 目录存在但无可执行脚本，回退规则提取
      resolve(ruleBasedExtract(markdown, domain));
      return;
    }

    const cmd = script.endsWith('.py') ? 'python3' : 'node';
    execFile(cmd, [script, '--input', tmpInput, '--output', tmpOutput], { timeout: 60000 }, (err) => {
      // 清理临时文件
      try { fs.unlinkSync(tmpInput); } catch (_) {}

      if (err) {
        try { fs.unlinkSync(tmpOutput); } catch (_) {}
        resolve(ruleBasedExtract(markdown, domain)); // 失败时回退
        return;
      }

      try {
        const output = JSON.parse(fs.readFileSync(tmpOutput, 'utf-8'));
        fs.unlinkSync(tmpOutput);
        // 标准化输出格式
        const concepts = (output.concepts || output.data || output).map(c => ({
          id: 'tmp_' + uuidv4(),
          name: c.name || c.label || '',
          suggested_type: c.element_type || c.type || 'object',
          element_type: c.element_type || c.type || 'object',
          definition: c.definition || c.desc || '',
          source_text: c.source_text || c.context || '',
          confidence: typeof c.confidence === 'number' ? c.confidence : 0.7,
          confirmed: true,
          system_role: c.system_role || 'universal',
          note: c.note || '',
        }));
        resolve(concepts);
      } catch (parseErr) {
        try { fs.unlinkSync(tmpOutput); } catch (_) {}
        resolve(ruleBasedExtract(markdown, domain));
      }
    });
  });
}

/**
 * 规则基线提取（Skill 不可用时的 fallback）
 * 简单地按段落/行识别名词短语，并按关键词推断要素类型
 */
function ruleBasedExtract(markdown, domain) {
  const concepts = [];
  const lines = markdown.split('\n').filter(l => l.trim());

  // 要素关键词映射（启发式）
  const typeHints = {
    subject:  ['主体','机构','部门','人员','组织','企业','政府','单位','负责','职责','委员','局','处','科','所','协会','公司','法人'],
    behavior: ['行为','活动','审批','办理','申请','登记','备案','核查','处理','执行','操作','管理','监督','实施','开展','进行','处置','审核'],
    object:   ['客体','材料','文件','证件','数据','资料','信息','报告','申请表','许可证','营业执照','证明','档案','记录','资产','设备','资源'],
    time:     ['时间','期限','时效','工作日','日期','截止','期间','时段','年度','季度','月','周','天','小时','实时'],
    space:    ['空间','地点','区域','地区','省','市','县','乡','镇','村','街道','办公','场所','现场','地址','位置','范围'],
  };

  const seen = new Set();

  for (const line of lines) {
    // 跳过标题行和过短行
    if (line.startsWith('#')) continue;
    const text = line.replace(/[#*_`\[\]()]/g, '').trim();
    if (text.length < 2 || text.length > 50) continue;

    // 识别名词短语（2-10个汉字，不包含动词助词）
    const nouns = text.match(/[\u4e00-\u9fa5]{2,10}/g) || [];

    for (const noun of nouns) {
      if (seen.has(noun)) continue;
      seen.add(noun);

      // 推断要素类型
      let elementType = 'object'; // 默认客体
      let maxScore = 0;
      for (const [type, keywords] of Object.entries(typeHints)) {
        const score = keywords.filter(k => noun.includes(k) || k.includes(noun)).length;
        if (score > maxScore) { maxScore = score; elementType = type; }
      }

      concepts.push({
        id: 'tmp_' + uuidv4(),
        name: noun,
        suggested_type: elementType,
        element_type: elementType,
        definition: '',
        source_text: text.slice(0, 100),
        confidence: maxScore > 0 ? 0.7 : 0.4,
        confirmed: maxScore > 0, // 高置信度的默认选中
        system_role: 'universal',
        note: '',
      });

      if (concepts.length >= 80) break;
    }
    if (concepts.length >= 80) break;
  }

  return concepts;
}

module.exports = router;
