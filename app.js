/**
 * NEXFIT® - Application Logic
 * "PERFORMANCE SEM LIMITES"
 * Colors: Dark Carbon, Neon Electric Lime (#72E500), Metallic Chrome
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
  cart: JSON.parse(localStorage.getItem('nexfit_cart') || '[]'),
  appliedCoupon: null,
  shippingCost: 0,
  isDark: true // Dark theme default for NEXFIT
};

// Available Coupons
const COUPONS = {
  'NEXFIT10': { type: 'percent', value: 10, label: '10% de desconto NEXFIT' },
  'NEX15': { type: 'percent', value: 15, label: '15% de desconto de boas-vindas' },
  'COLEGIO10': { type: 'percent', value: 10, label: '10% de desconto especial' },
  'FRETEGRATIS': { type: 'free_shipping', value: 0, label: 'Frete Grátis garantido' },
  'NEX50': { type: 'fixed', value: 50, label: 'R$ 50,00 de desconto' }
};

// Scientific & technical descriptions
const SUBSTANCE_SPECS = {
  'emagrecedores': {
    title: 'Moduladores Metabólicos & Agonistas de GLP-1/GIP',
    summary: 'Compostos que mimetizam incretinas biológicas, regulando a saciedade e otimizando o gasto energético celular.',
    storage: 'Refrigeração controlada de 2°C a 8°C (manter ao abrigo da luz).'
  },
  'peptideos': {
    title: 'Peptídeos Biomiméticos de Alta Pureza',
    summary: 'Cadeias de aminoácidos de sinalização celular com certificação analítica HPLC > 99%.',
    storage: 'Conservar sob refrigeração. Após reconstituição estéril, utilizar no prazo indicado.'
  },
  'hormonios': {
    title: 'Compostos de Alta Performance & Hipertrofia',
    summary: 'Formulações esteroidais e moduladores endócrinos para estudos de hipertrofia muscular e densidade.',
    storage: 'Temperatura ambiente protegida de luz direta (15°C a 30°C).'
  }
};

// Helpers
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
  return price * 0.95; // 5% discount on PIX
}

// Pillar filter click handler
function filterByPillar(category) {
  state.activeCategory = category;
  state.currentPage = 1;
  document.querySelectorAll('.filter-tab').forEach(tab => {
    if (tab.dataset.category === category) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  renderProducts();
  const catEl = document.getElementById('catalogo');
  if (catEl) {
    catEl.scrollIntoView({ behavior: 'smooth' });
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initBrandsList();
  renderProducts();
  updateCategoryCounts();
  renderCart();
  setupEventListeners();
  setupLiveSearch();
  lucide.createIcons();
});

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
      class="brand-chip whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/10 transition-all ${state.activeBrand === 'all' ? 'active' : 'text-slate-400 hover:text-white hover:border-slate-500'}"
      data-brand="all">
      Todos os Laboratórios
    </button>
  `;

  sortedBrands.forEach(brand => {
    const isSelected = state.activeBrand === brand;
    html += `
      <button type="button" 
        class="brand-chip whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/10 transition-all ${isSelected ? 'active' : 'text-slate-400 hover:text-white hover:border-slate-500'}"
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
  let badgeColor = 'from-lime-500/20 to-emerald-500/20 text-[#72e500]';
  let label = 'NEXFIT Lab';

  if (categorySlug === 'emagrecedores') {
    iconName = 'flame';
    badgeColor = 'from-orange-500/20 to-lime-500/20 text-[#72e500]';
    label = 'GLP-1 / Queima';
  } else if (categorySlug === 'peptideos') {
    iconName = 'dna';
    badgeColor = 'from-lime-500/20 to-cyan-500/20 text-[#72e500]';
    label = 'Peptídeo HPLC';
  } else if (categorySlug === 'hormonios') {
    iconName = 'zap';
    badgeColor = 'from-lime-500/20 to-purple-500/20 text-[#72e500]';
    label = 'Hipertrofia & Força';
  }

  return `
    <div class="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br ${badgeColor} p-4 text-center select-none">
      <i data-lucide="${iconName}" class="size-12 mb-2 stroke-[1.6] opacity-90 text-[#72e500]"></i>
      <span class="text-[11px] font-bold tracking-wider uppercase opacity-90 text-white">${label}</span>
      <span class="text-[10px] text-lime-400 font-mono">HPLC Certified</span>
    </div>
  `;
}

// Template: Grid Product Card (NEXFIT Dark Carbon + Lime Neon)
function createProductCardGrid(product) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const pixPrice = calculatePixPrice(product.price);

  return `
    <div class="glass-card flex flex-col justify-between rounded-2xl overflow-hidden group border border-white/10 hover:border-[#72e500]/40" data-id="${product.id}">
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
              <i data-lucide="zap" class="size-3 fill-black"></i> Destaque
            </span>
          ` : ''}
        </div>

        <button type="button" 
          aria-label="Ver detalhes rápidos" 
          onclick="event.stopPropagation(); openProductModal('${product.id}')"
          class="absolute bottom-2 right-2 p-2 rounded-xl bg-black/80 hover:bg-[#72e500] hover:text-black text-white shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all">
          <i data-lucide="eye" class="size-4"></i>
        </button>
      </div>

      <div class="p-3.5 flex flex-col flex-1 justify-between gap-2.5 bg-[#15151c]/60">
        <div>
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-bold text-[#72e500] uppercase tracking-wider truncate">
              ${product.brand || 'NEXFIT Lab'}
            </span>
            <span class="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono shrink-0">
              ${product.presentation || 'Dose Padrão'}
            </span>
          </div>

          <h3 class="font-heading font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug cursor-pointer hover:text-[#72e500] transition-colors"
              onclick="openProductModal('${product.id}')">
            ${product.name}
          </h3>
        </div>

        <div class="pt-2 border-t border-white/10">
          <div class="flex flex-col">
            ${hasDiscount ? `
              <span class="text-[11px] text-slate-500 line-through">
                ${formatBRL(product.compareAtPrice)}
              </span>
            ` : ''}
            <div class="flex items-baseline gap-1.5">
              <span class="text-base sm:text-lg font-black text-white">
                ${formatBRL(product.price)}
              </span>
              <span class="text-[10px] text-[#72e500] font-bold">
                PIX (${formatBRL(pixPrice)})
              </span>
            </div>
            <span class="text-[11px] text-slate-400 font-medium">
              ${calculateInstallment(product.price)}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-5 gap-1.5">
            <button type="button" 
              onclick="openProductModal('${product.id}')"
              class="col-span-2 py-2 px-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1">
              Detalhes
            </button>
            <button type="button" 
              onclick="addToCart('${product.id}')"
              class="col-span-3 py-2 px-2 rounded-xl btn-nex-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5">
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
    <div class="glass-card list-view-card rounded-2xl border border-white/10 hover:border-[#72e500]/40" data-id="${product.id}">
      <div class="relative h-24 w-24 rounded-xl overflow-hidden bg-black/40 cursor-pointer shrink-0 border border-white/5" onclick="openProductModal('${product.id}')">
        ${getProductImage(product.imageUrl, product.categorySlug)}
      </div>

      <div class="flex flex-col justify-center min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-[#72e500] uppercase tracking-wider">
            ${product.brand || 'NEXFIT Lab'}
          </span>
          <span class="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400 font-mono">
            ${product.presentation || ''}
          </span>
        </div>

        <h3 class="font-heading font-bold text-base text-white truncate cursor-pointer hover:text-[#72e500]" onclick="openProductModal('${product.id}')">
          ${product.name}
        </h3>
        
        <p class="text-xs text-slate-400 mt-0.5 truncate">
          ${product.shortDescription || 'Composto verificado com laudo analítico de pureza e controle de lote.'}
        </p>

        <div class="flex items-center gap-2 mt-1 sm:hidden">
          <span class="font-bold text-base text-white">${formatBRL(product.price)}</span>
          <span class="text-xs text-[#72e500] font-bold">PIX 5% OFF</span>
        </div>
      </div>

      <div class="list-actions hidden sm:flex flex-col items-end justify-center gap-2 shrink-0">
        <div class="text-right">
          ${hasDiscount ? `
            <span class="text-xs text-slate-500 line-through block">
              ${formatBRL(product.compareAtPrice)}
            </span>
          ` : ''}
          <div class="text-lg font-black text-white">
            ${formatBRL(product.price)}
          </div>
          <span class="text-xs text-[#72e500] font-bold block">
            ${formatBRL(pixPrice)} à vista no PIX
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" 
            onclick="openProductModal('${product.id}')"
            class="p-2 rounded-xl border border-white/15 hover:bg-white/10 text-slate-300 transition-colors" title="Ver detalhes">
            <i data-lucide="eye" class="size-4"></i>
          </button>
          <button type="button" 
            onclick="addToCart('${product.id}')"
            class="py-2 px-3 rounded-xl btn-nex-primary text-xs font-bold transition-all flex items-center gap-1.5">
            <i data-lucide="shopping-cart" class="size-3.5"></i>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  `;
}

// Setup Event Listeners
function setupEventListeners() {
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
      btnGrid.classList.add('bg-[#72e500]', 'text-black');
      btnGrid.classList.remove('text-slate-400');
      btnList.classList.remove('bg-[#72e500]', 'text-black');
      btnList.classList.add('text-slate-400');
      renderProducts();
    });

    btnList.addEventListener('click', () => {
      state.viewMode = 'list';
      btnList.classList.add('bg-[#72e500]', 'text-black');
      btnList.classList.remove('text-slate-400');
      btnGrid.classList.remove('bg-[#72e500]', 'text-black');
      btnGrid.classList.add('text-slate-400');
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
  const cartClose = document.getElementById('close-cart-btn');
  const cartOverlay = document.getElementById('cart-overlay');

  if (cartTrigger) cartTrigger.addEventListener('click', openCartDrawer);
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
        calcShippingBtn.innerHTML = `<i data-lucide="loader-2" class="size-4 animate-spin text-[#72e500]"></i>`;
        setTimeout(() => {
          calcShippingBtn.innerHTML = `Calcular`;
          const subtotal = getCartSubtotal();
          if (subtotal >= 500) {
            state.shippingCost = 0;
            showToast('Parabéns! Frete Grátis Express para o seu CEP.', 'success');
          } else {
            state.shippingCost = 29.90;
            showToast('Frete Sedex Climatizado: R$ 29,90', 'info');
          }
          renderCart();
          lucide.createIcons();
        }, 500);
      } else {
        showToast('Digite um CEP válido com 8 dígitos', 'error');
      }
    });
  }

  // Checkout button inside cart -> Direct to WhatsApp 5521967538035
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
        <div class="p-3 text-center text-xs text-slate-400">
          Nenhum resultado direto para "${q}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    let html = `
      <div class="p-2 border-b border-white/10 text-[11px] font-bold text-[#72e500] uppercase tracking-wider flex justify-between items-center">
        <span>Sugestões NEXFIT</span>
        <span class="text-slate-400 font-mono">${matches.length} produtos</span>
      </div>
    `;

    matches.forEach(p => {
      html += `
        <div class="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
             onclick="openProductModal('${p.id}'); document.getElementById('search-autocomplete-dropdown').classList.add('hidden');">
          <div class="h-10 w-10 rounded-lg overflow-hidden bg-black/50 shrink-0 border border-white/10">
            ${p.imageUrl ? `<img src="${p.imageUrl}" class="h-full w-full object-contain" />` : `<div class="h-full w-full flex items-center justify-center text-xs font-bold text-[#72e500]">NEX</div>`}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-bold text-white truncate">${p.name}</h4>
            <span class="text-[10px] text-slate-400">${p.brand || ''} · ${p.presentation || ''}</span>
          </div>
          <div class="text-right shrink-0">
            <span class="text-xs font-bold text-[#72e500]">${formatBRL(p.price)}</span>
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  });

  // Hide dropdown on click outside
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
  localStorage.setItem('nexfit_cart', JSON.stringify(state.cart));
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
      freeShippingText.innerHTML = `⚡ <strong>NEXFIT BÔNUS:</strong> Você ganhou <strong>Frete Grátis</strong>!`;
      freeShippingBar.style.backgroundColor = '#72e500';
      freeShippingBar.style.boxShadow = '0 0 10px #72e500';
    } else {
      const remaining = needed - subtotal;
      freeShippingText.innerHTML = `Faltam <strong>${formatBRL(remaining)}</strong> para <strong>Frete Grátis</strong>`;
      freeShippingBar.style.backgroundColor = '#58b300';
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
      <div class="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-[#16161d] hover:border-[#72e500]/30 transition-all">
        <div class="h-16 w-16 rounded-xl overflow-hidden bg-black/50 border border-white/5 shrink-0 p-1">
          ${item.product.imageUrl 
            ? `<img src="${item.product.imageUrl}" class="h-full w-full object-contain" />`
            : `<div class="h-full w-full flex items-center justify-center text-[10px] font-black text-[#72e500]">NEXFIT</div>`}
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-1">
            <h4 class="font-heading font-bold text-xs sm:text-sm text-white truncate leading-tight">
              ${item.product.name}
            </h4>
            <button type="button" 
              onclick="removeFromCart('${item.id}')"
              class="text-slate-500 hover:text-red-400 p-1 transition-colors" title="Remover item">
              <i data-lucide="trash-2" class="size-3.5"></i>
            </button>
          </div>

          <span class="text-[10px] text-slate-400 block mb-2 font-mono">
            ${item.product.brand || ''} · ${item.product.presentation || ''}
          </span>

          <div class="flex items-center justify-between">
            <div class="flex items-center border border-white/15 rounded-lg bg-black/40">
              <button type="button" 
                onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})"
                class="size-6 flex items-center justify-center text-slate-400 hover:text-white">
                <i data-lucide="minus" class="size-3"></i>
              </button>
              <span class="w-7 text-center text-xs font-bold text-white">${item.quantity}</span>
              <button type="button" 
                onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})"
                class="size-6 flex items-center justify-center text-slate-400 hover:text-white">
                <i data-lucide="plus" class="size-3"></i>
              </button>
            </div>

            <div class="text-right">
              <span class="font-black text-xs sm:text-sm text-[#72e500]">${formatBRL(itemTotal)}</span>
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

// Drawer Open/Close
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
    title: 'Composto Biotecnológico de Alta Performance',
    summary: 'Substância com padrão analítico certificado para estudos de alto rendimento físico.',
    storage: 'Conservar em local seco, fresco e ao abrigo da luz solar direta.'
  };

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;
  const pixPrice = calculatePixPrice(product.price);

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8 bg-[#111116] text-white">
      <!-- Image Section -->
      <div class="flex flex-col items-center justify-center rounded-2xl bg-black/60 p-4 border border-white/10 relative overflow-hidden">
        ${product.imageUrl 
          ? `<img src="${product.imageUrl}" alt="${product.name}" class="max-h-72 w-full object-contain rounded-xl" />`
          : getFallbackSVG(product.categorySlug)}
        
        <div class="absolute top-3 left-3 flex flex-col gap-1">
          ${hasDiscount ? `
            <span class="badge-discount pill-badge">
              <i data-lucide="tag" class="size-3"></i> -${discountPercent}% OFF
            </span>
          ` : ''}
          <span class="bg-[#72e500] text-black font-extrabold pill-badge">
            <i data-lucide="shield-check" class="size-3"></i> Pureza HPLC 99%
          </span>
        </div>
      </div>

      <!-- Details Section -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold text-[#72e500] uppercase tracking-widest bg-[#72e500]/10 border border-[#72e500]/30 px-2.5 py-0.5 rounded-full">
              ${product.brand || 'NEXFIT Lab'}
            </span>
            <span class="text-xs font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              ${product.presentation || 'Dosagem Padrão'}
            </span>
          </div>

          <h2 class="font-heading text-2xl font-black text-white mb-3 leading-tight">
            ${product.name}
          </h2>

          <div class="p-4 rounded-xl bg-black/50 border border-white/10 mb-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-black text-white">
                ${formatBRL(product.price)}
              </span>
              ${hasDiscount ? `
                <span class="text-sm text-slate-500 line-through">
                  ${formatBRL(product.compareAtPrice)}
                </span>
              ` : ''}
            </div>
            <div class="mt-1 flex items-center gap-2 text-xs">
              <span class="text-[#72e500] font-bold">
                ${formatBRL(pixPrice)} à vista no PIX (5% OFF)
              </span>
              <span class="text-slate-400">· ${calculateInstallment(product.price)}</span>
            </div>
          </div>

          <!-- Specs -->
          <div class="space-y-3 mb-5 text-xs text-slate-300 leading-relaxed">
            <div class="p-3 rounded-lg border border-white/10 bg-white/5">
              <h5 class="font-bold text-white mb-1 flex items-center gap-1.5">
                <i data-lucide="zap" class="size-3.5 text-[#72e500]"></i>
                Classificação & Linha
              </h5>
              <p class="text-slate-400">${spec.title}</p>
            </div>

            <div class="p-3 rounded-lg border border-white/10 bg-white/5">
              <h5 class="font-bold text-white mb-1 flex items-center gap-1.5">
                <i data-lucide="activity" class="size-3.5 text-[#72e500]"></i>
                Mecanismo de Ação
              </h5>
              <p class="text-slate-400">${product.shortDescription || spec.summary}</p>
            </div>

            <div class="p-3 rounded-lg border border-white/10 bg-white/5">
              <h5 class="font-bold text-white mb-1 flex items-center gap-1.5">
                <i data-lucide="snowflake" class="size-3.5 text-[#72e500]"></i>
                Conservação
              </h5>
              <p class="text-slate-400">${spec.storage}</p>
            </div>
          </div>
        </div>

        <!-- Quantity & Add to Cart Action -->
        <div class="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
          <div class="flex items-center border border-white/20 rounded-xl bg-black/40 px-1 py-1 w-full sm:w-auto justify-between sm:justify-start">
            <button type="button" 
              onclick="if(modalProductQty > 1) { modalProductQty--; document.getElementById('modal-qty-val').textContent = modalProductQty; }"
              class="size-8 flex items-center justify-center text-slate-400 hover:text-white">
              <i data-lucide="minus" class="size-4"></i>
            </button>
            <span id="modal-qty-val" class="w-10 text-center font-bold text-sm text-white">1</span>
            <button type="button" 
              onclick="modalProductQty++; document.getElementById('modal-qty-val').textContent = modalProductQty;"
              class="size-8 flex items-center justify-center text-slate-400 hover:text-white">
              <i data-lucide="plus" class="size-4"></i>
            </button>
          </div>

          <button type="button" 
            onclick="addToCart('${product.id}', modalProductQty); closeProductModal(); openCartDrawer();"
            class="w-full py-3 px-6 rounded-xl btn-nex-primary text-black font-extrabold shadow-lg transition-all flex items-center justify-center gap-2">
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

// Direct WhatsApp Order Formatter (Sent to 5521967538035)
function sendWhatsAppOrder() {
  const subtotal = getCartSubtotal();
  const discount = calculateDiscount(subtotal);
  const total = Math.max(0, subtotal - discount + state.shippingCost);

  let msg = `*NOVO PEDIDO - NEXFIT®*\n`;
  msg += `⚡ *PERFORMANCE SEM LIMITES*\n\n`;
  msg += `Olá! Gostaria de finalizar o seguinte pedido:\n`;
  msg += `------------------------------------\n`;
  
  state.cart.forEach(item => {
    msg += `• *${item.quantity}x* ${item.product.name}\n  (${item.product.brand || 'NEXFIT Lab'} - ${item.product.presentation || ''})\n  Valor: ${formatBRL(item.product.price * item.quantity)}\n`;
  });

  msg += `------------------------------------\n`;
  msg += `*Subtotal:* ${formatBRL(subtotal)}\n`;
  if (discount > 0) {
    msg += `*Desconto:* -${formatBRL(discount)} (Cupom: ${state.appliedCoupon?.code})\n`;
  }
  if (state.shippingCost > 0) {
    msg += `*Frete Sedex:* ${formatBRL(state.shippingCost)}\n`;
  } else {
    msg += `*Frete:* Grátis\n`;
  }
  msg += `*TOTAL ESTIMADO:* ${formatBRL(total)}\n\n`;
  msg += `_Enviado pelo catálogo oficial NEXFIT®_`;

  const phone = '5521967538035';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast flex items-center gap-3 py-3 px-4 rounded-xl shadow-2xl text-xs sm:text-sm font-bold border backdrop-blur-md';

  let iconName = 'info';
  let styles = 'bg-[#15151c] text-white border-white/10';

  if (type === 'success') {
    iconName = 'check-circle-2';
    styles = 'bg-[#111812] text-[#72e500] border-[#72e500]/40 shadow-[0_0_20px_rgba(114,229,0,0.2)]';
  } else if (type === 'error') {
    iconName = 'alert-triangle';
    styles = 'bg-[#1f1113] text-rose-300 border-rose-500/40';
  } else if (type === 'warning') {
    iconName = 'alert-circle';
    styles = 'bg-[#221c10] text-amber-300 border-amber-500/40';
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
