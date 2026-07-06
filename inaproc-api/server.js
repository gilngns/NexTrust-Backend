const express = require("express");
const { chromium } = require("playwright");

const PORT = process.env.PORT || 3000;
const GRAPHQL_URL = "https://katalog.inaproc.id/graphql";
const HOME_URL = "https://katalog.inaproc.id/";

const QUERY = `
query searchProducts($input: SearchProductInput!) {
  searchProducts(input: $input) {
    ... on ListSearchProductResponse {
      total currentPage lastPage perPage
      items {
        id name sellerName isSellerUMKK
        defaultPrice defaultPriceWithTax minPrice maxPrice
        unitSold stockAvailability slug
        tkdn { value status }
        rating { count average }
        category { name }
        location { name child { name child { name } } }
      }
    }
    ... on GenericError { __typename code message reqId }
  }
}`.trim();

function buildInput({ keyword, page, perPage, minHarga, maxHarga }) {
  return {
    sort: [{ field: "RELEVANCE", order: "DESC" }],
    filter: {
      strategy: "SRP",
      keyword,
      labels: [],
      sellerTypes: [],
      sellerRegionCodes: [""],
      minPrice: minHarga ?? null,
      maxPrice: maxHarga ?? null,
      rateTypes: [],
      productTypes: [],
      ratingAvgGte: null,
    },
    pagination: { page, perPage },
  };
}

function flattenLocation(loc) {
  const parts = [];
  let n = loc;
  while (n) {
    if (n.name) parts.push(n.name);
    n = n.child;
  }
  return parts.join(" > ");
}

function normalize(p) {
  return {
    id: p.id,
    nama: p.name,
    harga: p.defaultPrice ?? null,
    hargaDenganPajak: p.defaultPriceWithTax ?? null,
    hargaMin: p.minPrice ?? null,
    hargaMax: p.maxPrice ?? null,
    penyedia: p.sellerName ?? null,
    umkk: !!p.isSellerUMKK,
    kategori: p.category?.name ?? null,
    tkdn: p.tkdn?.value ?? null,
    terjual: p.unitSold ?? 0,
    stok: p.stockAvailability ?? null,
    rating: p.rating?.average ?? null,
    jmlRating: p.rating?.count ?? 0,
    lokasi: flattenLocation(p.location),
    slug: p.slug ?? null,
    url: p.slug ? `https://katalog.inaproc.id/produk/${p.slug}` : null,
  };
}

class InaprocBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
    this.ready = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      console.log("🚀 Menjalankan browser Playwright...");
      this.browser = await chromium.launch({ headless: true });
      const ctx = await this.browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      });
      this.page = await ctx.newPage();
      console.log("🌐 Melewati Cloudflare (buka halaman katalog)...");
      await this.page.goto(HOME_URL, { waitUntil: "networkidle" });
      await new Promise((r) => setTimeout(r, 3000));
      this.ready = true;
      console.log("✅ Browser siap. Cookie Cloudflare aktif.");
    })();
    return this.initPromise;
  }

  async refresh() {
    console.log("♻️  Refresh halaman untuk perbarui cookie CF...");
    await this.page.goto(HOME_URL, { waitUntil: "networkidle" });
    await new Promise((r) => setTimeout(r, 3000));
  }

  async search(params, { retried = false } = {}) {
    if (!this.ready) await this.init();

    const result = await this.page.evaluate(
      async ({ url, query, input }) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "*/*" },
            body: JSON.stringify({
              operationName: "searchProducts",
              query,
              variables: { input },
            }),
            credentials: "include",
          });
          if (!res.ok) return { __httpError: res.status };
          return await res.json();
        } catch (e) {
          return { __fetchError: String(e) };
        }
      },
      { url: GRAPHQL_URL, query: QUERY, input: buildInput(params) }
    );

    if ((result.__httpError || result.__fetchError) && !retried) {
      await this.refresh();
      return this.search(params, { retried: true });
    }

    if (result.__httpError)
      throw new Error(`HTTP ${result.__httpError} dari INAPROC (Cloudflare?)`);
    if (result.__fetchError) throw new Error(result.__fetchError);

    const r = result?.data?.searchProducts;
    if (!r)
      throw new Error(
        "Respons tak terduga: " + JSON.stringify(result).slice(0, 200)
      );
    if (r.__typename === "GenericError")
      throw new Error(`API error [${r.code}]: ${r.message}`);

    return {
      total: r.total,
      halaman: r.currentPage,
      totalHalaman: r.lastPage,
      perHalaman: r.perPage,
      items: (r.items || []).map(normalize),
    };
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

const inaproc = new InaprocBrowser();

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok", browserReady: inaproc.ready });
});

let queue = Promise.resolve();
app.use("/api/produk", (req, res, next) => {
  queue = queue.then(
    () =>
      new Promise((resolve) => {
        res.on("finish", resolve);
        res.on("close", resolve);
        next();
      })
  );
});

app.get("/api/produk", async (req, res) => {
  const keyword = (req.query.keyword || "").trim();

  const params = {
    keyword,
    page: Math.max(1, parseInt(req.query.page) || 1),
    perPage: Math.min(60, Math.max(1, parseInt(req.query.perPage) || 60)),
    minHarga: req.query.minHarga ? Number(req.query.minHarga) : null,
    maxHarga: req.query.maxHarga ? Number(req.query.maxHarga) : null,
  };

  try {
    const data = await inaproc.search(params);
    res.json({ keyword, ...data, sumber: "katalog.inaproc.id (live)" });
  } catch (e) {
    console.error("Error /api/produk:", e.message);
    res.status(502).json({ error: e.message });
  }
});

app.listen(PORT, async () => {
  console.log(`🟢 Server jalan di http://localhost:${PORT}`);
  console.log(`   Coba: http://localhost:${PORT}/api/produk?keyword=semen`);
  await inaproc.init();
});

process.on("SIGINT", async () => {
  console.log("\n🛑 Menutup browser...");
  await inaproc.close();
  process.exit(0);
});
