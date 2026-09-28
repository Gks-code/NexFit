/**
 * Aura BioPharma - Interactive Application Logic
 * Academic & Professional E-commerce Platform
 */

// Global State
const state = {
  products: typeof PRODUCTS_DATA !== 'undefined' ? PRODUCTS_DATA : [],
  activeCategory: 'all',
  activeBrand: 'all',
  searchQuery: '',
  onlyPromotions: false,
  sortBy: 'relevancia',
  viewMode: 'grid',
  currentPage: 1,
  itemsPerPage: 16,
  cart: JSON.parse(localStorage.getItem('aura_cart') || '[]'),
  appliedCoupon: null,
  shippingCost: 0,
  isDark: localStorage.getItem('aura_theme') === 'dark' || 
          (!localStorage.getItem('aura_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
};

// Available Coupons
const COUPONS = {
  'COLEGIO10': { type: 'percent', value: 10, label: '10% de desconto especial' },
  'AURA15': { type: 'percent', value: 15, label: '15% de desconto de boas-vindas' },
  'FRETEGRATIS': { type: 'free_shipping', value: 0, label: 'Frete Grátis garantido' },
  'VITALIS50': { type: 'fixed', value: 50, label: 'R$ 50,00 de desconto' }
};

// Educational scientific descriptions for categories & substances
const SUBSTANCE_SPECS = {
  'emagrecedores': {
    title: 'Moduladores Metabólicos & Agonistas de GLP-1/GIP',
    summary: 'Compostos que mimetizam incretinas intestinais, promovendo saciedade precoce, regulação glicêmica e termogênese.',
    storage: 'Refrigeração de 2°C a 8°C (manter ao abrigo da luz).'
  },
  'peptideos': {
    title: 'Peptídeos Biomiméticos de Sinalização Celular',
    summary: 'Sequências de aminoácidos com alta afinidade a receptores celulares específicos, estimulando síntese proteica, reparo tecidual e angiogênese.',
    storage: 'Frasco liofilizado a -20°C ou refrigerado. Após reconstituição, usar em até 28 dias.'
  },
  'hormonios': {
    title: 'Formulações Hormonais & Análogos Esteroidais',
    summary: 'Moduladores de receptores androgênicos e metabólicos aplicados em estudos de endocrinologia, composição corporal e terapia de reposição.',
    storage: 'Temperatura ambiente controlada (15°C a 30°C).'
  }
};

// Formatting helpers
function formatBRL(value) {
  if (value === null || value === undefined || isNaN(value)) return 'Consulte';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function calculateInstallment(price) {
  if (!price) return '';
  const installment = (price / 12).toFixed(2).replace('.', ',');
  return `ou 12x de R$ ${installment} s/ juros`;
}

function calculatePixPrice(price) {
  if (!price) return 0;
  return price * 0.95; // 5% discount
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initBrandsList();
  renderProducts();
  updateCategoryCounts();
  renderCart();
  setupEventListeners();
  setupLiveSearch();
  lucide.createIcons();
});

// Theme Management
function initTheme() {
  if (state.isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcon();
}

function toggleTheme() {
  state.isDark = !state.isDark;
  if (state.isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('aura_theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('aura_theme', 'light');
  }
  updateThemeIcon();
  showToast(`Modo ${state.isDark ? 'Escuro' : 'Claro'} ativado`, 'info');
}

function updateThemeIcon() {
  const iconWrap = document.getElementById('theme-toggle-btn');
  if (!iconWrap) return;
  iconWrap.innerHTML = state.isDark 
    ? `<i data-lucide="sun" class="size-5 text-amber-400"></i>`
    : `<i data-lucide="moon" class="size-5 text-slate-600"></i>`;
  lucide.createIcons();
}

// Brand Filter Population
function initBrandsList() {
  const brandContainer = document.getElementById('brands-filter-container');
  if (!brandContainer) return;

  const brands = new Set();
  state.products.forEach(p => {
    if (p.brand && p.brand.trim()) {
      brands.add(p.brand.trim());
    }
  });

  const sortedBrands = Array.from(brands).sort();
  
  let html = `
    <button type="button" 
      class="brand-chip whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border border-border transition-all ${state.activeBrand === 'all' ? 'active' : 'text-muted-foreground hover:border-slate-400'}"
      data-brand="all">
      Todos os Laboratórios
    </button>
  `;

  sortedBrands.forEach(brand => {
    const isSelected = state.activeBrand === brand;
    html += `
      <button type="button" 
        class="brand-chip whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border border-border transition-all ${isSelected ? 'active' : 'text-muted-foreground hover:border-slate-400'}"
        data-brand="${brand}">
        ${brand}
      </button>
    `;
  });

  brandContainer.innerHTML = html;

  brandContainer.querySelectorAll('.brand-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeBrand = btn.dataset.brand;
      state.currentPage = 1;
      initBrandsList();
      renderProducts();
    });
  });
}

// Category Counts
function updateCategoryCounts() {
  const counts = {
    all: state.products.length,
    emagrecedores: 0,
    peptideos: 0,
    hormonios: 0
  };

  state.products.forEach(p => {
    if (counts[p.categorySlug] !== undefined) {
      counts[p.categorySlug]++;
    }
  });

  const countAll = document.getElementById('count-all');
  const countEmag = document.getElementById('count-emagrecedores');
  const countPep = document.getElementById('count-peptideos');
  const countHorm = document.getElementById('count-hormonios');

  if (countAll) countAll.textContent = `(${counts.all})`;
  if (countEmag) countEmag.textContent = `(${counts.emagrecedores})`;
  if (countPep) countPep.textContent = `(${counts.peptideos})`;
  if (countHorm) countHorm.textContent = `(${counts.hormonios})`;
}

// Filter and Sort Products
function getFilteredProducts() {
  return state.products.filter(p => {
    // Category match
    if (state.activeCategory !== 'all' && p.categorySlug !== state.activeCategory) {
      return false;
    }
    // Brand match
    if (state.activeBrand !== 'all' && p.brand !== state.activeBrand) {
      return false;
    }
    // Promotion filter
    if (state.onlyPromotions && !p.onSale && !(p.compareAtPrice && p.compareAtPrice > p.price)) {
      return false;
    }
    // Search match
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      const matchPres = (p.presentation || '').toLowerCase().includes(q);
      const matchDesc = (p.shortDescription || '').toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchPres && !matchDesc) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    switch (state.sortBy) {
      case 'menor-preco':
        return (a.price || 0) - (b.price || 0);
      case 'maior-preco':
        return (b.price || 0) - (a.price || 0);
      case 'nome':
        return (a.name || '').localeCompare(b.name || '');
      case 'promocao':
        const discA = a.compareAtPrice && a.price ? (a.compareAtPrice - a.price) : 0;
        const discB = b.compareAtPrice && b.price ? (b.compareAtPrice - b.price) : 0;
        return discB - discA;
      case 'relevancia':
      default:
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
  });
}

// Render Products Grid & List
function renderProducts() {
  const container = document.getElementById('products-container');
  const resultsCounter = document.getElementById('results-counter');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const loadMoreContainer = document.getElementById('load-more-container');
  const emptyState = document.getElementById('empty-state');

  if (!container) return;

  const filtered = getFilteredProducts();
  const totalCount = filtered.length;
  const displayedCount = Math.min(state.currentPage * state.itemsPerPage, totalCount);
  const itemsToRender = filtered.slice(0, displayedCount);

  if (resultsCounter) {
    resultsCounter.textContent = `Exibindo ${displayedCount} de ${totalCount} produtos`;
  }

  if (totalCount === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  if (state.viewMode === 'grid') {
    container.className = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4';
    container.innerHTML = itemsToRender.map(p => createProductCardGrid(p)).join('');
  } else {
    container.className = 'flex flex-col gap-3';
    container.innerHTML = itemsToRender.map(p => createProductCardList(p)).join('');
  }

  // Load More Button visibility
  if (loadMoreContainer) {
    if (displayedCount < totalCount) {
      loadMoreContainer.classList.remove('hidden');
      if (loadMoreBtn) {
        loadMoreBtn.textContent = `Carregar mais produtos (${totalCount - displayedCount} restantes)`;
      }
    } else {
      loadMoreContainer.classList.add('hidden');
    }
  }

  attachCardEvents();
  lucide.createIcons();
}

// Fallback image helper
function getProductImage(imageUrl, categorySlug) {
  if (imageUrl && imageUrl.trim()) {
    return `<img src="${imageUrl}" alt="Produto" loading="lazy" class="product-img h-full w-full object-contain p-2" onerror="this.onerror=null; this.parentElement.innerHTML=getFallbackSVG('${categorySlug}');" />`;
  }
  return getFallbackSVG(categorySlug);
}

function getFallbackSVG(categorySlug) {
  let iconName = 'flask-conical';
  let badgeColor = 'from-teal-500/20 to-sky-500/20 text-teal-600 dark:text-teal-400';
  let label = 'Fórmula Laboratorial';

  if (categorySlug === 'emagrecedores') {
    iconName = 'flame';
    badgeColor = 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400';
    label = 'GLP-1 / Modulador';
  } else if (categorySlug === 'peptideos') {
    iconName = 'dna';
    badgeColor = 'from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400';
    label = 'Peptídeo de Precisão';
  } else if (categorySlug === 'hormonios') {
    iconName = 'shield-alert';
    badgeColor = 'from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400';
    label = 'Composto Endócrino';
  }

  return `
    <div class="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br ${badgeColor} p-4 text-center select-none">
      <i data-lucide="${iconName}" class="size-12 mb-2 stroke-[1.4] opacity-80"></i>
      <span class="text-[11px] font-semibold tracking-wider uppercase opacity-75">${label}</span>
      <span class="text-[10px] opacity-60">Laudo Certificado</span>
    </div>
  `;
}

// Template: Grid Product Card
function createProductCardGrid(product) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const pixPrice = calculatePixPrice(product.price);

  return `
    <div class="glass-card flex flex-col justify-between rounded-2xl overflow-hidden group border border-border" data-id="${product.id}">
      <div class="relative product-img-wrap cursor-pointer" onclick="openProductModal('${product.id}')">
        ${getProductImage(product.imageUrl, product.categorySlug)}
        
        <!-- Badges Container -->
        <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
          ${product.onSale || hasDiscount ? `
            <span class="badge-discount pill-badge">
              <i data-lucide="tag" class="size-3"></i> -${discountPercent || 15}%
            </span>
          ` : ''}
          ${product.featured ? `
            <span class="badge-featured pill-badge">
              <i data-lucide="sparkles" class="size-3"></i> Destaque
            </span>
          ` : ''}
        </div>

        <button type="button" 
          aria-label="Ver detalhes rápidos" 
          onclick="event.stopPropagation(); openProductModal('${product.id}')"
          class="absolute bottom-2 right-2 p-2 rounded-xl bg-surface/90 hover:bg-surface text-foreground shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
          <i data-lucide="eye" class="size-4"></i>
        </button>
      </div>

      <div class="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider truncate">
              ${product.brand || 'Laboratório Certificado'}
            </span>
            <span class="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-mono shrink-0">
              ${product.presentation || 'Dose Padrão'}
            </span>
          </div>

          <h3 class="font-heading font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-snug cursor-pointer hover:text-teal-600 transition-colors"
              onclick="openProductModal('${product.id}')">
            ${product.name}
          </h3>
        </div>

        <div class="pt-2 border-t border-border/60">
          <div class="flex flex-col">
            ${hasDiscount ? `
              <span class="text-[11px] text-muted-foreground line-through">
                ${formatBRL(product.compareAtPrice)}
              </span>
            ` : ''}
            <div class="flex items-baseline gap-1.5">
              <span class="text-base sm:text-lg font-bold text-foreground">
                ${formatBRL(product.price)}
              </span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                no PIX (${formatBRL(pixPrice)})
              </span>
            </div>
            <span class="text-[11px] text-muted-foreground">
              ${calculateInstallment(product.price)}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-5 gap-1.5">
            <button type="button" 
              onclick="openProductModal('${product.id}')"
              class="col-span-2 py-2 px-2 rounded-xl border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-1">
              Detalhes
            </button>
            <button type="button" 
              onclick="addToCart('${product.id}')"
              class="col-span-3 py-2 px-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-1.5">
              <i data-lucide="shopping-cart" class="size-3.5"></i>
              Comprar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Template: List Product Card
function createProductCardList(product) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const pixPrice = calculatePixPrice(product.price);

  return `
    <div class="glass-card list-view-card rounded-2xl border border-border" data-id="${product.id}">
      <div class="relative h-24 w-24 rounded-xl overflow-hidden bg-muted/40 cursor-pointer shrink-0" onclick="openProductModal('${product.id}')">
        ${getProductImage(product.imageUrl, product.categorySlug)}
      </div>

      <div class="flex flex-col justify-center min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            ${product.brand || 'Laboratório'}
          </span>
          <span class="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">
            ${product.presentation || ''}
          </span>
        </div>

        <h3 class="font-heading font-bold text-base text-foreground truncate cursor-pointer hover:text-teal-600" onclick="openProductModal('${product.id}')">
          ${product.name}
        </h3>
        
        <p class="text-xs text-muted-foreground mt-0.5 truncate">
          ${product.shortDescription || 'Produto verificado com procedência e laudo laboratorial de pureza (HPLC).'}
        </p>

        <div class="flex items-center gap-2 mt-1 sm:hidden">
          <span class="font-bold text-base text-foreground">${formatBRL(product.price)}</span>
          <span class="text-xs text-emerald-600 font-medium">PIX 5% OFF</span>
        </div>
      </div>

      <div class="list-actions hidden sm:flex flex-col items-end justify-center gap-2 shrink-0">
        <div class="text-right">
          ${hasDiscount ? `
            <span class="text-xs text-muted-foreground line-through block">
              ${formatBRL(product.compareAtPrice)}
            </span>
          ` : ''}
          <div class="text-lg font-bold text-foreground">
            ${formatBRL(product.price)}
          </div>
          <span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block">
            ${formatBRL(pixPrice)} à vista
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" 
            onclick="openProductModal('${product.id}')"
            class="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ver detalhes">
            <i data-lucide="eye" class="size-4"></i>
          </button>
          <button type="button" 
            onclick="addToCart('${product.id}')"
            class="py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5">
            <i data-lucide="shopping-cart" class="size-3.5"></i>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachCardEvents() {
  // Handled inline with onclick for high performance and stability
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle Button
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Category Tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeCategory = tab.dataset.category;
      state.currentPage = 1;
      renderProducts();
    });
  });

  // Sort Select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      state.currentPage = 1;
      renderProducts();
    });
  }

  // View Mode Toggles
  const btnGrid = document.getElementById('btn-view-grid');
  const btnList = document.getElementById('btn-view-list');
  if (btnGrid && btnList) {
    btnGrid.addEventListener('click', () => {
      state.viewMode = 'grid';
      btnGrid.classList.add('bg-muted', 'text-foreground');
      btnGrid.classList.remove('text-muted-foreground');
      btnList.classList.remove('bg-muted', 'text-foreground');
      btnList.classList.add('text-muted-foreground');
      renderProducts();
    });

    btnList.addEventListener('click', () => {
      state.viewMode = 'list';
      btnList.classList.add('bg-muted', 'text-foreground');
      btnList.classList.remove('text-muted-foreground');
      btnGrid.classList.remove('bg-muted', 'text-foreground');
      btnGrid.classList.add('text-muted-foreground');
      renderProducts();
    });
  }

  // Only Promotions Checkbox
  const promoCheck = document.getElementById('promo-only-filter');
  if (promoCheck) {
    promoCheck.addEventListener('change', (e) => {
      state.onlyPromotions = e.target.checked;
      state.currentPage = 1;
      renderProducts();
    });
  }

  // Load More Button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      state.currentPage++;
      renderProducts();
    });
  }

  // Search Input in Header
  const searchInput = document.getElementById('main-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      state.currentPage = 1;
      if (clearSearchBtn) {
        if (state.searchQuery) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
      }
      renderProducts();
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderProducts();
    });
  }

  // Cart Drawer open/close
  const cartTrigger = document.getElementById('cart-drawer-trigger');
  const cartMobileTrigger = document.getElementById('mobile-cart-trigger');
  const cartClose = document.getElementById('close-cart-btn');
  const cartOverlay = document.getElementById('cart-overlay');

  if (cartTrigger) cartTrigger.addEventListener('click', openCartDrawer);
  if (cartMobileTrigger) cartMobileTrigger.addEventListener('click', openCartDrawer);
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

  // Modal Close buttons
  const modalClose = document.getElementById('close-modal-btn');
  const modalOverlay = document.getElementById('product-modal-overlay');
  if (modalClose) modalClose.addEventListener('click', closeProductModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeProductModal);

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCartDrawer();
      closeSchoolModal();
      closeCheckoutModal();
    }
  });

  // Coupon application
  const applyCouponBtn = document.getElementById('apply-coupon-btn');
  const couponInput = document.getElementById('coupon-code-input');
  if (applyCouponBtn && couponInput) {
    applyCouponBtn.addEventListener('click', () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) return;
      if (COUPONS[code]) {
        state.appliedCoupon = { code, ...COUPONS[code] };
        showToast(`Cupom ${code} aplicado com sucesso!`, 'success');
        couponInput.value = '';
        renderCart();
      } else {
        showToast('Cupom inválido ou expirado', 'error');
      }
    });
  }

  // Shipping simulation calculator
  const calcShippingBtn = document.getElementById('calc-shipping-btn');
  const cepInput = document.getElementById('shipping-cep-input');
  if (calcShippingBtn && cepInput) {
    calcShippingBtn.addEventListener('click', () => {
      const cep = cepInput.value.replace(/\D/g, '');
      if (cep.length === 8) {
        calcShippingBtn.innerHTML = `<i data-lucide="loader-2" class="size-4 animate-spin"></i>`;
        setTimeout(() => {
          calcShippingBtn.innerHTML = `Calcular`;
          const subtotal = getCartSubtotal();
          if (subtotal >= 500) {
            state.shippingCost = 0;
            showToast('Parabéns! Frete Grátis Express para o seu CEP.', 'success');
          } else {
            state.shippingCost = 29.90;
            showToast('Frete Sedex com controle de temperatura: R$ 29,90', 'info');
          }
          renderCart();
          lucide.createIcons();
        }, 600);
      } else {
        showToast('Digite um CEP válido com 8 dígitos', 'error');
      }
    });
  }

  // Checkout button inside cart
  const checkoutBtn = document.getElementById('proceed-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (state.cart.length === 0) {
        showToast('Seu carrinho está vazio!', 'warning');
        return;
      }
      closeCartDrawer();
      sendWhatsAppOrder();
    });
  }
}

