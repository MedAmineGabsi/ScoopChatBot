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
    console.error('❌ DEEPSEEK_API_KEY manquant dans .env');
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

// Classe Deepseek AI avec filtrage et sélection intelligente
class DeepseekAI {
    constructor() {
        this.conversations = new Map();
        console.log('🤖 Deepseek AI initialisé avec filtrage et sélection intelligente');
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
            console.error('❌ Erreur Deepseek:', error.response?.data || error.message);
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
- Marques: ASUS, Lenovo, MSI, Dell, Apple
- Catégories: Gaming, Professionnel, Ultrabook, MacBook, Accessoires
- Usages: Gaming, Bureautique, Étudiant, Professionnel

STYLE:
- Réponds en français professionnel
- Sois concis mais informatif
- Recommande 3-4 produits avec justifications
- Propose des alternatives selon le budget
- Quand tu mets un lien place le dans une balise <a href="lien à mettre">Clique pour voir</a>

IMPORTANT:
- Recommande SEULEMENT les produits de la liste fournie
- Varie tes recommandations
- N'invente jamais de prix ou spécifications
- Pour les questions générales tu vas donner exactement ces réponses selon le sujet:

* Nettoyage PC --> "CLEANING:
Changement pate thermique + dépoussiérage + diagnostic + entretien préventif

DEEP CLEANING: 
Dépoussiérage + démontage + Restauration et lavage de chaque composant + changement pate thermique du CPU + Carte graphique , remise a neuf système refroidissement GPU et CPU
==>  Pour Plus d'info merci de contacter 28 980 827";

* Adresse ou localisation --> "Nous avons plusieurs points de vente en Tunisie où vous pouvez découvrir nos produits. Voici leurs adresses :
1 . Tunis, Centre Urbain Nord, Immeuble A16 1004. Téléphone : (+216) 70 247 841. Mobile : (+216) 24 307 647, (+216) 29 399 688. <a href="https://maps.app.goo.gl/xTdBCZkLmHM3JFXK6">Lien GPS</a>
2. La Soukra, 53 Avenue de l'UMA Ariana, Soukra 2036. Téléphone : (+216) 70 696 078. Mobile : (+216) 27 307 351. <a href="https://maps.app.goo.gl/AbByUYsEnMUCCrRU9">Lien GPS</a>

3. Sousse, rue Tarek ibn Zied, Trocadero Sousse 4000. Téléphone : (+216) 73 202 788. Mobile : (+216) 28 407 812. <a href="https://maps.app.goo.gl/jxJqYDbf8VkW8WKq5">Lien GPS</a>

==> Vous pouvez consulter nos sites web : scoop.com.tn et scoopgaming.com.tn.";

* Service maintenance / SAV / Problème technique --> "Veuillez contacter notre service après-vente (SAV) pour obtenir de l'aide. Nos techniciens qualifiés sont prêts à prendre en charge vos besoins.
1. Notre Service Après-Vente : Tunis : Centre Urbain Nord : Adresse Immeuble A16، 1004، Tunis
Mobile : (+216) 27 307 351 // 27307707
Téléphone :(+216) 70 247 830

2. Notre Service Après-Vente : Tunis : La Soukra : Adresse 53 Avenue de l'UMA Ariana 2036
Mobile : (+216) 28 980 827 // 27307707
Téléphone :(+216) 70 696 078

3. Sousse : Rue Tarek Ibn Zied Sousse, Trocadero Sousse 4000
Mobile : (+216) 28 407 813
Téléphone : (+216) 70 247 849";

* Facilité de paiement / Ta9sit --> "Il est possible de bénéficier d'une facilité de paiement en souscrivant à un crédit bancaire. La durée du crédit peut varier de 3 à 36 mois et le montant accordé peut aller de 300 dt à 10,000 dt.
Pièces à fournir :
– Carte d'identité nationale
– Attestation de travail originale avec cachet
– Les deux derniers bulletins de salaire (pour les salariés) ou Déclaration Unique de Revenu (pour les professions libérales de santé) originale avec cachet
– Attestation de salaire annuelle
– Les trois derniers relevés bancaires accompagnés du RIB bancaire tamponné par la banque
– Quittance SONEDE ou STEG de moins de trois mois
– Contrat de location (si applicable)

PS: Tous les documents doivent être fournis en originaux (les photocopies seront effectuées par le magasin).

--> Pour obtenir davantage d'informations, n'hésitez pas à vous rendre dans le point de vente le plus proche de chez vous ou à nous contacter par téléphone au 70 247 841 - 71 960 976 - 73 202 788 - 70 696 078.";

* Possibilité de vente PC / imprimante, etc.../ Service de Reprise --> "Vous pouvez proposer votre offre directement sur notre site 
<a href="swapify.tn">swapify.tn</a> ou contacter Aymen au 24 307 647.";

* Horaire de travail --> "

--hiver:

- Magasin Centre Urbain Nord :
- Du lundi au vendredi :
- Matin : 8h30 - 13h00
- Après-midi : 14h00 - 17h30

- Magasins Soukra et Sousse :
- Du lundi au vendredi :
- Matin : 9h30 - 13h00
- Après-midi : 14h00 - 18h30
- Samedi:
- Journée continue : 9h00 - 15h00

--été:

- Magasin Centre Urbain Nord :
Lundi - Jeudi : 08h00 ➡︎ 14h30
Vendredi : 08h00 ➡︎ 14h00

- Magasins Soukra et Sousse :
Lundi - Vendredi : 08h30 ➡︎ 16h30
Samedi : 08h30 ➡︎ 14h30";
`;
    }

    getIntelligentSelectionPrompt() {
        return `Tu es un expert en informatique spécialisé dans la sélection de produits pour Scoop.com.tn.

MISSION: Analyser TOUS les produits scrapés, les FILTRER selon les besoins client, puis sélectionner les 4 MEILLEURS.

ÉTAPES:
1. FILTRAGE selon budget et spécifications
2. ÉVALUATION technique et rapport qualité-prix
3. SÉLECTION des 4 meilleurs avec justifications

CRITÈRES DE FILTRAGE:
• BUDGET: Respecter la fourchette du client (±10-20%)
• USAGE: Adapter aux besoins spécifiques
• SPÉCIFICATIONS: Analyser les composants mentionnés

CRITÈRES D'ÉVALUATION:
• GAMING: GPU puissant (RTX/GTX), RAM 16GB+, CPU performant, écran 144Hz+
• PROFESSIONNEL: Processeur Intel/AMD récent, RAM 8GB+, SSD, autonomie
• ÉTUDIANT: Budget serré, polyvalence, portabilité, durabilité
• ULTRABOOK: Légèreté (<1.5kg), autonomie 8h+, design premium
• MACBOOK: Puce M1/M2/M3, RAM 8GB+, SSD, écosystème Apple

ANALYSE TECHNIQUE:
• PROCESSEUR: Intel i5/i7/i9, AMD Ryzen 5/7/9, Apple M1/M2/M3
• RAM: 8GB minimum, 16GB recommandé gaming/pro, 32GB pour workstation
• STOCKAGE: SSD obligatoire, 256GB minimum, 512GB+ recommandé
• GPU: Intel/AMD intégré (bureau), GTX/RTX (gaming), Radeon Pro (création)
• ÉCRAN: 14-15.6", Full HD minimum, 144Hz+ pour gaming

RÉPONSE REQUISE:
Format JSON exact avec les 4 meilleurs produits après filtrage:
{
  "filtering_summary": "Résumé du filtrage effectué",
  "selected_products": [
    {
      "id": "id_produit",
      "rank": 1,
      "score": 95,
      "reasons": ["raison technique 1", "raison prix 2", "raison usage 3"],
      "technical_analysis": "Analyse des spécifications"
    }
  ],
  "alternatives": "Suggestions si budget insuffisant",
  "total_analyzed": "nombre de produits analysés"
}`;
    }

    async needsProductSearch(message) {
        const searchKeywords = [
            'macbook', 'gaming', 'gamer',
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
5. Spécifications: composants mentionnés (RAM, SSD, GPU, etc.)
6. Mots-clés: termes importants pour la recherche

Catégories possibles:
- portable/laptop: PC portables classiques
- gaming: PC gaming, gamer, jeux
- professionnel/business: usage professionnel, bureau
- ultrabook: laptops fins et légers
- macbook: produits Apple
- accessoires: périphériques, câbles, etc.
- etudiant: pour étudiants, budget limité

Marques possibles: asus, hp, lenovo, msi, apple, dell, acer

Spécifications techniques:
- RAM: 8GB, 16GB, 32GB
- Stockage: SSD, HDD, 256GB, 512GB, 1TB
- GPU: GTX, RTX, Radeon, intégré
- CPU: Intel i5/i7, AMD Ryzen, Apple M1/M2

Réponds au format JSON exact:
{
  "budget": nombre_ou_null,
  "category": "catégorie_ou_null",
  "brand": "marque_ou_null",
  "usage": "usage_ou_null",
  "specifications": {
    "ram": "taille_ram_ou_null",
    "storage": "type_stockage_ou_null",
    "gpu": "type_gpu_ou_null",
    "cpu": "type_cpu_ou_null"
  },
  "keywords": ["mot1", "mot2"]
}

EXEMPLES:
"PC gaming ASUS RTX 4060 16GB RAM 3000 TND" → {"budget": 3000, "category": "gaming", "brand": "asus", "usage": "gaming", "specifications": {"ram": "16GB", "gpu": "RTX 4060"}, "keywords": ["pc", "gaming", "rtx"]}
"MacBook M2 pour développement" → {"budget": null, "category": "macbook", "brand": "apple", "usage": "developpement", "specifications": {"cpu": "M2"}, "keywords": ["macbook", "m2", "developpement"]}`
            },
            {
                role: "user",
                content: `Message à analyser: "${message}"`
            }
        ];

        try {
            const response = await this.callDeepseek(messages);
            console.log('🤖 Réponse extraction critères:');
            console.log(response);
            
            let jsonMatch = response.match(/\{[\s\S]*?\}/);
            
            if (!jsonMatch) {
                jsonMatch = response.match(/\{[^}]*\}/);
            }
            
            if (!jsonMatch) {
                const lines = response.split('\n');
                for (const line of lines) {
                    if (line.includes('{') && line.includes('}')) {
                        jsonMatch = [line.trim()];
                        break;
                    }
                }
            }
            
            if (jsonMatch) {
                console.log('📋 JSON trouvé:', jsonMatch[0]);
                try {
                    const criteria = JSON.parse(jsonMatch[0]);
                    console.log('✅ Critères extraits avec succès:', criteria);
                    return criteria;
                } catch (parseError) {
                    console.error('❌ Erreur parsing JSON:', parseError.message);
                }
            } else {
                console.error('❌ Aucun JSON trouvé dans la réponse Deepseek');
            }
        } catch (error) {
            console.error('❌ Erreur extraction critères Deepseek:', error.message);
        }

        console.log('❌ Retour de critères vides');
        return { 
            category: null, 
            budget: null, 
            brand: null, 
            specifications: {},
            keywords: [] 
        };
    }

    // FONCTION PRINCIPALE: Filtrage ET Sélection intelligente par Deepseek
    async intelligentFilterAndSelection(allProducts, userMessage, criteria) {
        if (!allProducts || allProducts.length === 0) {
            console.log('❌ Aucun produit à analyser');
            return { products: [], analysis: 'Aucun produit disponible' };
        }

        console.log(`🧠 Filtrage et sélection intelligente de ${allProducts.length} produits...`);

        // Préparer la liste complète des produits pour l'analyse
        const productList = allProducts.map((product, index) => {
            return `${index + 1}. ID: ${product.id}
   Nom: ${product.name}
   Prix: ${product.price} TND
   Marque: ${product.brand}
   URL: ${product.url}`;
        }).join('\n\n');

        const messages = [
            {
                role: "system",
                content: this.getIntelligentSelectionPrompt()
            },
            {
                role: "user",
                content: `MESSAGE UTILISATEUR: "${userMessage}"

CRITÈRES EXTRAITS:
- Budget: ${criteria.budget || 'Non spécifié'} TND
- Catégorie: ${criteria.category || 'Non spécifiée'}
- Marque: ${criteria.brand || 'Aucune préférence'}
- Usage: ${criteria.usage || 'Non spécifié'}
- Spécifications:
  * RAM: ${criteria.specifications?.ram || 'Non spécifiée'}
  * Stockage: ${criteria.specifications?.storage || 'Non spécifié'}
  * GPU: ${criteria.specifications?.gpu || 'Non spécifié'}
  * CPU: ${criteria.specifications?.cpu || 'Non spécifié'}
- Mots-clés: ${criteria.keywords?.join(', ') || 'Aucun'}

TOUS LES PRODUITS DISPONIBLES (${allProducts.length} produits):
${productList}

INSTRUCTIONS:
1. FILTRE d'abord selon budget et spécifications
2. ÉVALUE ensuite chaque produit filtré (rapport qualité-prix, spécifications, marque)
3. SÉLECTIONNE les 4 MEILLEURS produits
4. CLASSE par ordre de recommandation
5. JUSTIFIE chaque choix techniquement

IMPORTANT:
- Analyse les spécifications dans le nom du produit
- Respecte le budget client (±15% max)
- Privilégie qualité et pertinence sur quantité
- Si pas assez de produits dans le budget, propose des alternatives proches

Réponds UNIQUEMENT en format JSON valide.`
            }
        ];

        try {
            const response = await this.callDeepseek(messages);
            console.log('🧠 Réponse filtrage et sélection Deepseek:', response);

            // Extraire le JSON de la réponse
            let jsonMatch = response.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                try {
                    const selection = JSON.parse(jsonMatch[0]);
                    console.log('✅ Filtrage et sélection extraits:', selection);

                    if (selection.selected_products && Array.isArray(selection.selected_products)) {
                        // Mapper les IDs sélectionnés aux vrais produits
                        const selectedProducts = selection.selected_products
                            .map(selected => {
                                const product = allProducts.find(p => p.id == selected.id);
                                if (product) {
                                    return {
                                        ...product,
                                        rank: selected.rank,
                                        score: selected.score,
                                        reasons: selected.reasons || [],
                                        technical_analysis: selected.technical_analysis || ''
                                    };
                                }
                                return null;
                            })
                            .filter(p => p !== null)
                            .sort((a, b) => a.rank - b.rank);

                        console.log(`🎯 ${selectedProducts.length} produits filtrés et sélectionnés intelligemment`);
                        
                        return {
                            products: selectedProducts,
                            analysis: selection.filtering_summary || 'Filtrage et sélection automatiques',
                            alternatives: selection.alternatives || '',
                            totalAnalyzed: selection.total_analyzed || allProducts.length
                        };
                    }
                } catch (parseError) {
                    console.error('❌ Erreur parsing filtrage JSON:', parseError.message);
                }
            }

            console.log('❌ Filtrage JSON invalide, retour produits par prix');
            const fallbackProducts = allProducts
                .filter(p => p.price > 0)
                .sort((a, b) => a.price - b.price)
                .slice(0, 4);
                
            return {
                products: fallbackProducts,
                analysis: 'Sélection automatique par prix - erreur IA',
                alternatives: '',
                totalAnalyzed: allProducts.length
            };

        } catch (error) {
            console.error('❌ Erreur filtrage et sélection intelligents:', error.message);
            
            const fallbackProducts = allProducts
                .filter(p => p.price > 0)
                .sort((a, b) => a.price - b.price)
                .slice(0, 4);
                
            return {
                products: fallbackProducts,
                analysis: 'Sélection automatique - erreur technique',
                alternatives: '',
                totalAnalyzed: allProducts.length
            };
        }
    }

    async handleConversation(message, conversationId, products = [], selectionData = {}) {
        const conversation = this.conversations.get(conversationId) || [];
        
        const messages = [
            { role: "system", content: this.getSystemPrompt() }
        ];

        // Ajouter les produits sélectionnés intelligemment
        if (products.length > 0) {
            const productList = products.map((p, i) => {
                let productDesc = `${i + 1}. ${p.name} | ${p.price} TND | ${p.brand} | ${p.url}`;
                
                // Ajouter les informations de sélection intelligente
                if (p.rank && p.score) {
                    productDesc += ` | Rank: ${p.rank} | Score: ${p.score}/100`;
                }
                if (p.reasons && p.reasons.length > 0) {
                    productDesc += ` | Raisons: ${p.reasons.join(', ')}`;
                }
                if (p.technical_analysis) {
                    productDesc += ` | Analyse: ${p.technical_analysis}`;
                }
                
                return productDesc;
            }).join('\n');

            let systemMessage = `PRODUITS FILTRÉS ET SÉLECTIONNÉS INTELLIGEMMENT:\n${productList}`;
            
            if (selectionData.analysis) {
                systemMessage += `\n\nANALYSE DE FILTRAGE: ${selectionData.analysis}`;
            }
            
            if (selectionData.alternatives) {
                systemMessage += `\n\nALTERNATIVES: ${selectionData.alternatives}`;
            }
            
            systemMessage += `\n\nRecommande ces produits avec leurs avantages techniques spécifiques.`;

            messages.push({
                role: "system",
                content: systemMessage
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

// Classe Scraper Scoop SIMPLIFIÉE (sans filtrage)
class ScoopScraper {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        console.log('🕷️ Scraper Scoop initialisé - SANS filtrage (tout pour Deepseek)');
    }

    async scrapeAllProducts(criteria) {
        console.log('🔍 Scraping TOUS les produits avec critères:', criteria);
        
        // Déterminer l'URL selon la catégorie
        let targetUrl = SCOOP_CATEGORIES.laptop; // URL par défaut
        
        if (criteria.category) {
            const category = criteria.category.toLowerCase();
            if (SCOOP_CATEGORIES[category]) {
                targetUrl = SCOOP_CATEGORIES[category];
            }
        }

        console.log('🌐 URL cible:', targetUrl);

        // Vérifier le cache
        const cacheKey = `${targetUrl}_raw`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log('📦 Utilisation du cache');
                return cached.products;
            }
        }

        // Scrapper avec Puppeteer
        const allProducts = await this.scrapeWithPuppeteer(targetUrl);

        // Mettre en cache TOUS les produits sans filtrage
        this.cache.set(cacheKey, {
            products: allProducts,
            timestamp: Date.now()
        });

        console.log(`✅ ${allProducts.length} produits scrapés (TOUS envoyés à Deepseek)`);
        return allProducts;
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

            // Extraire TOUS les produits
            console.log('📦 Extraction de TOUS les produits...');
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
                                // Conversion en milliers pour simplicité
                                price = Math.round(price / 1000);
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
                                name: name.substring(0, 200), // Plus long pour les spécifications
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

            console.log(`✅ ${products.length} produits extraits (SANS filtrage)`);
            return products;

        } catch (error) {
            console.error('❌ Erreur Puppeteer:', error.message);
            return [];
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async autoScroll(page) {
        console.log('📜 Début du scroll intelligent...');
        
        let previousProductCount = 0;
        let currentProductCount = 0;
        let noChangeCount = 0;
        const maxNoChangeAttempts = 2;
        
        do {
            previousProductCount = currentProductCount;
            currentProductCount = await page.evaluate(() => {
                const articles = document.querySelectorAll('div.products article');
                return articles.length;
            });
            
            console.log(`📦 Produits actuellement visibles: ${currentProductCount}`);
            
            if (currentProductCount > previousProductCount) {
                console.log(`✅ ${currentProductCount - previousProductCount} nouveaux produits chargés`);
                noChangeCount = 0;
            } else {
                noChangeCount++;
                console.log(`⏳ Aucun nouveau produit (tentative ${noChangeCount}/${maxNoChangeAttempts})`);
            }
            
            await page.evaluate(() => {
                window.scrollBy(0, 1000);
            });
            
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            await page.evaluate(() => {
                window.scrollBy(0, 5000);
            });
            
            await new Promise(resolve => setTimeout(resolve, 2500));
            
        } while (noChangeCount < maxNoChangeAttempts);
        
        console.log('🔄 Scroll final pour vérification...');
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const finalCount = await page.evaluate(() => {
            const articles = document.querySelectorAll('div.products article');
            return articles.length;
        });
        
        console.log(`🎯 Scroll terminé - Total final: ${finalCount} produits`);
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

// Route principale de chat OPTIMISÉE avec filtrage et sélection 100% Deepseek
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId = generateConversationId() } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message requis' });
        }

        console.log(`💬 Message: "${message}"`);
        
        let products = [];
        let selectionData = {};
        
        // Vérifier si recherche produit nécessaire
        const needsSearch = await deepseekAI.needsProductSearch(message);
        console.log(`🔍 Recherche nécessaire: ${needsSearch}`);
        
        if (needsSearch) {
            // 1. Extraire les critères détaillés
            const criteria = await deepseekAI.extractCriteria(message);
            console.log('📋 Critères extraits:', criteria);
            
            // 2. Scraper TOUS les produits (sans filtrage)
            const allProducts = await scoopScraper.scrapeAllProducts(criteria);
            console.log(`🕷️ ${allProducts.length} produits scrapés (TOUS)`);
            
            // 3. Filtrage ET Sélection intelligente 100% Deepseek
            if (allProducts.length > 0) {
                const selection = await deepseekAI.intelligentFilterAndSelection(allProducts, message, criteria);
                products = selection.products || [];
                selectionData = {
                    analysis: selection.analysis,
                    alternatives: selection.alternatives,
                    totalAnalyzed: selection.totalAnalyzed
                };
                console.log(`🧠 ${products.length} produits filtrés et sélectionnés par Deepseek sur ${allProducts.length} analysés`);
            }
        }
        
        // 4. Générer la réponse avec les produits filtrés et sélectionnés
        const response = await deepseekAI.handleConversation(message, conversationId, products, selectionData);
        
        res.json({
            response: response,
            products: products.slice(0, 4),
            selectionData: selectionData,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erreur chat:', error);
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
        console.log(`🧪 Test scraper pour catégorie: ${category}`);
        
        const products = await scoopScraper.scrapeAllProducts({ category });
        
        res.json({
            success: true,
            category: category,
            count: products.length,
            products: products.slice(0, 10), // Afficher 10 premiers pour le test
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Route de test du filtrage et sélection intelligente
app.post('/api/test-intelligent-selection', async (req, res) => {
    try {
        const { message = "PC gaming RTX 4060 16GB 3000 TND", category = "gaming" } = req.body;
        
        console.log(`🧪 Test filtrage et sélection intelligente: "${message}" catégorie: ${category}`);
        
        // 1. Extraire critères
        const criteria = await deepseekAI.extractCriteria(message);
        console.log('📋 Critères:', criteria);
        
        // 2. Scraper TOUS les produits
        const allProducts = await scoopScraper.scrapeAllProducts({ category, ...criteria });
        console.log(`🕷️ ${allProducts.length} produits scrapés`);
        
        // 3. Filtrage et sélection intelligente
        const selection = await deepseekAI.intelligentFilterAndSelection(allProducts, message, criteria);
        
        res.json({
            success: true,
            message: message,
            criteria: criteria,
            totalProducts: allProducts.length,
            selectedCount: selection.products.length,
            filteringAnalysis: selection.analysis,
            alternatives: selection.alternatives,
            selectedProducts: selection.products,
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
        version: '3.2 Filtrage Deepseek pur',
        deepseek: !!DEEPSEEK_API_KEY,
        puppeteer: 'Disponible',
        cache: scoopScraper.cache.size,
        conversations: deepseekAI.conversations.size,
        timestamp: new Date().toISOString(),
        features: [
            'Puppeteer pour scraping complet',
            'AUCUN filtrage initial - tout pour Deepseek',
            'Filtrage ET sélection 100% IA',
            'Analyse des spécifications techniques',
            'Respect du budget intelligent',
            'Ranking et scoring par expertise',
            'Cache intelligent 10min'
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
    console.log(`\n🚀 Scoop Bot v3.2 Filtrage Deepseek Pur démarré !`);
    console.log(`🔗 Interface: http://localhost:${PORT}`);
    console.log(`🤖 Deepseek: ${DEEPSEEK_API_KEY ? '✅' : '❌'}`);
    console.log(`🎭 Puppeteer: ✅ Scraping complet`);
    console.log(`🧠 Filtrage IA: ✅ 100% Deepseek (specs + prix)`);
    console.log(`\n📋 Routes:`);
    console.log(`   POST /api/chat - Chat avec filtrage IA pur`);
    console.log(`   GET  /api/test-scraper?category=gaming - Test scraper`);
    console.log(`   POST /api/test-intelligent-selection - Test filtrage IA`);
    console.log(`   GET  /api/health - Status`);
    console.log(`\n🧪 Tests:`);
    console.log(`   curl "http://localhost:${PORT}/api/health"`);
    console.log(`   curl -X POST "http://localhost:${PORT}/api/test-intelligent-selection" -H "Content-Type: application/json" -d '{"message":"PC gaming ASUS RTX 4060 16GB 3000 TND","category":"gaming"}'`);
    console.log(`\n🎯 Workflow:`);
    console.log(`   1. Message → 2. Extraction critères → 3. Scraping COMPLET`);
    console.log(`   → 4. Filtrage + Sélection 100% Deepseek → 5. Réponse`);
});

module.exports = app;