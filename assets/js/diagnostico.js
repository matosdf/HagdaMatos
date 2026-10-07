/**
 * Autodiagnóstico de Inteligência Operacional e Risco
 * HM Presença & Performance
 */

(function () {
  'use strict';

  // --- DADOS DAS PERGUNTAS E EIXOS ---
  const QUIZ_DATA = {
    axes: {
      1: {
        id: 1,
        shortName: "Conhecimento Tácito",
        fullName: "Eixo 1: Conhecimento Tácito",
        solution: "Mapeamento de Conhecimento Tácito & Blindagem Operacional",
        bottleneckText: "O conhecimento crítico da empresa está retido na memória individual de colaboradores-chave. Desligamentos, férias ou entrada de novos talentos geram lentidão, perda de padrão e sobrecarga severa da liderança com dúvidas repetitivas.",
        questionIndices: [0, 1, 2]
      },
      2: {
        id: 2,
        shortName: "Acervo & Caos Documental",
        fullName: "Eixo 2: Acervo & Caos Documental",
        solution: "Auditoria Semântica com NLP & Higienização de Acervo",
        bottleneckText: "A equipe perde horas produtivas semanalmente navegando em pastas confusas, nuvens desordenadas e versões duplicadas. A falta de catalogação inteligente faz o time reinventar a roda com frequência.",
        questionIndices: [3, 4, 5]
      },
      3: {
        id: 3,
        shortName: "Captura de Rotinas",
        fullName: "Eixo 3: Captura de Rotinas",
        solution: "Esteira Ágil de Captura de Rotinas (Áudio WhatsApp → POPs vivos)",
        bottleneckText: "As decisões e regras práticas do negócio circulam em mensagens soltas e áudios voláteis que se perdem. Os manuais de processos ou inexistem ou são PDFs estáticos que ninguém abre no dia a dia.",
        questionIndices: [6, 7]
      },
      4: {
        id: 4,
        shortName: "Governança & IA",
        fullName: "Eixo 4: Governança & IA",
        solution: "Segundo Cérebro Corporativo Seguro (RAG Corporativo)",
        bottleneckText: "A empresa carece de um acervo corporativo integrado a inteligência artificial privada para buscas imediatas com citação de fontes, ou opera com ferramentas de IA públicas sem controle de segurança de dados e LGPD.",
        questionIndices: [8, 9]
      }
    },

    levels: [
      {
        min: 10,
        max: 18,
        level: 1,
        badgeClass: "level-1-badge",
        title: "Nível 1 — Operação em Risco Crítico",
        description: "Existe altíssima dependência de pessoas específicas e dispersão de informações. Qualquer desligamento ou imprevisto causa desestabilização direta na entrega, retrabalho diário e sobrecarga severa na liderança."
      },
      {
        min: 19,
        max: 27,
        level: 2,
        badgeClass: "level-2-badge",
        title: "Nível 2 — Operação Vulnerável a Pessoas",
        description: "A rotina opera, mas consome tempo excessivo com dúvidas repetitivas, lentidão no onboarding de novos colaboradores e fricção na busca de arquivos. A produtividade e a margem estão represadas pela falta de esteiras estruturadas de conhecimento."
      },
      {
        min: 28,
        max: 34,
        level: 3,
        badgeClass: "level-3-badge",
        title: "Nível 3 — Operação Digitalizada com Fricção",
        description: "A empresa já possui ferramentas digitais e acervo organizado em nuvem, mas ainda há ruídos na atualização contínua de processos e na autonomia dos times. O próximo passo é transformar a documentação em um sistema vivo e inteligente."
      },
      {
        min: 35,
        max: 40,
        level: 4,
        badgeClass: "level-4-badge",
        title: "Nível 4 — Operação Inteligente e Blindada",
        description: "Sua empresa possui processos maduros, boa governança de informações e busca eficiência de ponta. É o perfil ideal para implementar Segundo Cérebro Corporativo (IA/RAG Privado) e esteiras autônomas de alto impacto."
      }
    ],

    questions: [
      {
        axisId: 1,
        question: "Se o seu colaborador mais experiente saísse hoje, o que aconteceria?",
        options: [
          { points: 1, text: "Caos operacional e perda de clientes." },
          { points: 2, text: "Ficamos com dúvidas e lentidão por semanas." },
          { points: 3, text: "Boa parte está anotada, mas exige adaptação." },
          { points: 4, text: "Zero impacto: tudo está registrado e consultável." }
        ]
      },
      {
        axisId: 1,
        question: "Quanto tempo um novo colaborador demora para produzir com autonomia total?",
        options: [
          { points: 1, text: "Mais de 6 meses adivinhando a rotina." },
          { points: 2, text: "Entre 3 e 6 meses com muita supervisão." },
          { points: 3, text: "Cerca de 1 a 2 meses." },
          { points: 4, text: "Menos de 30 dias com onboarding estruturado." }
        ]
      },
      {
        axisId: 1,
        question: "A liderança é acionada para tirar dúvidas operacionais repetitivas?",
        options: [
          { points: 1, text: "Diariamente; os líderes viram gargalo da operação." },
          { points: 2, text: "Frequentemente na semana." },
          { points: 3, text: "Raramente, só em exceções reais." },
          { points: 4, text: "Quase nunca; o time consulta a base corporativa." }
        ]
      },
      {
        axisId: 2,
        question: "Como estão organizados os arquivos e contratos da empresa hoje?",
        options: [
          { points: 1, text: "Drives pessoais, nomes confusos e pastas \"Diversos\"." },
          { points: 2, text: "Em nuvem corporativa, mas desorganizada e com versões duplicadas." },
          { points: 3, text: "Pastas categorizadas manualmente por departamento." },
          { points: 4, text: "Base centralizada, catalogada e higienizada." }
        ]
      },
      {
        axisId: 2,
        question: "Quanto tempo a equipe gasta procurando documentos ou propostas antigas?",
        options: [
          { points: 1, text: "Horas por dia, muitas vezes sem achar o que procura." },
          { points: 2, text: "Entre 1 e 2 horas diárias no labirinto de arquivos." },
          { points: 3, text: "Menos de 30 minutos." },
          { points: 4, text: "Encontra qualquer informação em segundos por busca inteligente." }
        ]
      },
      {
        axisId: 2,
        question: "Com que frequência sua equipe refaz trabalhos do zero por não achar arquivos anteriores?",
        options: [
          { points: 1, text: "Quase toda semana reinventamos a roda." },
          { points: 2, text: "Regularmente em propostas e apresentações." },
          { points: 3, text: "Raramente acontece." },
          { points: 4, text: "Nunca; usamos acervos mestres auditados." }
        ]
      },
      {
        axisId: 3,
        question: "Onde as decisões e regras operacionais do dia a dia circulam na prática?",
        options: [
          { points: 1, text: "Em conversas e áudios no WhatsApp que somem dias depois." },
          { points: 2, text: "Em reuniões sem ata que ninguém documenta." },
          { points: 3, text: "Em e-mails e anotações dispersas." },
          { points: 4, text: "Em esteiras automatizadas que convertem rotinas em procedimentos." }
        ]
      },
      {
        axisId: 3,
        question: "Os manuais de processos (POPs) da sua empresa refletem a realidade atual?",
        options: [
          { points: 1, text: "Não temos nenhum manual oficial." },
          { points: 2, text: "Temos PDFs antigos de 80 páginas que ninguém abre." },
          { points: 3, text: "Estão razoavelmente atualizados, mas dão trabalho para manter." },
          { points: 4, text: "São vivos, enxutos e integrados à rotina de trabalho." }
        ]
      },
      {
        axisId: 4,
        question: "Como a equipe utiliza inteligência artificial (ChatGPT, etc.) hoje?",
        options: [
          { points: 1, text: "Uso livre e sem controle, com risco de dados e LGPD." },
          { points: 2, text: "Proibido ou não incentivado formalmente." },
          { points: 3, text: "Liberado com orientações gerais de uso." },
          { points: 4, text: "Usamos ambiente corporativo privado com regras de conformidade." }
        ]
      },
      {
        axisId: 4,
        question: "A sua empresa possui um \"Segundo Cérebro\" centralizado para consultas da equipe?",
        options: [
          { points: 1, text: "Não; cada um responde com base no que lembra." },
          { points: 2, text: "Temos manuais, mas a busca é lenta e manual." },
          { points: 3, text: "Testando ferramentas de IA, mas sem dados proprietários." },
          { points: 4, text: "Sim; IA privada (RAG) que cita fontes oficiais em segundos." }
        ]
      }
    ]
  };

  // --- ESTADO DO QUIZ ---
  const state = {
    currentStep: 0, // 0 = Intro, 1..10 = Perguntas, 11 = Lead Capture, 12 = Resultados
    answers: new Array(QUIZ_DATA.questions.length).fill(null),
    lead: {
      name: "",
      email: "",
      phone: "",
      companySize: ""
    }
  };

  // --- ELEMENTOS DO DOM ---
  const elements = {
    introView: document.getElementById("quiz-intro-view"),
    startBtn: document.getElementById("quiz-start-btn"),
    activeContainer: document.getElementById("quiz-active-container"),
    
    // Progress bar
    progressBar: document.getElementById("quiz-progress-bar"),
    progressStepText: document.getElementById("quiz-step-text"),
    progressAxisText: document.getElementById("quiz-axis-text"),
    
    // Question view
    questionBox: document.getElementById("quiz-question-box"),
    axisPill: document.getElementById("quiz-axis-pill"),
    questionTitle: document.getElementById("quiz-question-title"),
    optionsList: document.getElementById("quiz-options-list"),
    prevBtn: document.getElementById("quiz-prev-btn"),
    
    // Lead capture view
    leadCard: document.getElementById("quiz-lead-view"),
    leadForm: document.getElementById("quiz-lead-form"),
    inputName: document.getElementById("lead-name"),
    inputEmail: document.getElementById("lead-email"),
    inputPhone: document.getElementById("lead-phone"),
    formError: document.getElementById("quiz-form-error"),
    
    // Results view
    resultsCard: document.getElementById("quiz-results-view"),
    scoreNum: document.getElementById("results-score-num"),
    levelBadge: document.getElementById("results-level-badge"),
    resultsTitle: document.getElementById("results-title"),
    resultsDesc: document.getElementById("results-desc"),
    
    bottleneckAxisName: document.getElementById("bottleneck-axis-name"),
    bottleneckDesc: document.getElementById("bottleneck-desc"),
    bottleneckSolution: document.getElementById("bottleneck-solution"),
    
    axesContainer: document.getElementById("results-axes-container"),
    whatsappBtn: document.getElementById("results-whatsapp-btn"),
    restartBtn: document.getElementById("results-restart-btn")
  };

  // --- INICIALIZAÇÃO ---
  function init() {
    bindEvents();
    setupPhoneMask();
  }

  function bindEvents() {
    if (elements.startBtn) {
      elements.startBtn.addEventListener("click", startQuiz);
    }

    if (elements.prevBtn) {
      elements.prevBtn.addEventListener("click", handlePrevious);
    }

    if (elements.leadForm) {
      elements.leadForm.addEventListener("submit", handleLeadSubmit);
      
      // Radio selection style
      const sizeRadios = elements.leadForm.querySelectorAll('input[name="company_size"]');
      sizeRadios.forEach(radio => {
        radio.addEventListener("change", () => {
          document.querySelectorAll(".quiz-size-label").forEach(l => l.classList.remove("is-selected"));
          radio.closest(".quiz-size-label").classList.add("is-selected");
        });
      });
    }

    if (elements.restartBtn) {
      elements.restartBtn.addEventListener("click", restartQuiz);
    }
  }

  // --- MÁSCARA WHATSAPP (BRASIL) ---
  function setupPhoneMask() {
    if (!elements.inputPhone) return;

    elements.inputPhone.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);

      if (value.length > 10) {
        // (XX) XXXXX-XXXX
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      } else if (value.length > 6) {
        // (XX) XXXX-XXXX
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        value = value.replace(/^(\d*)$/, "($1");
      }
      e.target.value = value;
    });
  }

  // --- NAVEGAÇÃO DE PASSOS ---
  function startQuiz() {
    elements.introView.style.display = "none";
    elements.activeContainer.classList.add("is-visible");
    state.currentStep = 1;
    renderStep();
  }

  function handlePrevious() {
    if (state.currentStep > 1 && state.currentStep <= 10) {
      state.currentStep--;
      renderStep();
    }
  }

  function renderStep() {
    scrollToCard();

    // Se estiver entre 1 e 10: renderiza pergunta
    if (state.currentStep >= 1 && state.currentStep <= 10) {
      elements.questionBox.style.display = "block";
      elements.leadCard.style.display = "none";
      elements.resultsCard.style.display = "none";

      const qIndex = state.currentStep - 1;
      const questionData = QUIZ_DATA.questions[qIndex];
      const axisData = QUIZ_DATA.axes[questionData.axisId];

      // Atualiza barra de progresso
      const progressPercent = Math.round((qIndex / QUIZ_DATA.questions.length) * 100);
      elements.progressBar.style.width = progressPercent + "%";
      elements.progressStepText.textContent = `Pergunta ${state.currentStep} de ${QUIZ_DATA.questions.length}`;
      elements.progressAxisText.textContent = axisData.shortName;

      // Atualiza textos
      elements.axisPill.innerHTML = `<span></span> ${axisData.fullName}`;
      elements.questionTitle.textContent = questionData.question;

      // Habilita / Desabilita botão voltar
      elements.prevBtn.disabled = (state.currentStep === 1);

      // Renderiza alternativas
      renderOptions(questionData, qIndex);
    } 
    // Passo 11: Tela de Lead
    else if (state.currentStep === 11) {
      elements.progressBar.style.width = "100%";
      elements.progressStepText.textContent = "Conclusão";
      elements.progressAxisText.textContent = "Qualificação";
      
      elements.questionBox.style.display = "none";
      elements.leadCard.style.display = "block";
      elements.resultsCard.style.display = "none";
    } 
    // Passo 12: Resultados
    else if (state.currentStep === 12) {
      elements.activeContainer.classList.remove("is-visible");
      elements.resultsCard.style.display = "flex";
      renderResults();
    }
  }

  function renderOptions(questionData, qIndex) {
    elements.optionsList.innerHTML = "";
    const selectedValue = state.answers[qIndex];

    questionData.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option-btn" + (selectedValue === opt.points ? " is-selected" : "");
      btn.setAttribute("data-points", opt.points);

      btn.innerHTML = `
        <span class="quiz-option-indicator">${idx + 1}</span>
        <span class="quiz-option-text">${opt.text}</span>
      `;

      btn.addEventListener("click", function () {
        selectOption(qIndex, opt.points);
      });

      elements.optionsList.appendChild(btn);
    });
  }

  function selectOption(qIndex, points) {
    state.answers[qIndex] = points;

    // Feedback visual breve antes de avançar para fluidez premium
    const buttons = elements.optionsList.querySelectorAll(".quiz-option-btn");
    buttons.forEach(btn => {
      if (parseInt(btn.getAttribute("data-points"), 10) === points) {
        btn.classList.add("is-selected");
      } else {
        btn.classList.remove("is-selected");
      }
    });

    setTimeout(() => {
      state.currentStep++;
      renderStep();
    }, 220);
  }

  function scrollToCard() {
    const target = elements.activeContainer.classList.contains("is-visible") 
      ? elements.activeContainer 
      : elements.resultsCard;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // --- SUBMISSÃO DO LEAD ---
  function handleLeadSubmit(e) {
    e.preventDefault();

    const name = elements.inputName.value.trim();
    const email = elements.inputEmail.value.trim();
    const phone = elements.inputPhone.value.trim();
    const sizeRadio = elements.leadForm.querySelector('input[name="company_size"]:checked');

    if (!name || !email || !phone || !sizeRadio) {
      showError("Por favor, preencha todos os campos e selecione o tamanho da sua empresa.");
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Por favor, informe um endereço de e-mail corporativo válido.");
      return;
    }

    // Validação básica de telefone (mínimo 10 dígitos)
    const rawPhone = phone.replace(/\D/g, "");
    if (rawPhone.length < 10) {
      showError("Por favor, informe um número de WhatsApp válido com DDD.");
      return;
    }

    elements.formError.classList.remove("is-visible");

    state.lead = {
      name: name,
      email: email,
      phone: phone,
      companySize: sizeRadio.value
    };

    // Salva lead e respostas no localStorage para persistência local imediata
    try {
      localStorage.setItem("hm_diagnostico_lead", JSON.stringify({
        lead: state.lead,
        answers: state.answers,
        date: new Date().toISOString()
      }));
    } catch (err) {
      console.warn("LocalStorage indisponível:", err);
    }

    // Calcula resultados consolidados
    const results = calculateResults();

    // Disparo automático em background para Vercel API (Gravação Supabase + Meta WhatsApp Cloud API)
    const submitBtn = elements.leadForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Gerando seu laudo completo...";
    }

    fetch('/api/diagnostico', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lead: state.lead,
        answers: state.answers,
        results: results
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      console.log('[Automação Vercel] Dados registrados com sucesso:', data);
    })
    .catch(function(err) {
      console.warn('[Automação Vercel] Falha na comunicação com /api/diagnostico (offline ou local):', err);
    })
    .finally(function() {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Visualizar Meu Diagnóstico Completo →";
      }
    });

    state.currentStep = 12;
    renderStep();
  }

  function showError(msg) {
    elements.formError.textContent = msg;
    elements.formError.classList.add("is-visible");
  }

  // --- CÁLCULO E RENDERIZAÇÃO DOS RESULTADOS ---
  function calculateResults() {
    const totalScore = state.answers.reduce((acc, curr) => acc + (curr || 0), 0);

    // Identifica Nível Geral (10 a 40)
    let levelObj = QUIZ_DATA.levels[0];
    for (const lvl of QUIZ_DATA.levels) {
      if (totalScore >= lvl.min && totalScore <= lvl.max) {
        levelObj = lvl;
        break;
      }
    }

    // Normalização por Eixo para descobrir o Verdadeiro Gargalo
    // Eixos 1 e 2 possuem 3 perguntas (max 12). Eixos 3 e 4 possuem 2 perguntas (max 8).
    const axesStats = [];

    for (let axisId = 1; axisId <= 4; axisId++) {
      const axisConfig = QUIZ_DATA.axes[axisId];
      const qIndices = axisConfig.questionIndices;
      const axisScore = qIndices.reduce((sum, idx) => sum + (state.answers[idx] || 1), 0);
      const maxScore = qIndices.length * 4;
      const average = axisScore / qIndices.length; // Escala 1.0 a 4.0
      const percentage = Math.round(((average - 1) / 3) * 100); // 0% a 100% de maturidade

      axesStats.push({
        axisId: axisId,
        config: axisConfig,
        score: axisScore,
        maxScore: maxScore,
        average: average,
        percentage: Math.max(5, percentage) // mínimo 5% para visual agradável
      });
    }

    // Gargalo é o eixo com menor média aritmética
    // Ordenamos por average crescente; em caso de empate, mantém ordem dos eixos
    const sortedByWorst = [...axesStats].sort((a, b) => a.average - b.average);
    const bottleneck = sortedByWorst[0];

    return {
      totalScore,
      level: levelObj,
      axesStats,
      bottleneck
    };
  }

  function renderResults() {
    const results = calculateResults();

    // Placar Geral
    elements.scoreNum.textContent = results.totalScore;
    elements.levelBadge.className = `results-level-badge ${results.level.badgeClass}`;
    elements.levelBadge.textContent = results.level.title;
    elements.resultsTitle.textContent = results.level.title;
    elements.resultsDesc.textContent = results.level.description;

    // Card do Gargalo Principal
    elements.bottleneckAxisName.textContent = results.bottleneck.config.fullName;
    elements.bottleneckDesc.textContent = results.bottleneck.config.bottleneckText;
    elements.bottleneckSolution.textContent = results.bottleneck.config.solution;

    // Decomposição dos 4 Eixos
    elements.axesContainer.innerHTML = "";
    results.axesStats.forEach(axisStat => {
      const isBottleneck = (axisStat.axisId === results.bottleneck.axisId);
      const div = document.createElement("div");
      div.className = `axis-item ${isBottleneck ? "is-bottleneck" : ""}`;

      div.innerHTML = `
        <div class="axis-item-head">
          <span class="axis-item-title">${axisStat.config.shortName}</span>
          ${isBottleneck ? '<span class="axis-item-badge">Maior Gargalo</span>' : ''}
        </div>
        <div class="axis-bar-wrap">
          <div class="axis-bar-track">
            <div class="axis-bar-fill" style="width: ${axisStat.percentage}%;"></div>
          </div>
        </div>
        <div class="axis-item-foot">
          <span>${axisStat.score} de ${axisStat.maxScore} pts</span>
          <span>Maturidade: ${axisStat.percentage}%</span>
        </div>
      `;

      elements.axesContainer.appendChild(div);
    });

    // Configuração do Link de WhatsApp
    setupWhatsAppCTA(results);
  }

  function setupWhatsAppCTA(results) {
    const phoneHagda = "5512992006109";
    const lead = state.lead;

    const messageLines = [
      `Olá Hagda! Fiz o autodiagnóstico no site e gostaria de conversar sobre a operação da minha empresa.`,
      ``,
      `*Dados da Empresa:*`,
      `• Nome: ${lead.name}`,
      `• Porte: ${lead.companySize}`,
      `• E-mail: ${lead.email}`,
      `• WhatsApp: ${lead.phone}`,
      ``,
      `*Resultado do Diagnóstico:*`,
      `• Pontuação Total: ${results.totalScore}/40 pontos`,
      `• Classificação: ${results.level.title}`,
      `• Principal Ponto de Atenção: ${results.bottleneck.config.fullName}`,
      `• Solução Indicada: ${results.bottleneck.config.solution}`,
      ``,
      `Gostaria de entender como a HM pode nos ajudar a estruturar essa solução.`
    ];

    const encodedMsg = encodeURIComponent(messageLines.join("\n"));
    elements.whatsappBtn.href = `https://wa.me/${phoneHagda}?text=${encodedMsg}`;
  }

  function restartQuiz() {
    state.currentStep = 0;
    state.answers.fill(null);
    state.lead = { name: "", email: "", phone: "", companySize: "" };

    if (elements.leadForm) {
      elements.leadForm.reset();
      document.querySelectorAll(".quiz-size-label").forEach(l => l.classList.remove("is-selected"));
    }

    elements.resultsCard.style.display = "none";
    elements.activeContainer.classList.remove("is-visible");
    elements.introView.style.display = "block";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Disparo ao carregar o DOM
  document.addEventListener("DOMContentLoaded", init);
})();
