/* ============================================================
   Гэдж // Партнёрка — логика страницы
   1) CTA-ссылки из config.js (константа TG_CONTACT)
   2) Калькулятор дохода — воронка бота, допущения в config.js (ASSUMPTIONS)
   3) Терминальный набор хука в хиро
   4) Lenis + GSAP ScrollTrigger: появления секций, счётчики сводки
   Всё уважает prefers-reduced-motion: reduce.
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.GADGE_CONFIG || {};
  var TG = CFG.TG_CONTACT || '#';
  var A = CFG.ASSUMPTIONS || null;
  var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';

  /* ---------- 1. CTA: все кнопки из одной константы ---------- */

  var ctas = document.querySelectorAll('.js-cta');
  for (var i = 0; i < ctas.length; i++) {
    ctas[i].setAttribute('href', TG);
    ctas[i].setAttribute('target', '_blank');
    ctas[i].setAttribute('rel', 'noopener');
  }

  /* ---------- 2. Калькулятор (воронка бота) ---------- */
  // Модель месяца:
  //   подписчики_бота = охват × упоминания × CTR_TO_BOT[аудитория]
  //   покупатели      = подписчики × BUYER_CONV[аудитория]
  //   выручка         = покупатели × AVG_CHECK[аудитория]
  //   прибыль         = выручка × MARGIN
  //   доход партнёра  = прибыль × PARTNER_SHARE
  // Все константы — в js/config.js, сняты с живого магазина (первые 15 дней).

  var reachRange = document.getElementById('calcReachRange');
  var reachNum = document.getElementById('calcReach');
  var mentRange = document.getElementById('calcMentionsRange');
  var mentNum = document.getElementById('calcMentions');
  var outSubs = document.getElementById('calcSubs');
  var outRevenue = document.getElementById('calcRevenue');
  var outIncome = document.getElementById('calcIncome');
  var toggleBtns = document.querySelectorAll('.toggle-btn');
  var audienceType = 'general';

  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function clampInt(v, min, max) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = min;
    return Math.max(min, Math.min(max, v));
  }

  function calcFunnel(reach, mentions, type) {
    var subs = reach * mentions * A.CTR_TO_BOT[type];
    var buyers = subs * A.BUYER_CONV[type];
    var revenue = buyers * A.AVG_CHECK[type];
    var profit = revenue * A.MARGIN;
    var income = profit * A.PARTNER_SHARE;
    return { subs: subs, revenue: revenue, income: income };
  }

  // Анимация счётчиков результата (при reduced-motion — мгновенно)
  var counters = {};
  var tweens = {};

  function setNumber(el, value, prefix) {
    if (!el) return;
    var from = (counters[el.id] != null) ? counters[el.id] : value;
    if (tweens[el.id]) { tweens[el.id].kill(); tweens[el.id] = null; }
    if (hasGSAP && motionOK && from !== value) {
      var obj = { v: from };
      tweens[el.id] = window.gsap.to(obj, {
        v: value,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function () {
          counters[el.id] = obj.v;
          el.textContent = (prefix || '') + fmt(obj.v);
        }
      });
    } else {
      counters[el.id] = value;
      el.textContent = (prefix || '') + fmt(value);
    }
  }

  function renderCalc() {
    if (!A || !reachNum || !mentNum) return;
    var reach = clampInt(reachNum.value, 0, 10000000);
    var mentions = clampInt(mentNum.value, 0, 1000);
    var r = calcFunnel(reach, mentions, audienceType);
    setNumber(outSubs, r.subs, '');
    setNumber(outRevenue, r.revenue, '$');
    setNumber(outIncome, r.income, '');
  }

  function bindPair(range, num) {
    if (!range || !num) return;
    range.addEventListener('input', function () {
      num.value = range.value;
      renderCalc();
    });
    num.addEventListener('input', function () {
      var v = parseInt(num.value, 10);
      if (!isNaN(v)) range.value = v; // range сам зажмёт в свои min/max
      renderCalc();
    });
  }

  if (A && reachNum && mentNum) {
    bindPair(reachRange, reachNum);
    bindPair(mentRange, mentNum);
    for (var b = 0; b < toggleBtns.length; b++) {
      toggleBtns[b].addEventListener('click', function () {
        for (var k = 0; k < toggleBtns.length; k++) {
          toggleBtns[k].classList.remove('is-active');
          toggleBtns[k].setAttribute('aria-pressed', 'false');
        }
        this.classList.add('is-active');
        this.setAttribute('aria-pressed', 'true');
        audienceType = this.getAttribute('data-aud') || 'general';
        renderCalc();
      });
    }
    renderCalc();
  }

  /* ---------- 3. Терминальный набор хука ---------- */

  var heroTitle = document.getElementById('heroTitle');
  var typeLines = heroTitle ? heroTitle.querySelectorAll('[data-type]') : [];
  var heroFollow = document.querySelectorAll('[data-hero-follow]');

  function showHeroFollow() {
    if (hasGSAP && motionOK && heroFollow.length) {
      window.gsap.to(heroFollow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 });
    }
  }

  if (motionOK && typeLines.length) {
    // зарезервировать высоту, чтобы страница не прыгала при наборе
    heroTitle.style.minHeight = heroTitle.offsetHeight + 'px';
    if (hasGSAP && heroFollow.length) {
      window.gsap.set(heroFollow, { autoAlpha: 0, y: 14 });
    }
    var texts = [];
    for (var t = 0; t < typeLines.length; t++) {
      texts.push(typeLines[t].textContent);
      typeLines[t].textContent = '';
    }
    var li = 0;
    var typeNext = function () {
      if (li >= typeLines.length) {
        heroTitle.classList.add('type-done');
        typeLines[typeLines.length - 1].classList.add('is-done');
        showHeroFollow();
        return;
      }
      var line = typeLines[li];
      var text = texts[li];
      var ci = 0;
      line.classList.add('is-typing');
      var timer = setInterval(function () {
        ci++;
        line.textContent = text.slice(0, ci);
        if (ci >= text.length) {
          clearInterval(timer);
          line.classList.remove('is-typing');
          li++;
          setTimeout(typeNext, 240);
        }
      }, 26);
    };
    setTimeout(typeNext, 350);
    // страховка: если набор где-то оборвался, первый экран всё равно покажет
    // подзаголовок и кнопку — пустой хиро хуже любой анимации
    setTimeout(showHeroFollow, 4200);
  }

  /* ---------- 4. Скролл-механика: Lenis + ScrollTrigger ---------- */

  if (hasGSAP && hasST && motionOK) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    var lenis = null;
    if (hasLenis) {
      lenis = new window.Lenis({
        duration: 1.1,
        easing: function (x) { return 1 - Math.pow(2, -10 * x); } // expo.out, без пружин
      });
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    }

    // плавные якоря с поправкой на фикс-навбар
    var anchors = document.querySelectorAll('a[href^="#"]');
    var anchorHandler = function (e) {
      var id = this.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) { lenis.scrollTo(target, { offset: -76 }); }
      else { target.scrollIntoView({ behavior: 'smooth' }); }
    };
    for (var an = 0; an < anchors.length; an++) {
      anchors[an].addEventListener('click', anchorHandler);
    }

    // появления секций: IntersectionObserver — надёжнее, чем ScrollTrigger поверх Lenis.
    // Элементы прячутся ТОЛЬКО после того, как наблюдатель реально встал:
    // если что-то пойдёт не так, контент остаётся видимым, а не исчезает навсегда.
    var reveals = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            entries[e].target.classList.add('is-in');
            io.unobserve(entries[e].target);
          }
        }
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
      for (var rv = 0; rv < reveals.length; rv++) {
        reveals[rv].classList.add('is-armed');
        io.observe(reveals[rv]);
      }
      // страховка: что не попало в наблюдатель за 2.5 с — показать
      setTimeout(function () {
        for (var s = 0; s < reveals.length; s++) { reveals[s].classList.add('is-in'); }
      }, 2500);
    }

    // счётчики сводки в финале
    var counts = document.querySelectorAll('[data-count]');
    for (var c = 0; c < counts.length; c++) {
      (function (el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var obj = { v: 0 };
        window.gsap.to(obj, {
          v: target,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: function () { el.textContent = fmt(obj.v); }
        });
      })(counts[c]);
    }

    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
    }
  }
})();
