import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Set up image upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure the frontend can fetch images statically
app.use('/api/image', express.static(path.join(uploadDir)));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Image Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/api/image/${req.file.filename}` });
});

// Categories
app.get('/api/categories', (req, res) => {
  const results = db.prepare(`SELECT * FROM categories ORDER BY created_at DESC`).all();
  res.json(results);
});

app.post('/api/categories', (req, res) => {
  const b = req.body;
  db.prepare(`INSERT OR REPLACE INTO categories (id, name, image, created_at) VALUES (?, ?, ?, ?)`)
    .run(b.id, b.name, b.image ?? '', Date.now());
  res.json({ success: true });
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const b = req.body;
  db.prepare(`UPDATE categories SET name=?, image=? WHERE id=?`).run(b.name, b.image ?? '', id);
  res.json({ success: true });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  db.prepare(`DELETE FROM products WHERE category_id=?`).run(id);
  db.prepare(`DELETE FROM categories WHERE id=?`).run(id);
  res.json({ success: true });
});

// Products
app.get('/api/products', (req, res) => {
  const categoryId = req.query.categoryId as string | undefined;
  let results;
  if (categoryId) {
    results = db.prepare(`SELECT * FROM products WHERE category_id=? ORDER BY created_at DESC`).all(categoryId);
  } else {
    results = db.prepare(`SELECT * FROM products ORDER BY created_at DESC`).all();
  }
  res.json(results.map((p: any) => ({
    ...p,
    categoryId: p.category_id,
    wholesalePrice: p.wholesale_price,
    retailPrice: p.retail_price
  })));
});

app.post('/api/products', (req, res) => {
  const b = req.body;
  db.prepare(
    `INSERT OR REPLACE INTO products (id, category_id, name, wholesale_price, retail_price, quantity, barcode, image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(b.id, b.categoryId, b.name, b.wholesalePrice ?? null, b.retailPrice ?? null, b.quantity ?? 0, b.barcode ?? '', b.image ?? '', Date.now());
  res.json({ success: true });
});

app.get('/api/products/search', (req, res) => {
  const q = req.query.q || '';
  const results = db.prepare(
    `SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? LIMIT 10`
  ).all(`%${q}%`, `%${q}%`) as any[];
  res.json(results.map((p: any) => ({
    ...p,
    categoryId: p.category_id,
    wholesalePrice: p.wholesale_price,
    retailPrice: p.retail_price
  })));
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const b = req.body;
  db.prepare(
    `UPDATE products SET name=?, wholesale_price=?, retail_price=?, quantity=?, barcode=?, image=?, category_id=? WHERE id=?`
  ).run(
    b.name ?? null, 
    b.wholesalePrice ?? null, 
    b.retailPrice ?? null, 
    b.quantity ?? 0, 
    b.barcode ?? '', 
    b.image ?? '', 
    b.categoryId ?? null, 
    id
  );
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.prepare(`DELETE FROM products WHERE id=?`).run(id);
  res.json({ success: true });
});

// Loyal Customers
app.get('/api/loyal-customers', (req, res) => {
  const results = db.prepare(`SELECT * FROM loyal_customers ORDER BY created_at DESC`).all() as any[];
  res.json(results.map((c: any) => ({
    ...c,
    createdAt: c.created_at
  })));
});

