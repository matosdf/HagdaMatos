/**
 * Autodiagnóstico de Inteligência Operacional e Risco
 * HM Presença & Performance
 */

(async function () {
  'use strict';

  // --- DADOS DAS PERGUNTAS E EIXOS ---
  const configResponse = await fetch('/assets/data/diagnostico.json');
  if (!configResponse.ok) throw new Error('Configuração do diagnóstico indisponível.');
  const QUIZ_DATA = await configResponse.json();

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
    .then(function(res) { if (!res.ok) throw new Error('Falha ao enviar diagnóstico.'); return res.json(); })
    .then(function(data) {
      if (!data.savedToDb) throw new Error('Diagnóstico não registrado no banco.');
    })
    .catch(function(err) {
      const notice = document.createElement('p'); notice.className = 'quiz-form-error is-visible'; notice.textContent = 'Seu resultado está disponível, mas não conseguimos registrar o contato. Envie o resultado pelo botão de WhatsApp.'; elements.resultsCard.appendChild(notice);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})().catch(function () {
  const button = document.getElementById('quiz-start-btn');
  if (button) { button.disabled = true; button.textContent = 'Diagnóstico indisponível. Atualize a página ou fale com a HM.'; }
});