// Live Autocomplete Search Dropdown
function setupLiveSearch() {
  const input = document.getElementById('main-search-input');
  const dropdown = document.getElementById('search-autocomplete-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = state.products.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q)
    ).slice(0, 5);

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-3 text-center text-xs text-muted-foreground">
          Nenhum resultado direto para "${q}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    let html = `
      <div class="p-2 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
        <span>Sugestões Encontradas</span>
        <span>${matches.length} produtos</span>
      </div>
    `;

    matches.forEach(p => {
      html += `
        <div class="flex items-center gap-3 p-2.5 hover:bg-muted/60 rounded-xl cursor-pointer transition-colors"
             onclick="openProductModal('${p.id}'); document.getElementById('search-autocomplete-dropdown').classList.add('hidden');">
          <div class="h-10 w-10 rounded-lg overflow-hidden bg-muted/40 shrink-0 border border-border/50">
            ${p.imageUrl ? `<img src="${p.imageUrl}" class="h-full w-full object-contain" />` : `<div class="h-full w-full flex items-center justify-center text-xs font-bold text-teal-600">AB</div>`}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-semibold text-foreground truncate">${p.name}</h4>
            <span class="text-[10px] text-muted-foreground">${p.brand || ''} · ${p.presentation || ''}</span>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs font-bold text-teal-600 dark:text-teal-400">${formatBRL(p.price)}</span>
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  });

  // Hide dropdown on blur
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// Shopping Cart Functions
function addToCart(productId, qty = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = state.cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    state.cart.push({ id: productId, quantity: qty, product });
  }

  saveCart();
  renderCart();
  animateCartIcon();
  showToast(`"${product.name}" adicionado ao carrinho!`, 'success');
}