app.post('/api/loyal-customers', (req, res) => {
  const b = req.body;
  db.prepare(
    `INSERT OR REPLACE INTO loyal_customers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(b.id, b.name, b.phone ?? '', b.address ?? '', Date.now());
  res.json({ success: true, id: b.id });
});

app.get('/api/loyal-customers/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare(`SELECT * FROM loyal_customers WHERE id = ?`).get(id);
  if (!result) return res.status(404).json({ error: 'Customer not found' });
  res.json({ ...result, createdAt: (result as any).created_at });
});

app.put('/api/loyal-customers/:id', (req, res) => {
  const { id } = req.params;
  const b = req.body;
  db.prepare(`UPDATE loyal_customers SET name=?, phone=?, address=? WHERE id=?`)
    .run(b.name, b.phone ?? '', b.address ?? '', id);
  res.json({ success: true });
});

app.delete('/api/loyal-customers/:id', (req, res) => {
  const { id } = req.params;
  db.prepare(`DELETE FROM loyal_customers WHERE id=?`).run(id);
  res.json({ success: true });
});

// Sales
app.get('/api/sales', (req, res) => {
  const q = req.query.q as string | undefined;
  const customerId = req.query.customerId as string | undefined;
  let results;
  if (customerId) {
    results = db.prepare(`SELECT * FROM sales WHERE customer_id=? ORDER BY date DESC`).all(customerId);
  } else if (q) {
    results = db.prepare(`SELECT * FROM sales WHERE product_name LIKE ? ORDER BY date DESC`).all(`%${q}%`);
  } else {
    results = db.prepare(`SELECT * FROM sales ORDER BY date DESC`).all();
  }
  res.json((results as any[]).map((s: any) => ({
    ...s,
    productId: s.product_id,
    productName: s.product_name,
    sellingPrice: s.selling_price,
    customerId: s.customer_id,
    paymentStatus: s.payment_status || 'unpaid',
    quantity: s.quantity || 1
  })));
});

app.post('/api/sales', (req, res) => {
  const b = req.body;
  try {
    db.prepare(
      `INSERT INTO sales (id, product_id, product_name, selling_price, date, customer_id, payment_status, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(b.id, b.productId || null, b.productName, b.sellingPrice, b.date, b.customerId || null, b.paymentStatus || 'unpaid', b.quantity || 1, Date.now());
  } catch (e) {
    db.prepare(
      `INSERT INTO sales (id, product_id, product_name, selling_price, date, customer_id, payment_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(b.id, b.productId || null, b.productName, b.sellingPrice, b.date, b.customerId || null, b.paymentStatus || 'unpaid', Date.now());
  }
  res.json({ success: true });
});

app.delete('/api/sales', (req, res) => {
  db.prepare(`DELETE FROM sales`).run();
  res.json({ success: true });
});

app.get('/api/sales/total', (req, res) => {
  const results = db.prepare(`SELECT SUM(selling_price) as total FROM sales WHERE payment_status = 'paid'`).all();
  res.json({ total: (results as any)[0]?.total || 0 });
});

app.get('/api/sales/profits', (req, res) => {
  try {
    const results = db.prepare(`
      SELECT s.selling_price as revenue, p.wholesale_price as cost, s.quantity as qty
      FROM sales s LEFT JOIN products p ON s.product_id = p.id
      WHERE s.payment_status = 'paid'
    `).all();
    let totalRevenue = 0;
    let totalCost = 0;
    for (const row of results as any[]) {
      const qty = row.qty || 1;
      totalRevenue += row.revenue || 0;
      if (row.cost) totalCost += row.cost * qty;
    }
    res.json({ totalRevenue, totalCost, profit: totalRevenue - totalCost });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sales/:id', (req, res) => {
  const { id } = req.params;
  const b = req.body;
  if (b.paymentStatus) {
    db.prepare(`UPDATE sales SET payment_status=? WHERE id=?`).run(b.paymentStatus, id);
    res.json({ success: true });
  } else {
    db.prepare(`DELETE FROM sales WHERE id=?`).run(id); 
    res.json({ success: true });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  const { id } = req.params;
  db.prepare(`DELETE FROM sales WHERE id=?`).run(id);
  res.json({ success: true });
});

// Gemini AI Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      // Send standard Express response formatting which doesn't allow return of res.status... direct call
      res.status(500).json({ response: '⚠️ لم يتم إعداد مفتاح Gemini API.' });
      return;
    }

    const { message } = req.body;
    
    const stopWords = ['كم', 'ما', 'هل', 'أين', 'متى', 'كيف', 'عدد', 'مخزون', 'سعر', 'منتج', 'بضاعة', 'أريد', 'أن', 'أعرف', 'اعطني', 'كل', 'من', 'في', 'على', 'هذا', 'هذه', 'التي', 'الذي', 'منخفضة', 'المنخفضة', 'صنف', 'أي'];
    
    const searchTerms = message.toLowerCase()
      .replace(/[؟?.,!]/g, '')
      .split(' ')
      .filter((w: string) => w.length > 2 && !stopWords.includes(w))
      .slice(0, 3);
    
    const categories = db.prepare(`SELECT * FROM categories ORDER BY created_at DESC`).all() as any[];
    const recentSales = db.prepare(`SELECT * FROM sales ORDER BY date DESC LIMIT 20`).all() as any[];
    const customers = db.prepare(`SELECT * FROM loyal_customers ORDER BY created_at DESC LIMIT 10`).all() as any[];
    const totalStats = db.prepare(`SELECT COUNT(*) as total, SUM(quantity) as total_qty FROM products`).get() as any;

    let relevantProducts: any[] = [];
    let lowStockProducts: any[] = [];
    
    if (searchTerms.length > 0) {
      const mainKeyword = searchTerms.reduce((a: string, b: string) => a.length > b.length ? a : b);
      const searchPattern = \`%\${mainKeyword}%\`;
      try {
        const searchResults = db.prepare(`
          SELECT p.*, c.name as category_name 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          WHERE p.name LIKE ? OR p.barcode LIKE ? 
          LIMIT 20
        `).all(searchPattern, searchPattern) as any[];
        relevantProducts = searchResults || [];
      } catch (searchError) {
        console.error('Search error:', searchError);
        relevantProducts = [];
      }
    }
    
    try {
      const lowStock = db.prepare(`
          SELECT p.*, c.name as category_name 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          WHERE p.quantity <= 5 
          ORDER BY p.quantity ASC 
          LIMIT 20
      `).all() as any[];
      const recentProducts = db.prepare(`
          SELECT p.*, c.name as category_name 
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          ORDER BY p.created_at DESC 
          LIMIT 15
      `).all() as any[];
      
      lowStockProducts = lowStock;
      const seen = new Set(relevantProducts.map((p: any) => p.id));
      relevantProducts = [...relevantProducts, ...recentProducts.filter((p: any) => !seen.has(p.id))].slice(0, 25);
    } catch (e) {
      console.error('Error fetching products:', e);
    }

    const lowStockByCategory: Record<string, any[]> = {};
    lowStockProducts.forEach((p: any) => {
      const catName = p.category_name || 'غير مصنف';
      if (!lowStockByCategory[catName]) lowStockByCategory[catName] = [];
      lowStockByCategory[catName].push(p);
    });

    const totalSales = recentSales.reduce((sum: number, s: any) => sum + (s.selling_price || 0), 0);
    const unpaidSales = recentSales.filter((s: any) => s.payment_status === 'unpaid');

    let context = \`
بيانات المتجر (التاريخ: \${new Date().toLocaleDateString('ar-DZ')}):

📊 إحصائيات عامة:
- إجمالي المنتجات: \${totalStats?.total || 0} منتج
- إجمالي الكمية في المخزون: \${totalStats?.total_qty || 0} قطعة

📂 الأصناف المتوفرة (\${categories.length}):
\${categories.map((c: any) => \`- \${c.name}\`).join('\\n')}
\`;

    if (lowStockProducts.length > 0) {
      context += \`

⚠️ المنتجات منخفضة المخزون (\${lowStockProducts.length} منتج) مُجمّعة حسب الصنف:
\`;
      Object.entries(lowStockByCategory).forEach(([catName, products]) => {
        context += \`
📁 صنف "\${catName}" (\${products.length} منتج):
\${products.map((p: any) => \`  • \${p.name}: \${p.quantity || 0} قطعة (سعر: \${p.retail_price || '-'} د.ج)\`).join('\\n')}
\`;
      });
    }

    if (relevantProducts.length > 0) {
      context += \`

📦 منتجات ذات صلة بالبحث (\${relevantProducts.length}):
\${relevantProducts.slice(0, 10).map((p: any) => 
\`- \${p.name} (صنف: \${p.category_name || 'غير مصنف'}): \${p.quantity || 0} قطعة (سعر الجملة: \${p.wholesale_price || '-'} د.ج، سعر التجزئة: \${p.retail_price || '-'} د.ج)\`
).join('\\n')}
\`;
    }

    let productDetails = null;
    if (relevantProducts.length > 0) {
      const exactMatch = relevantProducts.find((p: any) => 
        message.toLowerCase().includes(p.name.toLowerCase())
      ) || relevantProducts[0];
      
      if (exactMatch) {
        try {
          const salesHistory = db.prepare(
            \`SELECT * FROM sales WHERE product_id = ? ORDER BY date DESC LIMIT 3\`
          ).all(exactMatch.id) as any[];
          productDetails = { ...exactMatch, salesHistory: salesHistory || [] };
        } catch (e) { console.error(e); }
      }
    }

    if (productDetails) {
      context += \`

🔍 تفاصيل "\${productDetails.name}" (صنف: \${productDetails.category_name || 'غير مصنف'}):
- الكمية: \${productDetails.quantity || 0} قطعة
- سعر الجملة: \${productDetails.wholesale_price || 'غير محدد'} د.ج
- سعر التجزئة: \${productDetails.retail_price || 'غير محدد'} د.ج
\${productDetails.salesHistory.length > 0 ? \`- آخر بيع: \${productDetails.salesHistory[0].date} بـ\${productDetails.salesHistory[0].selling_price} د.ج\` : ''}
\`;
    }

    context += \`

💰 آخر المبيعات (\${recentSales.length} عملية - الإجمالي: \${totalSales.toLocaleString('ar-DZ')} د.ج):
\${recentSales.slice(0, 5).map((s: any) => \`- \${s.product_name}: \${s.selling_price?.toLocaleString('ar-DZ')} د.ج (\${s.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'})\`).join('\\n') || 'لا توجد'}

💳 غير مدفوعة (\${unpaidSales.length}):
\${unpaidSales.slice(0, 5).map((s: any) => \`- \${s.product_name}: \${s.selling_price?.toLocaleString('ar-DZ')} د.ج\`).join('\\n') || 'لا يوجد'}

👥 العملاء (\${customers.length}):
\${customers.slice(0, 5).map((c: any) => \`- \${c.name}\${c.phone ? \` (\${c.phone})\` : ''}\`).join('\\n') || 'لا يوجد'}
\`;

    const geminiRes = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${GEMINI_API_KEY}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ 
              text: \`أنت مساعد ذكي لمتجر إلكتروني. لديك وصول لبيانات المتجر في الوقت الفعلي.
أجب دائماً باللغة العربية الفصحى بشكل مختصر ومفيد.
عند سؤالك عن "المنتجات المنخفضة في صنف معين"، ابحث في بيانات المنتجات المنخفضة المُجمّعة حسب الصنف وقدم الإجابة الدقيقة.
استخدم أسماء الأصناف المذكورة في البيانات.
كن ودوداً ومهنياً.\` 
            }]
          },
          contents: [{ role: "user", parts: [{ text: \`\${context}\\n\\nسؤال المستخدم: \${message}\` }] }]
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorData = await geminiRes.json().catch(() => ({}));
      if (geminiRes.status === 429) {
        res.status(429).json({ response: '⚠️ تم تجاوز الحصة المجانية. يرجى الانتظار.' });
        return;
      }
      res.status(500).json({ response: \`⚠️ خطأ: \${errorData.error?.message || 'حدث خطأ'}\` });
      return;
    }

    const data = await geminiRes.json() as any;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من الرد.';
    res.json({ response: reply });
  } catch (error: any) {
    console.error('Worker AI Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(\`Server is running locally on http://localhost:\${PORT}\`);
});
