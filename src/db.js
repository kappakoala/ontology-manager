/**
 * 知识本体管理工具 - 数据库层
 * 按照"知识本体方法论说明v3.7"设计
 * 核心：两系统（主动系统/对象系统）× 五要素（主体、行为、客体、时间、空间）
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'ontology.db'));

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────
// 建表
// ─────────────────────────────────────────────
db.exec(`
  -- 领域（知识本体的业务范围）
  CREATE TABLE IF NOT EXISTS domains (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    description TEXT,
    type       TEXT DEFAULT 'domain',   -- domain | subdomain
    parent_id  TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- 概念（知识本体的核心单元）
  CREATE TABLE IF NOT EXISTS concepts (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    alias        TEXT,          -- 别名
    definition   TEXT,          -- 定义
    element_type TEXT NOT NULL, -- 五要素类型：subject|behavior|object|time|space | 扩展：problem|goal|indicator|domain
    system_role  TEXT,          -- 所属系统：active_system | object_system | universal
    domain_id    TEXT,
    is_universal INTEGER DEFAULT 0,   -- 是否属于通用知识本体
    note         TEXT,
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    updated_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (domain_id) REFERENCES domains(id)
  );

  -- 属性（概念的基础属性和领域属性）
  CREATE TABLE IF NOT EXISTS attributes (
    id           TEXT PRIMARY KEY,
    concept_id   TEXT NOT NULL,
    name         TEXT NOT NULL,
    value        TEXT,
    attr_type    TEXT DEFAULT 'domain',  -- base（基础属性）| domain（领域属性）
    data_type    TEXT DEFAULT 'string',  -- string|number|date|boolean
    note         TEXT,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
  );

  -- 关系（两个概念之间的联系）
  -- 方法论定义的17种关系类型
  CREATE TABLE IF NOT EXISTS relations (
    id            TEXT PRIMARY KEY,
    source_id     TEXT NOT NULL,    -- 发起方概念
    target_id     TEXT NOT NULL,    -- 目标方概念
    relation_type TEXT NOT NULL,    -- 分类|包含|实施|利用|在|确认|提出|制定|表现|解决|实现|依据|参考|输入|输出|集约|前置
    rel_kind      TEXT DEFAULT 'static',  -- static（静态）| dynamic（动态）
    label         TEXT,             -- 自定义标签
    note          TEXT,
    domain_id     TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (source_id) REFERENCES concepts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES concepts(id) ON DELETE CASCADE
  );

  -- 问题（三层：表象/根源/症结）
  CREATE TABLE IF NOT EXISTS problems (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    level        TEXT NOT NULL,  -- phenomenon（表象）| root（根源）| crux（症结）
    domain_id    TEXT,
    concept_id   TEXT,           -- 关联的概念
    parent_id    TEXT,           -- 问题层级关系
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (parent_id) REFERENCES problems(id)
  );

  -- 目标
  CREATE TABLE IF NOT EXISTS goals (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    problem_id   TEXT,           -- 解决的问题
    domain_id    TEXT,
    indicator    TEXT,           -- 指标（量化）
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (problem_id) REFERENCES problems(id),
    FOREIGN KEY (domain_id) REFERENCES domains(id)
  );

  -- 知识本体卡片（最终产出的知识条目）
  CREATE TABLE IF NOT EXISTS ontology_cards (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    content      TEXT,
    domain_id    TEXT,
    element_type TEXT,
    system_role  TEXT,
    tags         TEXT,           -- JSON 数组
    source       TEXT,
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    updated_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (domain_id) REFERENCES domains(id)
  );

  -- 本体卡片与概念的关联
  CREATE TABLE IF NOT EXISTS card_concepts (
    card_id    TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    role       TEXT,
    PRIMARY KEY (card_id, concept_id),
    FOREIGN KEY (card_id) REFERENCES ontology_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
  );
`);

// ─────────────────────────────────────────────
// 预置种子数据：通用知识本体五要素 + 方法论核心术语
// ─────────────────────────────────────────────
function seedData() {
  const existing = db.prepare('SELECT COUNT(*) as n FROM concepts').get();
  if (existing.n > 0) return;

  const universalDomainId = uuidv4();
  db.prepare(`INSERT INTO domains (id, name, description, type) VALUES (?, ?, ?, ?)`)
    .run(universalDomainId, '通用知识本体', '方法论定义的通用概念体系，适用于各领域', 'domain');

  const elements = [
    { name: '主体', element_type: 'subject', definition: '指对客体有认识和实践能力的人，是客体的存在意义的决定者。', system_role: 'universal' },
    { name: '行为', element_type: 'behavior', definition: '主体受思想（目标、问题）支配而表现出来的外表活动。', system_role: 'universal' },
    { name: '客体', element_type: 'object', definition: '是主体为了解决特定问题和达成特定目标，在一定时间、空间范围内利用的物质和非物质资源、手段、行为。', system_role: 'universal' },
    { name: '时间', element_type: 'time', definition: '是主体的运动、变化的持续性、顺序性的表现。时间形式包括：直线时间、时间段、时间点、零时间等。', system_role: 'universal' },
    { name: '空间', element_type: 'space', definition: '地理位置、地理区域等概念。', system_role: 'universal' },
    { name: '问题', element_type: 'problem', definition: '由对象系统主体发起的诉求与现状产生的差异。', system_role: 'object_system' },
    { name: '目标', element_type: 'goal', definition: '主动系统主体为了解决对象主体提出的问题而给自己设定解决问题的目标。', system_role: 'active_system' },
    { name: '指标', element_type: 'indicator', definition: '以数量值刻画问题、目标。', system_role: 'universal' },
  ];

  const insert = db.prepare(
    `INSERT INTO concepts (id, name, definition, element_type, system_role, domain_id, is_universal)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  );
  for (const el of elements) {
    insert.run(uuidv4(), el.name, el.definition, el.element_type, el.system_role, universalDomainId);
  }

  // 预置政务领域
  const govDomainId = uuidv4();
  db.prepare(`INSERT INTO domains (id, name, description, type) VALUES (?, ?, ?, ?)`)
    .run(govDomainId, '政务领域', '政务领域知识本体，包括政府行政机关、职能、业务等', 'domain');
}

seedData();

// ─────────────────────────────────────────────
// 导出 DB 实例 & 工具函数
// ─────────────────────────────────────────────
module.exports = { db, uuidv4 };
