const express = require('express');
const cors = require('cors');
const axios = require('axios');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.static('public'));

// Configuration Deepseek
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY manquant dans .env');
    process.exit(1);
}

// URLs des catégories Scoop
const SCOOP_CATEGORIES = {
    laptop: 'https://www.scoop.com.tn/46-pc-portables',
    gaming: 'https://www.scoop.com.tn/192-pc-portable-gamer',
    professionnel: 'https://www.scoop.com.tn/194-pc-portable-professionnel',
    business: 'https://www.scoop.com.tn/194-pc-portable-professionnel',
    macbook: 'https://www.scoop.com.tn/2143-macbook',
    ultrabook: 'https://www.scoop.com.tn/193-pc-ultrabook',
    accessoires: 'https://www.scoop.com.tn/293-peripheriques-et-accessoires'
};

// Classe Deepseek AI simplifiée
class DeepseekAI {
    constructor() {
        this.conversations = new Map();
        console.log('Deepseek AI initialisé');
    }

    async callDeepseek(messages, options = {}) {
        const payload = {
            model: "deepseek/deepseek-r1-0528:free",
            messages: messages,
        };

        try {
            const response = await axios.post(DEEPSEEK_API_URL, payload, {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Erreur Deepseek:', error.response?.data || error.message);
            throw new Error('Erreur de communication avec Deepseek');
        }
    }

    getSystemPrompt() {
        return `Tu es un expert en informatique chez Scoop.com.tn.

RÔLE:
- Aide les clients à choisir PC, laptops, accessoires
- Recommande des produits variés selon les besoins
- Pose des questions pertinentes: budget, usage, préférences

EXPERTISE:
- Marques: ASUS, HP, Lenovo, MSI, Dell, Apple, Acer
- Catégories: Gaming, Professionnel, Ultrabook, MacBook, Accessoires
- Usages: Gaming, Bureautique, Étudiant, Professionnel

STYLE:
- Réponds en français professionnel
- Sois concis mais informatif
- Recommande 3-4 produits avec justifications
- Propose des alternatives selon le budget

IMPORTANT:
- Recommande SEULEMENT les produits de la liste fournie
- Varie tes recommandations
- N'invente jamais de prix ou spécifications
- Pour SAV/rachat/ta9sit: renvoie au 70 247 841`;
    }

    async needsProductSearch(message) {
        const searchKeywords = [
            'pc', 'laptop', 'ordinateur', 'macbook', 'gaming', 'gamer',
            'cherche', 'veux', 'besoin', 'acheter', 'recommande',
            'asus', 'hp', 'lenovo', 'msi', 'dell', 'apple',
            'budget', 'prix', 'dt', 'tnd', 'étudiant', 'professionnel'
        ];
        
        const messageText = message.toLowerCase();
        return searchKeywords.some(keyword => messageText.includes(keyword));
    }

    async extractCriteria(message) {
        const messages = [
            {
                role: "system",
                content: `Tu es un expert en extraction de critères pour produits informatiques.

Analyse et extrait:
1. Budget: montant en TND mentionné ou implicite
2. Catégorie: type de produit recherché
3. Marque: marque spécifique mentionnée
4. Usage: utilisation prévue
5. Mots-clés: termes importants pour la recherche

Catégories possibles:
- portable/laptop: PC portables classiques
- gaming: PC gaming, gamer
- professionnel/business: usage professionnel
- ultrabook: laptops fins et légers
- macbook: produits Apple
- accessoires: périphériques, câbles, etc.
- etudiant: pour étudiants, budget limité

Marques possibles: asus, hp, lenovo, msi, apple

Réponds au format JSON exact:
{
  "budget": nombre_ou_null,
  "category": "catégorie_ou_null",
  "brand": "marque_ou_null",
  "usage": "usage_ou_null",
  "keywords": ["mot1", "mot2"]
}

EXEMPLES:
"PC gaming ASUS 3000 TND" → {"budget": 3000, "category": "gaming", "brand": "asus", "usage": "gaming", "keywords": ["pc", "gaming"]}
"laptop pour étudiant pas cher" → {"budget": null, "category": "etudiant", "brand": null, "usage": "etudiant", "keywords": ["laptop", "etudiant", "pas", "cher"]}
"MacBook Pro pour développement" → {"budget": null, "category": "macbook", "brand": "apple", "usage": "developpement", "keywords": ["macbook", "pro", "developpement"]}`
            },
            {
                role: "user",
                content: `Message à analyser: "${message}"`
            }
        ];

        try {
            const response = await this.callDeepseek(messages);
            console.log('Réponse complète Deepseek:');
            console.log('---START---');
            console.log(response);
            console.log('---END---');
            
            // Essayer plusieurs patterns pour extraire le JSON
            let jsonMatch = response.match(/\{[\s\S]*?\}/);
            
            if (!jsonMatch) {
                // Essayer de trouver le JSON différemment
                jsonMatch = response.match(/\{[^}]*\}/);
            }
            
            if (!jsonMatch) {
                // Chercher après une ligne qui contient "category"
                const lines = response.split('\n');
                for (const line of lines) {
                    if (line.includes('{') && line.includes('}')) {
                        jsonMatch = [line.trim()];
                        break;
                    }
                }
            }
            
            if (jsonMatch) {
                console.log('JSON trouvé:', jsonMatch[0]);
                try {
                    const criteria = JSON.parse(jsonMatch[0]);
                    console.log('Critères extraits avec succès:', criteria);
                    return criteria;
                } catch (parseError) {
                    console.error('❌ Erreur parsing JSON:', parseError.message);
                    console.error('❌ JSON problématique:', jsonMatch[0]);
                }
            } else {
                console.error('❌ Aucun JSON trouvé dans la réponse Deepseek');
            }
        } catch (error) {
            console.error('❌ Erreur extraction critères Deepseek:', error.message);
        }

        console.log('❌ Retour de critères vides');
        return { category: null, budget: null, brand: null, keywords: [] };
    }

    async handleConversation(message, conversationId, products = []) {
        const conversation = this.conversations.get(conversationId) || [];
        
        const messages = [
            { role: "system", content: this.getSystemPrompt() }
        ];

        // Ajouter les produits disponibles
        if (products.length > 0) {
            const productList = products.map((p, i) => 
                `${i + 1}. ${p.name} | ${p.price} TND | ${p.brand} | ${p.url}`
            ).join('\n');

            messages.push({
                role: "system",
                content: `PRODUITS DISPONIBLES:\n${productList}\n\nRecommande 3-4 produits variés selon les besoins.`
            });
        }

        // Ajouter l'historique
        conversation.forEach(msg => {
            messages.push({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content
            });
        });

        messages.push({ role: "user", content: message });

        const response = await this.callDeepseek(messages);

        // Mettre à jour l'historique
        this.updateConversation(conversationId, message, response);

        return response;
    }

    updateConversation(conversationId, userMessage, aiResponse) {
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, []);
        }
        
