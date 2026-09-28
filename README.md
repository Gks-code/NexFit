# Aura BioPharma — Catálogo Científico & E-commerce Escolar

> **Projeto Acadêmico Multidisciplinar**: Biologia Aplicada, Farmacologia e Desenvolvimento Web Moderno.
> Inspirado na estrutura de catálogo e dados reais de mercado (peptídeos, emagrecedores GLP-1 e compostos hormonais), com identidade visual reformulada, recursos interativos adicionais e sem plágio visual.

---

## 🚀 Como Executar o Projeto

1. Abra a pasta do projeto no seu computador:
   `c:\Users\gross\OneDrive\Documentos\emgagrecedores brasil`
2. Dê um **duplo clique no arquivo `index.html`** para abrir em qualquer navegador (Google Chrome, Microsoft Edge, Firefox, Brave, Safari).
3. Pronto! Não necessita de instalação de dependências ou servidor backend, funcionando 100% no navegador com armazenamento local (`localStorage`).

---

## 🌟 O que foi melhorado em relação ao modelo original (Suprema Pharma)

Para evitar qualquer acusação de plágio e garantir uma nota máxima no colégio, o site foi completamente recriado com as seguintes melhorias:

1. **Nova Identidade Visual & Marca Própria ("Aura BioPharma")**:
   - Logomarca moderna com gradiente e ícone de biologia molecular.
   - Tipografia refinada (*Plus Jakarta Sans* e *Inter*).
   - Paleta de cores médica e tecnológica (Teal esmeralda, azul bio e ardósia espacial).
2. **Modo Escuro e Modo Claro (Dark/Light Mode)**:
   - Alternância com um clique no cabeçalho.
   - O modelo original não possuía suporte a tema escuro.
3. **Busca Inteligente com Autocompletação em Tempo Real**:
   - Menu suspenso com miniatura do produto, nome, dosagem e preço enquanto você digita.
4. **Filtro Avançado por Laboratórios & Fabricantes**:
   - Chips interativos para filtrar rapidamente por: *Biovant, Peptigen, Landerlan Gold, Cooper Pharma, ZPHC, Nacional*, etc.
5. **Filtro de Promoções & Alternância de Visualização**:
   - Checkbox "Apenas em Promoção".
   - Modos de visualização em **Grade (Grid)** ou **Lista Detalhada (List View)**.
6. **Carrinho de Compras Interativo (Slide-over Drawer)**:
   - Contador dinâmico com micro-animação de salto.
   - Controle de quantidades (+ e -) e remoção de itens.
   - Barra de progresso para **Frete Grátis** (meta de R$ 500).
   - Simulador de cálculo de Frete por CEP.
   - Sistema de cupons com validação real:
     - `COLEGIO10`: 10% de desconto escolar.
     - `AURA15`: 15% de desconto de boas-vindas.
     - `FRETEGRATIS`: Zera o frete.
7. **Modal de Detalhes Científicos (Quick View)**:
   - Ao clicar em "Detalhes" de qualquer produto, abre um modal com zoom da imagem, laudo de pureza HPLC 99%, classificação farmacológica, mecanismo celular e condições de conservação (cadeia de frio a 2°C - 8°C).
8. **Checkout com Dupla Opção**:
   - **Simular Demonstração Acadêmica**: Gera na hora um comprovante escolar com número de pedido, data e status do rastreio.
   - **Enviar via WhatsApp**: Formata automaticamente a mensagem completa com lista dos produtos e totais para o WhatsApp do atendimento.
9. **Ficha do Trabalho Escolar Integrada**:
   - Botão "Trabalho Escolar" no topo que abre uma ficha pedagógica pronta para ser apresentada aos professores e colegas.
10. **111 Produtos Reais Catalogados**:
    - Todos os 111 produtos originais categorizados (Emagrecedores, Peptídeos e Hormônios) com fotos, marcas e preços.
11. **Barra de Navegação Inferior para Dispositivos Móveis**:
    - Experiência fluida tipo aplicativo em smartphones.

---

## 📁 Estrutura dos Arquivos

* `index.html` — Estrutura HTML5 semântica e acessível.
* `styles.css` — Estilos customizados, efeitos glassmorphism, animações e responsividade.
* `app.js` — Lógica do catálogo, filtros reativos, carrinho e modais.
* `products-data.js` — Base de dados dos 111 produtos catalogados.