function updateCartQuantity(productId, newQty) {
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = state.cart.find(i => i.id === productId);
  if (item) {
    item.quantity = newQty;
    saveCart();
    renderCart();
  }
}

function removeFromCart(productId) {
  const item = state.cart.find(i => i.id === productId);
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
  if (item) {
    showToast(`"${item.product.name}" removido do carrinho`, 'info');
  }
}

function saveCart() {
  localStorage.setItem('aura_cart', JSON.stringify(state.cart));
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0);
}

function calculateDiscount(subtotal) {
  if (!state.appliedCoupon) return 0;
  if (state.appliedCoupon.type === 'percent') {
    return subtotal * (state.appliedCoupon.value / 100);
  } else if (state.appliedCoupon.type === 'fixed') {
    return Math.min(subtotal, state.appliedCoupon.value);
  }
  return 0;
}

function renderCart() {
  const countBadges = document.querySelectorAll('.cart-count-badge');
  const totalQuantity = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  countBadges.forEach(badge => {
    badge.textContent = totalQuantity;
    if (totalQuantity > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });

  const cartItemsContainer = document.getElementById('cart-items-list');
  const cartSubtotalEl = document.getElementById('cart-subtotal-val');
  const cartDiscountEl = document.getElementById('cart-discount-val');
  const cartDiscountRow = document.getElementById('cart-discount-row');
  const cartShippingEl = document.getElementById('cart-shipping-val');
  const cartTotalEl = document.getElementById('cart-total-val');
  const emptyCartState = document.getElementById('cart-empty-state');
  const cartFooter = document.getElementById('cart-footer-section');
  const freeShippingBar = document.getElementById('free-shipping-progress');
  const freeShippingText = document.getElementById('free-shipping-text');

  if (!cartItemsContainer) return;

  const subtotal = getCartSubtotal();
  const discount = calculateDiscount(subtotal);
  const effectiveShipping = (state.appliedCoupon && state.appliedCoupon.type === 'free_shipping') || subtotal >= 500
    ? 0 
    : state.shippingCost;
  const total = Math.max(0, subtotal - discount + effectiveShipping);

  // Free shipping progress bar (Threshold: R$ 500)
  if (freeShippingBar && freeShippingText) {
    const needed = 500;
    const progress = Math.min(100, Math.round((subtotal / needed) * 100));
    freeShippingBar.style.width = `${progress}%`;
    if (subtotal >= needed) {
      freeShippingText.innerHTML = `🎉 <strong>Parabéns!</strong> Você ganhou <strong>Frete Grátis</strong>!`;
      freeShippingBar.classList.remove('bg-teal-500');
      freeShippingBar.classList.add('bg-emerald-500');
    } else {
      const remaining = needed - subtotal;
      freeShippingText.innerHTML = `Faltam <strong>${formatBRL(remaining)}</strong> para ganhar <strong>Frete Grátis</strong>`;
      freeShippingBar.classList.remove('bg-emerald-500');
      freeShippingBar.classList.add('bg-teal-500');
    }
  }

  if (state.cart.length === 0) {
    cartItemsContainer.innerHTML = '';
    if (emptyCartState) emptyCartState.classList.remove('hidden');
    if (cartFooter) cartFooter.classList.add('hidden');
    return;
  }

  if (emptyCartState) emptyCartState.classList.add('hidden');
  if (cartFooter) cartFooter.classList.remove('hidden');

  let itemsHtml = '';
  state.cart.forEach(item => {
    const itemTotal = (item.product.price || 0) * item.quantity;
    itemsHtml += `
      <div class="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/60 hover:bg-card transition-all">
        <div class="h-16 w-16 rounded-xl overflow-hidden bg-muted/30 border border-border/50 shrink-0 p-1">
          ${item.product.imageUrl 
            ? `<img src="${item.product.imageUrl}" class="h-full w-full object-contain" />`
            : `<div class="h-full w-full flex items-center justify-center text-[10px] font-bold text-teal-600">AURA</div>`}
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-1">
            <h4 class="font-heading font-semibold text-xs sm:text-sm text-foreground truncate leading-tight">
              ${item.product.name}
            </h4>
            <button type="button" 
              onclick="removeFromCart('${item.id}')"
              class="text-muted-foreground hover:text-red-500 p-1 transition-colors" title="Remover item">
              <i data-lucide="trash-2" class="size-3.5"></i>
            </button>
          </div>

          <span class="text-[10px] text-muted-foreground block mb-2">
            ${item.product.brand || ''} · ${item.product.presentation || ''}
          </span>

          <div class="flex items-center justify-between">
            <div class="flex items-center border border-border rounded-lg bg-surface">
              <button type="button" 
                onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})"
                class="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <i data-lucide="minus" class="size-3"></i>
              </button>
              <span class="w-7 text-center text-xs font-semibold text-foreground">${item.quantity}</span>
              <button type="button" 
                onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})"
                class="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <i data-lucide="plus" class="size-3"></i>
              </button>
            </div>

            <div class="text-right">
              <span class="font-bold text-xs sm:text-sm text-foreground">${formatBRL(itemTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  cartItemsContainer.innerHTML = itemsHtml;

  if (cartSubtotalEl) cartSubtotalEl.textContent = formatBRL(subtotal);
  if (cartShippingEl) {
    cartShippingEl.textContent = effectiveShipping === 0 ? 'Grátis' : formatBRL(effectiveShipping);
  }

  if (cartDiscountRow && cartDiscountEl) {
    if (discount > 0) {
      cartDiscountRow.classList.remove('hidden');
      cartDiscountEl.textContent = `- ${formatBRL(discount)}`;
    } else {
      cartDiscountRow.classList.add('hidden');
    }
  }

  if (cartTotalEl) cartTotalEl.textContent = formatBRL(total);
  lucide.createIcons();
}

function animateCartIcon() {
  const btn = document.getElementById('cart-drawer-trigger');
  if (btn) {
    btn.classList.add('animate-cart-bounce');
    setTimeout(() => btn.classList.remove('animate-cart-bounce'), 400);
  }
}

// Drawers & Modals
function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer && overlay) {
    overlay.classList.remove('hidden');
    drawer.classList.remove('translate-x-full');
    document.body.classList.add('overflow-hidden');
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer && overlay) {
    drawer.classList.add('translate-x-full');
    setTimeout(() => overlay.classList.add('hidden'), 300);
    document.body.classList.remove('overflow-hidden');
  }
}

// Product Details Modal
let modalProductQty = 1;

function openProductModal(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  modalProductQty = 1;
  const modal = document.getElementById('product-details-modal');
  const overlay = document.getElementById('product-modal-overlay');
  const content = document.getElementById('product-modal-content');

  if (!modal || !overlay || !content) return;

  const spec = SUBSTANCE_SPECS[product.categorySlug] || {
    title: 'Composto Biotecnológico de Alta Pureza',
    summary: 'Substância com padrão analítico certificado para estudos metabólicos e pesquisas bioquímicas.',
    storage: 'Conservar em local seco, fresco e ao abrigo da luz solar direta.'
  };

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;
  const pixPrice = calculatePixPrice(product.price);

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
      <!-- Image Section -->
      <div class="flex flex-col items-center justify-center rounded-2xl bg-muted/40 p-4 border border-border relative overflow-hidden">
        ${product.imageUrl 
          ? `<img src="${product.imageUrl}" alt="${product.name}" class="max-h-72 w-full object-contain rounded-xl" />`
          : getFallbackSVG(product.categorySlug)}
        
        <div class="absolute top-3 left-3 flex flex-col gap-1">
          ${hasDiscount ? `
            <span class="badge-discount pill-badge">
              <i data-lucide="tag" class="size-3"></i> -${discountPercent}% OFF
            </span>
          ` : ''}
          <span class="bg-teal-600 text-white pill-badge">
            <i data-lucide="shield-check" class="size-3"></i> Pureza HPLC 99%
          </span>
        </div>
      </div>

      <!-- Details Section -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2.5 py-0.5 rounded-full">
              ${product.brand || 'Laboratório Certificado'}
            </span>
            <span class="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              ${product.presentation || 'Dosagem Padrão'}
            </span>
          </div>

          <h2 class="font-heading text-2xl font-bold text-foreground mb-3 leading-tight">
            ${product.name}
          </h2>

          <div class="p-4 rounded-xl bg-muted/40 border border-border mb-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-extrabold text-foreground">
                ${formatBRL(product.price)}
              </span>
              ${hasDiscount ? `
                <span class="text-sm text-muted-foreground line-through">
                  ${formatBRL(product.compareAtPrice)}
                </span>
              ` : ''}
            </div>
            <div class="mt-1 flex items-center gap-2 text-xs">
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                ${formatBRL(pixPrice)} à vista no PIX (5% de desconto)
              </span>
              <span class="text-muted-foreground">· ${calculateInstallment(product.price)}</span>
            </div>
          </div>

          <!-- Scientific & Educational Information -->
          <div class="space-y-3 mb-5 text-xs text-secondary leading-relaxed">
            <div class="p-3 rounded-lg border border-border/70 bg-card">
              <h5 class="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <i data-lucide="microscope" class="size-3.5 text-teal-600"></i>
                Classificação Farmacêutica
              </h5>
              <p class="text-muted-foreground">${spec.title}</p>
            </div>

            <div class="p-3 rounded-lg border border-border/70 bg-card">
              <h5 class="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <i data-lucide="info" class="size-3.5 text-sky-600"></i>
                Mecanismo & Características
              </h5>
              <p class="text-muted-foreground">${product.shortDescription || spec.summary}</p>
            </div>

            <div class="p-3 rounded-lg border border-border/70 bg-card">
              <h5 class="font-bold text-foreground mb-1 flex items-center gap-1.5">
                <i data-lucide="thermometer-snowflake" class="size-3.5 text-indigo-600"></i>
                Armazenamento & Estabilidade
              </h5>
              <p class="text-muted-foreground">${spec.storage}</p>
            </div>
          </div>
        </div>

        <!-- Quantity & Add to Cart Action -->
        <div class="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-3">
          <div class="flex items-center border border-border rounded-xl bg-surface px-1 py-1 w-full sm:w-auto justify-between sm:justify-start">
            <button type="button" 
              onclick="if(modalProductQty > 1) { modalProductQty--; document.getElementById('modal-qty-val').textContent = modalProductQty; }"
              class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <i data-lucide="minus" class="size-4"></i>
            </button>
            <span id="modal-qty-val" class="w-10 text-center font-bold text-sm text-foreground">1</span>
            <button type="button" 
              onclick="modalProductQty++; document.getElementById('modal-qty-val').textContent = modalProductQty;"
              class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <i data-lucide="plus" class="size-4"></i>
            </button>
          </div>

          <button type="button" 
            onclick="addToCart('${product.id}', modalProductQty); closeProductModal(); openCartDrawer();"
            class="w-full py-3 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2">
            <i data-lucide="shopping-cart" class="size-4"></i>
            Adicionar ao Pedido
          </button>
        </div>
      </div>
    </div>
  `;

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  lucide.createIcons();
}

function closeProductModal() {
  const modal = document.getElementById('product-details-modal');
  const overlay = document.getElementById('product-modal-overlay');
  if (modal && overlay) {
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// Checkout Modal
function openCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  const overlay = document.getElementById('checkout-modal-overlay');
  const container = document.getElementById('checkout-modal-content');

  if (!modal || !overlay || !container) return;

  const subtotal = getCartSubtotal();
  const discount = calculateDiscount(subtotal);
  const effectiveShipping = (state.appliedCoupon && state.appliedCoupon.type === 'free_shipping') || subtotal >= 500
    ? 0 
    : state.shippingCost;
  const total = Math.max(0, subtotal - discount + effectiveShipping);

  container.innerHTML = `
    <div class="p-6 sm:p-8">
      <div class="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h3 class="font-heading font-bold text-xl text-foreground">Finalização do Pedido</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Selecione como prefere concluir sua solicitação</p>
        </div>
        <button type="button" onclick="closeCheckoutModal()" class="p-2 text-muted-foreground hover:text-foreground rounded-lg">
          <i data-lucide="x" class="size-5"></i>
        </button>
      </div>

      <!-- Order Summary Card -->
      <div class="p-4 rounded-xl bg-muted/40 border border-border mb-6">
        <h4 class="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Resumo do Pedido (${state.cart.length} itens)</h4>
        <div class="max-h-36 overflow-y-auto space-y-1.5 pr-2 mb-3">
          ${state.cart.map(item => `
            <div class="flex justify-between text-xs text-secondary">
              <span class="truncate flex-1">${item.quantity}x ${item.product.name}</span>
              <span class="font-medium shrink-0 ml-2">${formatBRL(item.product.price * item.quantity)}</span>
            </div>
          `).join('')}
        </div>
        <div class="pt-2 border-t border-border/80 flex justify-between items-baseline font-bold text-sm">
          <span>Total a Pagar:</span>
          <span class="text-lg text-teal-600 dark:text-teal-400 font-extrabold">${formatBRL(total)}</span>
        </div>
      </div>

      <!-- Action Choice -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- WhatsApp Option -->
        <button type="button" 
          onclick="sendWhatsAppOrder()"
          class="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all group flex flex-col justify-between">
          <div>
            <div class="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <i data-lucide="message-circle" class="size-5"></i>
            </div>
            <h5 class="font-heading font-bold text-sm text-foreground">Enviar via WhatsApp</h5>
            <p class="text-xs text-muted-foreground mt-1">
              Gera a mensagem com os produtos, quantidades e total formatados para o suporte direto.
            </p>
          </div>
          <span class="mt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            Conectar agora <i data-lucide="arrow-right" class="size-3.5"></i>
          </span>
        </button>

        <!-- Order in System Option -->
        <button type="button" 
          onclick="simulateAcademicOrder()"
          class="p-5 rounded-2xl border-2 border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10 text-left transition-all group flex flex-col justify-between">
          <div>
            <div class="size-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <i data-lucide="check-circle" class="size-5"></i>
            </div>
            <h5 class="font-heading font-bold text-sm text-foreground">Gerar Pedido no Sistema</h5>
            <p class="text-xs text-muted-foreground mt-1">
              Gera comprovante e protocolo imediato do pedido com código de rastreamento.
            </p>
          </div>
          <span class="mt-4 text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
            Emitir pedido <i data-lucide="arrow-right" class="size-3.5"></i>
          </span>
        </button>
      </div>
    </div>
  `;

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  lucide.createIcons();
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  const overlay = document.getElementById('checkout-modal-overlay');
  if (modal && overlay) {
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// WhatsApp Order Formatter
function sendWhatsAppOrder() {
  const subtotal = getCartSubtotal();
  const discount = calculateDiscount(subtotal);
  const total = Math.max(0, subtotal - discount + state.shippingCost);

  let msg = `*NOVO PEDIDO - AURA BIOPHARMA*\n\n`;
  msg += `Olá, gostaria de formalizar o seguinte pedido:\n`;
  msg += `------------------------------------\n`;
  
  state.cart.forEach(item => {
    msg += `• *${item.quantity}x* ${item.product.name} (${item.product.brand || 'BioPharma'} - ${item.product.presentation || ''})\n  Valor: ${formatBRL(item.product.price * item.quantity)}\n`;
  });

  msg += `------------------------------------\n`;
  msg += `*Subtotal:* ${formatBRL(subtotal)}\n`;
  if (discount > 0) {
    msg += `*Desconto:* -${formatBRL(discount)} (Cupom: ${state.appliedCoupon?.code})\n`;
  }
  msg += `*TOTAL ESTIMADO:* ${formatBRL(total)}\n\n`;
  msg += `_Mensagem gerada via catálogo Aura BioPharma._`;

  const phone = '5521967538035';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeCheckoutModal();
}

// Academic Simulation Receipt
function simulateAcademicOrder() {
  const container = document.getElementById('checkout-modal-content');
  if (!container) return;

  const orderNum = 'AB-' + Math.floor(100000 + Math.random() * 900000);
  const total = Math.max(0, getCartSubtotal() - calculateDiscount(getCartSubtotal()) + state.shippingCost);

  container.innerHTML = `
    <div class="p-6 sm:p-8 text-center">
      <div class="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
        <i data-lucide="check" class="size-8 stroke-[2.5]"></i>
      </div>

      <span class="text-xs font-bold text-teal-600 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full">
        Pedido Confirmado com Sucesso
      </span>

      <h3 class="font-heading font-extrabold text-2xl text-foreground mt-3 mb-1">
        Pedido #${orderNum} Registrado
      </h3>
      <p class="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
        Seu pedido foi registrado em nossa central e já está sendo preparado em embalagem climatizada.
      </p>

      <div class="p-4 rounded-2xl bg-muted/30 border border-border text-left max-w-sm mx-auto mb-6 space-y-2 text-xs">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Data/Hora:</span>
          <span class="font-semibold text-foreground">${new Date().toLocaleString('pt-BR')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Total:</span>
          <span class="font-bold text-teal-600 text-sm">${formatBRL(total)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Status do Rastreio:</span>
          <span class="font-semibold text-emerald-600">Embalagem Climatizada Iniciada</span>
        </div>
      </div>

      <div class="flex gap-3 justify-center">
        <button type="button" 
          onclick="state.cart = []; saveCart(); renderCart(); closeCheckoutModal(); showToast('Pedido finalizado com sucesso!', 'success');"
          class="py-2.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all">
          Concluir e Voltar
        </button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast flex items-center gap-3 py-3 px-4 rounded-xl shadow-xl text-sm font-medium border';

  let iconName = 'info';
  let styles = 'bg-surface text-foreground border-border';

  if (type === 'success') {
    iconName = 'check-circle-2';
    styles = 'bg-emerald-950 text-emerald-100 border-emerald-800 dark:bg-emerald-900/90';
  } else if (type === 'error') {
    iconName = 'alert-triangle';
    styles = 'bg-rose-950 text-rose-100 border-rose-800 dark:bg-rose-900/90';
  } else if (type === 'warning') {
    iconName = 'alert-circle';
    styles = 'bg-amber-950 text-amber-100 border-amber-800 dark:bg-amber-900/90';
  } else {
    iconName = 'bell';
    styles = 'bg-slate-900 text-slate-100 border-slate-700 dark:bg-slate-800';
  }

  toast.className += ` ${styles}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="size-4 shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}
