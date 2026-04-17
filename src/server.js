const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3737;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 路由
app.use('/api/domains', require('./routes/domains'));
app.use('/api/concepts', require('./routes/concepts'));
app.use('/api/relations', require('./routes/relations'));
app.use('/api/problems', require('./routes/problems'));
app.use('/api/modeling', require('./routes/modeling'));
app.use('/api', require('./routes/utils'));

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ 知识本体管理工具已启动`);
  console.log(`📖 访问地址: http://localhost:${PORT}`);
  console.log(`🗄️  数据库路径: data/ontology.db\n`);
});
