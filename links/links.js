/* Bayan AI — QR links directory (https://www.bayanai.tech/links)
 * One place to change every link, the form endpoint and the Arabic text.
 * An empty link hides its button, so placeholders never show as broken links. */
(function () {
  'use strict';

  var CONFIG = {
    // Cloudflare Worker that stores + emails contact messages (workers/links-api).
    // Leave empty until deployed: the form then falls back to opening an email.
    WORKER_URL: '',
    // Cloudflare Turnstile site key (public). Empty = no widget.
    TURNSTILE_SITEKEY: '',
    FALLBACK_EMAIL: 'info@bayanai.tech',

    LINKS: {
      // Office 44, Authority for SME Development, Muscat — same pin as the bayan.edu.om footer map
      maps: 'https://www.google.com/maps/search/?api=1&query=23.5985833%2C58.4276111',
      solutions: '/solutions',
      website: '/',
      whatsapp: 'https://wa.me/96872251059',
      phone: 'tel:+96872251059',
      vcard: '/links/bayan-ai.vcf',
      // Socials — TODO: fill in. Empty ones stay hidden.
      x: 'https://x.com/Medresearch_om',
      linkedin: 'https://www.linkedin.com/company/bayan-ai-technologies/',
      instagram: 'https://www.instagram.com/bayanaitech/',
      youtube: 'https://www.youtube.com/channel/UC3ZCsfUsoKGmvgJvrF6HWAw',
      snapchat: '',
      tiktok: '',
      telegram: 'https://t.me/BayanMedEd',
      whatsappChannel: '',
      academy: 'https://www.medresearch-academy.om/'
    }
  };

  /* ---------- Arabic text for static elements (English is read from the HTML) ---------- */
  var AR = {
    // shared
    back: 'رجوع',
    foot: '© 2026 Bayan AI Technologies LLC · مسقط، سلطنة عُمان',
    // home
    title_home: 'Bayan AI Technologies | روابطنا',
    welcome: 'أهلاً بكم',
    tagline: 'حيث يلتقي الطب <em>بالذكاء.</em>',
    about: 'من نحن',
    about_sub: 'تعرّف علينا وعلى ما نقدّمه',
    solutions: 'حلولنا',
    solutions_sub: 'أدوات ذكاء اصطناعي للرعاية الصحية والتعليم والبحث العلمي',
    find: 'موقعنا',
    find_sub: 'افتح موقعنا في خرائط Google',
    contact: 'تواصل معنا',
    contact_sub: 'أرسل لنا رسالة وسنعود إليك',
    socials: 'حساباتنا',
    socials_sub: 'تابعونا على منصات التواصل الاجتماعي',
    whatsapp: 'واتساب',
    call: 'اتصال',
    save: 'حفظ جهة الاتصال',
    website: 'زيارة موقعنا الإلكتروني',
    // about
    title_about: 'من نحن | Bayan AI Technologies',
    story: 'قصتنا',
    about_h1: 'جذورنا في عُمان. <em>وغايتنا الإنسان.</em>',
    about_p1: 'Bayan AI Technologies شركة تقنية صحية مقرها مسقط. نجمع بين الخبرة السريرية والبحث العلمي وتطوير البرمجيات لخدمة العمل اليومي في الرعاية الصحية والتعليم.',
    what_h: 'ماذا نقدّم',
    what_p: 'نطوّر حلولاً في التعليم الطبي، واللغة الإنجليزية للتمريض، وممارسات ما حول العمليات الجراحية، والبحث العلمي، واللغة السريرية العربية، والبيانات الصحية المفتوحة.',
    founder_role: 'المؤسس والرئيس التنفيذي · طبيب وباحث',
    founder_name: 'د. عبدالله العلوي',
    founder_p: 'أسس الشركةَ الطبيبُ والباحث د. عبدالله العلوي، بطموح بسيط: أن نساعد الناس على التعلّم والعمل وصناعة المعرفة بوضوح أكبر.',
    academy_p: 'MedResearch Academy مبادرتنا التعليمية غير الربحية للبحث والتعليم والابتكار. تشارك الأكاديمية المعرفة والتعليم، بينما تطوّر Bayan AI Technologies الحلول التقنية.',
    backers_h: 'داعمو مسيرتنا',
    backer_sme: 'بدعم من هيئة تنمية المؤسسات الصغيرة والمتوسطة',
    backer_ffo: 'باستثمار من صندوق عُمان المستقبل',
    collab_h: 'معرفة محلية. اكتشاف مشترك.',
    collab_p: 'نرحّب بالجامعات والمؤسسات الصحية والمجموعات البحثية المهتمة بالتبادل العلمي والتقييم المشترك.',
    see_solutions: 'استعرض حلولنا',
    // socials
    title_socials: 'حساباتنا | Bayan AI Technologies',
    follow: 'تابعونا',
    socials_h1: 'حساباتنا على التواصل الاجتماعي',
    socials_p: 'تابعونا لمعرفة آخر الأخبار والأبحاث والأدوات الجديدة.',
    s_x: 'الأخبار والتحديثات',
    s_linkedin: 'التحديثات المهنية',
    s_instagram: 'صور وقصص',
    s_youtube: 'تعلّم وأبحاث',
    s_whatsapp: 'تحدّث معنا مباشرة',
    s_snapchat: 'لقطات يومية',
    s_tiktok: 'مقاطع قصيرة',
    s_telegram: 'قناة بيان للتعليم الطبي',
    s_channel: 'تابع قناتنا',
    s_academy_t: 'MedResearch Academy',
    s_academy: 'مبادرتنا التعليمية',
    // contact
    title_contact: 'تواصل معنا | Bayan AI Technologies',
    get_in_touch: 'تواصل معنا',
    contact_h1: 'راسلنا',
    contact_p: 'اترك بياناتك ورسالة قصيرة، وسيتواصل معك فريقنا.',
    f_name: 'الاسم الكامل',
    f_email: 'البريد الإلكتروني',
    f_phone: 'الهاتف / واتساب',
    f_org: 'الجهة',
    f_topic: 'الموضوع',
    f_message: 'الرسالة',
    opt: '(اختياري)',
    t_general: 'استفسار عام',
    t_partner: 'شراكة أو تعاون',
    t_demo: 'عرض توضيحي لأحد منتجاتنا',
    t_research: 'بحث علمي',
    t_other: 'أخرى',
    send: 'إرسال الرسالة',
    privacy: 'نستخدم بياناتك فقط للرد عليك.',
    done_h: 'شكراً لك!',
    done_p: 'وصلتنا رسالتك، وسنتواصل معك قريباً.',
    home: 'العودة للرئيسية'
  };

  /* ---------- dynamic messages ---------- */
  var MSG = {
    en: {
      sending: 'Sending…',
      required: 'Please fill in your name, email and message.',
      email: 'Please enter a valid email address.',
      captcha: 'Please complete the security check.',
      rate: 'Too many messages. Please try again in a few minutes.',
      failed: 'Sorry, something went wrong. Please try again, or message us on WhatsApp.',
      mailto: 'Your email app will open with your message ready to send.'
    },
    ar: {
      sending: 'جارٍ الإرسال…',
      required: 'يرجى كتابة الاسم والبريد الإلكتروني والرسالة.',
      email: 'يرجى إدخال بريد إلكتروني صحيح.',
      captcha: 'يرجى إكمال التحقق الأمني.',
      rate: 'رسائل كثيرة. يرجى المحاولة مجدداً بعد بضع دقائق.',
      failed: 'عذراً، حدث خطأ. يرجى المحاولة مجدداً أو مراسلتنا عبر واتساب.',
      mailto: 'سيُفتح تطبيق البريد ورسالتك جاهزة للإرسال.'
    }
  };

  var lang = 'en';
  var EN = {}; // English captured from the HTML on load

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* storage blocked: ignore */ }
    return null;
  }

  function msg(key) { return (MSG[lang] || MSG.en)[key]; }

  /* ---------- links ---------- */
  function applyLinks() {
    var els = document.querySelectorAll('[data-link]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var url = CONFIG.LINKS[el.getAttribute('data-link')];
      var item = el.closest('li') || el;
      if (url) {
        el.setAttribute('href', url);
        item.hidden = false;
      } else {
        item.hidden = true;
      }
    }
  }

  /* ---------- language ---------- */
  function setLang(next) {
    lang = next === 'ar' ? 'ar' : 'en';
    var root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      var text = lang === 'ar' ? AR[key] : EN[key];
      if (text != null) els[i].innerHTML = text;
    }
    var btn = document.querySelector('.lang-toggle');
    if (btn) {
      btn.textContent = lang === 'ar' ? 'English' : 'عربي';
      btn.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
      btn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    }
    store('bayan-links-lang', lang);
  }

  function initLang() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      if (!(key in EN)) EN[key] = els[i].innerHTML;
    }
    var param = new URLSearchParams(window.location.search).get('lang');
    var saved = store('bayan-links-lang');
    var nav = (navigator.language || '').toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en';
    setLang(param || saved || nav);

    var btn = document.querySelector('.lang-toggle');
    if (btn) btn.addEventListener('click', function () { setLang(lang === 'ar' ? 'en' : 'ar'); });
  }

  /* ---------- contact form ---------- */
  var widgetId = null;

  function loadTurnstile(container) {
    if (!CONFIG.TURNSTILE_SITEKEY || !container) return;
    window.onBayanTurnstile = function () {
      widgetId = window.turnstile.render(container, {
        sitekey: CONFIG.TURNSTILE_SITEKEY,
        theme: 'dark',
        language: 'auto',
        action: 'contact'
      });
    };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onBayanTurnstile';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = document.getElementById('form-status');
    var submit = form.querySelector('button[type="submit"]');
    var done = document.getElementById('form-done');
    var captcha = document.getElementById('turnstile');
    loadTurnstile(captcha);

    function fail(key, field) {
      status.textContent = msg(key);
      status.className = 'status error';
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    }

    form.addEventListener('input', function (e) {
      if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = {};
      ['name', 'email', 'phone', 'organisation', 'topic', 'message', 'website'].forEach(function (n) {
        f[n] = form.elements.namedItem(n);
      });
      var data = {
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        organisation: f.organisation.value.trim(),
        topic: f.topic.value,
        message: f.message.value.trim(),
        website: f.website.value, // honeypot
        lang: lang
      };

      if (!data.name) return fail('required', f.name);
      if (!data.email) return fail('required', f.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return fail('email', f.email);
      if (!data.message) return fail('required', f.message);

      // Not deployed yet: hand the message to the visitor's email app.
      if (!CONFIG.WORKER_URL) {
        var topicText = f.topic.options[f.topic.selectedIndex].text;
        var body = data.message + '\n\n— ' + data.name +
          (data.organisation ? ', ' + data.organisation : '') +
          (data.phone ? '\n' + data.phone : '') + '\n' + data.email;
        status.textContent = msg('mailto');
        status.className = 'status';
        window.location.href = 'mailto:' + CONFIG.FALLBACK_EMAIL +
          '?subject=' + encodeURIComponent('[QR] ' + topicText + ' — ' + data.name) +
          '&body=' + encodeURIComponent(body);
        return;
      }

      if (CONFIG.TURNSTILE_SITEKEY) {
        data.turnstile = window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) : '';
        if (!data.turnstile) return fail('captcha');
      }

      submit.disabled = true;
      status.textContent = msg('sending');
      status.className = 'status';

      fetch(CONFIG.WORKER_URL.replace(/\/$/, '') + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.ok && body.ok) {
            form.hidden = true;
            done.hidden = false;
            done.querySelector('h2').focus();
            return;
          }
          if (res.status === 429) fail('rate');
          else if (body.error === 'captcha') fail('captcha');
          else if (body.error === 'email') fail('email', f.email);
          else fail('failed');
        });
      }).catch(function () {
        fail('failed');
      }).then(function () {
        submit.disabled = false;
        if (window.turnstile && widgetId !== null && !form.hidden) window.turnstile.reset(widgetId);
      });
    });
  }

  applyLinks();
  initLang();
  initForm();
})();