        const conversation = this.conversations.get(conversationId);
        conversation.push(
            { role: "user", content: userMessage, timestamp: Date.now() },
            { role: "assistant", content: aiResponse, timestamp: Date.now() }
        );
        
        // Garder les 10 derniers échanges
        if (conversation.length > 20) {
            conversation.splice(0, 4);
        }
    }
}

// Classe Scraper Scoop avec Puppeteer
class ScoopScraper {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        console.log('🕷️ Scraper Scoop initialisé avec Puppeteer');
    }

    async scrapeProducts(criteria) {
        console.log('🔍 Recherche produits avec critères:', criteria);
        
        // Déterminer l'URL selon la catégorie
        let targetUrl = SCOOP_CATEGORIES.laptop; // URL par défaut
        
        if (criteria.category) {
            const category = criteria.category.toLowerCase();
            if (SCOOP_CATEGORIES[category]) {
                targetUrl = SCOOP_CATEGORIES[category];
            }
        }

        console.log('URL cible:', targetUrl);

        // Vérifier le cache
        const cacheKey = `${targetUrl}_${JSON.stringify(criteria)}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log('Utilisation du cache');
                return cached.products;
            }
        }

        // Scrapper avec Puppeteer
        const products = await this.scrapeWithPuppeteer(targetUrl);
        
        // Filtrer selon les critères
        const filteredProducts = this.filterProducts(products, criteria);

        // Mettre en cache
        this.cache.set(cacheKey, {
            products: filteredProducts,
            timestamp: Date.now()
        });

        console.log(`✅ ${filteredProducts.length} produits trouvés`);
        return filteredProducts.slice(0, 10);
    }

    async scrapeWithPuppeteer(url) {
        let browser;
        
        try {
            console.log('🎭 Lancement du navigateur...');
            
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security'
                ]
            });

            const page = await browser.newPage();
            
            // Configuration de la page
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            await page.setViewport({ width: 1366, height: 768 });

            console.log('🌐 Navigation vers:', url);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 300000 });

            // Attendre que div.products apparaisse
            console.log('⏳ Attente de div.products...');
            await page.waitForSelector('div.products', { timeout: 150000 });

            // Scroller pour charger tous les produits
            console.log('📜 Scroll progressif pour charger tous les produits...');
            await this.autoScroll(page);

            // Extraire les produits
            console.log('📦 Extraction des produits...');
            const products = await page.evaluate(() => {
                const productsDiv = document.querySelector('div.products');
                if (!productsDiv) return [];

                const articles = productsDiv.querySelectorAll('article');
                console.log(`Trouvé ${articles.length} articles`);

                const extractedProducts = [];

                articles.forEach((article, index) => {
                    try {
                        // Nom et lien depuis div.product-title
                        const productTitleDiv = article.querySelector('div.product-title');
                        if (!productTitleDiv) return;

                        const nameElement = productTitleDiv.querySelector('h6');
                        const linkElement = productTitleDiv.querySelector('a');
                        
                        if (!nameElement || !linkElement) return;

                        const name = nameElement.textContent.trim();
                        const href = linkElement.getAttribute('href');

                        // Prix depuis span.price
                        const priceElement = article.querySelector('span.price');
                        let price = 0;
                        
                        if (priceElement) {
                            const priceText = priceElement.textContent.trim();
                            const priceMatch = priceText.match(/(\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d{3})*)/);
                            if (priceMatch) {
                                price = parseInt(priceMatch[1].replace(/[,\s]/g, ''));
                                // S'assurer que c'est un nombre valide
                                if (isNaN(price) || price <= 0) {
                                    price = 0;
                                }
                            }
                        }

                        // URL complète
                        const fullUrl = href.startsWith('http') ? href : `https://www.scoop.com.tn${href}`;

                        // Extraction de la marque
                        const brand = name.match(/(ASUS|HP|Lenovo|MSI|Dell|Apple|Acer|MacBook)/i)?.[0] || 'Autre';

                        if (name && name.length > 5 && fullUrl) {
                            extractedProducts.push({
                                id: Date.now() + index,
                                name: name.substring(0, 150),
                                price: price,
                                brand: brand,
                                url: fullUrl,
                                source: 'scoop.com.tn'
                            });
                        }
                    } catch (error) {
                        console.error('Erreur extraction article:', error);
                    }
                });

                return extractedProducts;
            });

            console.log(`${products.length} produits extraits`);
            return products;

        } catch (error) {
            console.error('Erreur Puppeteer:', error.message);
            return [];
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async autoScroll(page) {
        console.log('Début du scroll...');
        
        let previousProductCount = 0;
        let currentProductCount = 0;
        let noChangeCount = 0;
        const maxNoChangeAttempts = 3; // Arrêter après 3 tentatives sans nouveaux produits
        
        do {
            // Compter les produits actuels
            previousProductCount = currentProductCount;
            currentProductCount = await page.evaluate(() => {
                const articles = document.querySelectorAll('div.products article');
                return articles.length;
            });
            
            console.log(`Produits actuellement visibles: ${currentProductCount}`);
            
            // Vérifier si de nouveaux produits ont été chargés
            if (currentProductCount > previousProductCount) {
                console.log(`${currentProductCount - previousProductCount} nouveaux produits chargés`);
                noChangeCount = 0; // Reset le compteur
            } else {
                noChangeCount++;
                console.log(`⏳ Aucun nouveau produit (tentative ${noChangeCount}/${maxNoChangeAttempts})`);
            }
            
            // Scroller vers le bas progressivement
            await page.evaluate(() => {
                window.scrollBy(0, 1000); // Scroll plus important
            });
            
            // Attendre que le contenu se charge
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Scroller encore un peu plus pour être sûr
            await page.evaluate(() => {
                window.scrollBy(0, 5000);
            });
            
            // Attendre encore
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } while (noChangeCount < maxNoChangeAttempts);
        
        // Scroll final
        console.log('Scroll final pour vérification...');
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Compter le total final
        const finalCount = await page.evaluate(() => {
            const articles = document.querySelectorAll('div.products article');
            return articles.length;
        });
        
        console.log(`Scroll terminé - Total final: ${finalCount} produits`);
    }

    filterProducts(products, criteria) {
        console.log(`Filtrage de ${products.length} produits avec critères:`, criteria);
    
        // Conversion et validation des prix
        const cleanedProducts = products.map(product => {
            let price = typeof product.price === 'string' ? 
                parseInt(product.price.replace(/[^\d]/g, '')) || 0 : 
                (typeof product.price === 'number' ? product.price : 0);

            price = Math.round(price/1000);

            return {...product, price}
        });

        console.log(`TOUS les produits extraits avec prix:`);
    cleanedProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name.substring(0, 60)}... = ${p.price}TND (type: ${typeof p.price})`);
    });

        let filtered = cleanedProducts;

        // Filtrage par budget (+-30%)
        if (criteria.budget && criteria.budget > 0) {
            const min = criteria.budget * 0.9;
            const max = criteria.budget * 1.1;
            filtered = filtered.filter(p => {
            const productPrice = Number(p.price);
            const inBudget = productPrice === 0 || (productPrice >= min && productPrice <= max);
            console.log(`  - ${p.name.substring(0, 40)}... = ${productPrice}TND → ${inBudget ? '✅' : '❌'}`);
            return inBudget;
        });
        
            console.log(`Après filtrage budget (${min}-${max}TND): ${filtered.length} produits`);
        }

        // Filtrage par marque
        if (criteria.brand) {
            filtered = filtered.filter(p => 
                p.brand.toLowerCase().includes(criteria.brand.toLowerCase()) ||
                p.name.toLowerCase().includes(criteria.brand.toLowerCase())
            );

            console.log(`Après filtrage marque (${criteria.brand}): ${filtered.length} produits`);
        }

        // Tri par prix (produits avec prix en premier)
        filtered.sort((a, b) => {
            if (a.price > 0 && b.price === 0) return -1;
            if (a.price === 0 && b.price > 0) return 1;
            return a.price - b.price;
        });

        return filtered;
    }
}

// Fonction utilitaire
function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialisation
const deepseekAI = new DeepseekAI();
const scoopScraper = new ScoopScraper();

// ROUTES

// Route principale de chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId = generateConversationId() } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message requis' });
        }

        console.log(`💬 Message: "${message}"`);
        
        let products = [];
        
        // Vérifier si recherche produit nécessaire
        const needsSearch = await deepseekAI.needsProductSearch(message);
        console.log(`🔍 Recherche nécessaire: ${needsSearch}`);
        
        if (needsSearch) {
            // Extraire les critères
            const criteria = await deepseekAI.extractCriteria(message);
            
            // Scraper les produits
            products = await scoopScraper.scrapeProducts(criteria);
        }
        
        // Générer la réponse
        const response = await deepseekAI.handleConversation(message, conversationId, products);
        
        res.json({
            response: response,
            products: products.slice(0, 4),
            conversationId: conversationId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Erreur chat:', error);
        res.status(500).json({
            error: 'Erreur lors de la communication',
            message: 'Erreur technique, veuillez réessayer.'
        });
    }
});

// Route de test du scraper
app.get('/api/test-scraper', async (req, res) => {
    try {
        const category = req.query.category || 'gaming';
        console.log(`Test scraper pour catégorie: ${category}`);
        
        const products = await scoopScraper.scrapeProducts({ category });
        
        res.json({
            success: true,
            category: category,
            count: products.length,
            products: products,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        version: '3.0 Clean',
        deepseek: !!DEEPSEEK_API_KEY,
        puppeteer: 'Disponible',
        cache: scoopScraper.cache.size,
        conversations: deepseekAI.conversations.size,
        timestamp: new Date().toISOString(),
        features: [
            'Puppeteer pour contenu dynamique',
            'Auto-scroll pour charger tous les produits',
            'Structure: div.products > article > div.product-title',
            'Extraction: h6 (nom), a (lien), span.price (prix)',
            'Cache intelligent 10min',
            'Deepseek AI intégré'
        ]
    });
});

// Nettoyage du cache toutes les 15 minutes
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of scoopScraper.cache.entries()) {
        if (now - value.timestamp > scoopScraper.cacheExpiry) {
            scoopScraper.cache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Cache nettoyé: ${cleaned} entrées`);
    }
}, 15 * 60 * 1000);

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`\nScoop Bot v3.0 Clean démarré !`);
    console.log(`Interface: http://localhost:${PORT}`);
    console.log(`Deepseek: ${DEEPSEEK_API_KEY ? '✅' : '❌'}`);
    console.log(`Puppeteer: ✅ Prêt pour contenu dynamique`);
    console.log(`\nRoutes:`);
    console.log(`POST /api/chat - Chat principal`);
    console.log(`GET  /api/test-scraper?category=gaming - Test scraper`);
    console.log(`GET  /api/health - Status`);
    console.log(`\nTest:`);
    console.log(`curl "http://localhost:${PORT}/api/health"`);
    console.log(`curl "http://localhost:${PORT}/api/test-scraper?category=gaming"`);
});

module.exports = app;