/*!
 * Bayan AI chat widget, v1.1
 * One file, no dependencies. Add it to any page, just before </body>:
 *
 *   <script src="/assets/bayan-chat.js" charset="utf-8" defer></script>
 *
 * By default it answers from the RULES list below: keyword matching, no AI, no server, no cost.
 * To edit what it says, change RULES (and the welcome text in T).
 * Optional: add data-endpoint="https://your-worker.workers.dev" to switch to real AI answers
 * through the Cloudflare Worker in the AI kit.
 * Options (data-* on the script tag, or window.BayanChatConfig = {...} before it loads):
 *   lang ("en" | "ar"), position ("right" | "left"), teaser ("true" | "false"),
 *   teaser-delay (ms), assets (folder with the white logo marks), fonts ("true" | "false"),
 *   email (contact address), color (brand color, default #0B1A28), endpoint (AI only)
 * Page API: window.BayanChat.open(), .close(), .toggle(), .setLanguage("ar"), .reset()
 */
(function () {
  'use strict';
  if (window.BayanChat) return;

  /* ------------------------------------------------------------------ config */
  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) if (/bayan-chat/.test(all[i].src || '')) return all[i];
    return null;
  })();
  var ds = (script && script.dataset) || {};
  var userCfg = window.BayanChatConfig || {};
  function opt(name, fallback) {
    if (userCfg[name] != null) return userCfg[name];
    if (ds[name] != null) return ds[name];
    return fallback;
  }
  function storeGet(kind, key) { try { return window[kind].getItem(key); } catch (e) { return null; } }
  function storeSet(kind, key, val) { try { window[kind].setItem(key, val); } catch (e) { /* storage blocked */ } }

  var endpoint = String(opt('endpoint', '') || '').trim().replace(/\/+$/, '').replace(/\/chat$/, '');
  var pageLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  var CONFIG = {
    endpoint: endpoint,
    mode: endpoint && String(opt('mode', '')) !== 'rules' ? 'ai' : 'rules',
    position: String(opt('position', 'right')) === 'left' ? 'left' : 'right',
    teaser: String(opt('teaser', 'true')) !== 'false',
    teaserDelay: Math.max(0, parseInt(opt('teaserDelay', '6000'), 10) || 0),
    assets: String(opt('assets', 'https://www.bayanai.tech/assets/logos/')).replace(/\/?$/, '/'),
    fonts: String(opt('fonts', 'true')) !== 'false',
    email: String(opt('email', 'info@bayanai.tech')),
    color: String(opt('color', '#0B1A28'))
  };
  var startLang = storeGet('localStorage', 'bayanChat.lang') || String(opt('lang', '')) || (pageLang.indexOf('ar') === 0 ? 'ar' : 'en');
  if (startLang !== 'ar') startLang = 'en';

  var MAX_HISTORY = 16;
  var MAX_INPUT = 2000;
  var SESSION_KEY = 'bayanChat.session.v1';
  var TEASER_KEY = 'bayanChat.teaserDismissed';

  /* ------------------------------------------------------------------ copy */
  var T = {
    en: {
      dir: 'ltr', title: 'Bayan AI', subtitle: 'AI assistant', launcher: 'Ask Bayan AI',
      open: 'Open Bayan AI chat', minimize: 'Minimize chat', newChat: 'Start a new chat',
      switchLang: 'Switch to Arabic', otherLang: 'عربي', otherLangCode: 'ar',
      hello: 'Hi, I’m the Bayan AI assistant.',
      intro: 'I can point you to the right solution, set up a research collaboration, or help with a research question, in English or Arabic.',
      tryAsking: 'Try asking',
      starters: ['Which tool fits a medical resident?', 'What is Medad?', 'How can my hospital collaborate with you?', 'How do I calculate a sample size?'],
      placeholder: 'Ask a question…', placeholderNext: 'Ask a follow-up…',
      message: 'Message', send: 'Send message',
      disclaimer: 'AI can make mistakes. Not a substitute for medical advice.',
      /* used when there is no AI (the default) */
      subtitleRules: 'Virtual assistant',
      introRules: 'I can point you to the right solution, answer common questions about our work, or put you in touch with the team, in English or Arabic.',
      startersRules: ['Which tool fits a medical resident?', 'What is Medad?', 'How can my hospital collaborate with you?', 'How do I contact the team?'],
      disclaimerRules: 'Automatic answers to common questions. Not medical advice.',
      teaser: 'Questions about our solutions or research? Ask in English or Arabic.',
      dismiss: 'Dismiss message', typing: 'Bayan AI is typing',
      error: 'Sorry, I couldn’t answer just now. Please try again.', retry: 'Try again',
      copy: 'Copy answer', copied: 'Copied', helpful: 'Helpful', notHelpful: 'Not helpful',
      chatLabel: 'Bayan AI chat', sources: ['sources', 'references'],
      form: {
        title: 'Collaboration request', note: 'Sent to the team with this chat, used only to reply.',
        type: 'Type of collaboration', types: [['clinical', 'Clinical'], ['academic', 'Academic'], ['scientific', 'Scientific']],
        name: 'Name', namePh: 'Full name', email: 'Work email', emailPh: 'you@hospital.om',
        org: 'Institution', orgPh: 'Hospital or university',
        submit: 'Send to the team', sending: 'Sending…',
        invalid: 'Please add your name and a valid email.',
        sent: 'Thank you. Your request is with the team and they will reply by email.',
        fallback: 'Almost done. Send your request from your email app:',
        fallbackLink: 'Email the team',
        noteRules: 'Opens your email app with these details, addressed to the team.',
        submitRules: 'Continue in email',
        opened: 'Your email app should open with your request ready to send. If it didn’t:'
      }
    },
    ar: {
      dir: 'rtl', title: 'مساعد بيان', subtitle: 'مساعد ذكاء اصطناعي', launcher: 'اسأل بيان',
      open: 'فتح محادثة بيان', minimize: 'تصغير المحادثة', newChat: 'محادثة جديدة',
      switchLang: 'التبديل إلى الإنجليزية', otherLang: 'English', otherLangCode: 'en',
      hello: 'مرحبًا، أنا مساعد بيان.',
      intro: 'أستطيع أن أرشدك إلى الحل المناسب، أو أرتّب معك تعاونًا بحثيًا، أو أساعدك في سؤال بحثي، بالعربية أو الإنجليزية.',
      tryAsking: 'جرّب أن تسأل',
      starters: ['ما الأداة المناسبة لطبيب مقيم؟', 'ما هو مداد؟', 'كيف يمكن لمستشفانا التعاون معكم؟', 'كيف أحسب حجم العينة؟'],
      placeholder: 'اكتب سؤالك…', placeholderNext: 'اكتب رسالتك…',
      message: 'الرسالة', send: 'إرسال',
      disclaimer: 'قد يخطئ الذكاء الاصطناعي. لا يغني عن الاستشارة الطبية.',
      subtitleRules: 'المساعد الافتراضي',
      introRules: 'أستطيع أن أرشدك إلى الحل المناسب، أو أجيب عن الأسئلة الشائعة حول عملنا، أو أوصلك بالفريق، بالعربية أو الإنجليزية.',
      startersRules: ['ما الأداة المناسبة لطبيب مقيم؟', 'ما هو مداد؟', 'كيف يمكن لمستشفانا التعاون معكم؟', 'كيف أتواصل مع الفريق؟'],
      disclaimerRules: 'إجابات آلية للأسئلة الشائعة، ولا تُعد استشارة طبية.',
      teaser: 'لديك سؤال عن حلولنا أو أبحاثنا؟ اسأل بالعربية أو الإنجليزية.',
      dismiss: 'إغلاق الرسالة', typing: 'مساعد بيان يكتب',
      error: 'عذرًا، تعذّر الرد الآن. حاول مرة أخرى.', retry: 'إعادة المحاولة',
      copy: 'نسخ الإجابة', copied: 'تم النسخ', helpful: 'إجابة مفيدة', notHelpful: 'إجابة غير مفيدة',
      chatLabel: 'محادثة بيان', sources: ['المصادر', 'المراجع'],
      form: {
        title: 'طلب تعاون', note: 'يُرسل إلى الفريق مع هذه المحادثة، ويُستخدم للرد فقط.',
        type: 'نوع التعاون', types: [['clinical', 'سريري'], ['academic', 'أكاديمي'], ['scientific', 'علمي']],
        name: 'الاسم', namePh: 'الاسم الكامل', email: 'البريد الإلكتروني للعمل', emailPh: 'you@hospital.om',
        org: 'الجهة', orgPh: 'المستشفى أو الجامعة',
        submit: 'أرسل إلى الفريق', sending: 'جارٍ الإرسال…',
        invalid: 'يرجى إدخال الاسم وبريد إلكتروني صحيح.',
        sent: 'شكرًا لك. وصل طلبك إلى الفريق وسيرد عليك عبر البريد الإلكتروني.',
        fallback: 'خطوة أخيرة: أرسل طلبك من تطبيق البريد لديك:',
        fallbackLink: 'راسل الفريق',
        noteRules: 'يفتح تطبيق البريد لديك مع هذه التفاصيل، موجّهةً إلى الفريق.',
        submitRules: 'المتابعة عبر البريد',
        opened: 'من المفترض أن يفتح تطبيق البريد لديك وطلبك جاهز للإرسال. إن لم يفتح:'
      }
    }
  };

  /* Product cards. "file" is the white logo mark inside CONFIG.assets; the letter is the fallback. */
  var PRODUCTS = {
    bayan: { file: 'bayan-mark-white.png', letter: 'B', url: 'https://www.bayan.edu.om/', name: { en: 'Bayan', ar: 'بيان' }, tag: { en: 'Medical education', ar: 'منصة التعليم الطبي' } },
    medad: { file: 'medad-mark-white.png', letter: 'M', url: 'https://www.medad.om/', name: { en: 'Medad', ar: 'مداد' }, tag: { en: 'Arabic clinical AI research', ar: 'أبحاث سريرية بالعربية' } },
    preop: { file: 'preop-mark-white.png', letter: 'P', url: 'https://www.bayan.edu.om/preop', name: { en: 'PreOp', ar: 'PreOp' }, tag: { en: 'Perioperative medicine toolkit', ar: 'أدوات طب ما حول العمليات' } },
    journalready: { file: 'journalready-mark-white.png', letter: 'J', url: 'https://journalready.ai/', name: { en: 'JournalReady', ar: 'JournalReady' }, tag: { en: 'Research support', ar: 'دعم البحث العلمي' } },
    smartrota: { file: 'smartrota-mark-white.png', letter: 'S', url: 'https://rota.medresearch-academy.om/', name: { en: 'SmartRota', ar: 'SmartRota' }, tag: { en: 'Residency rotation scheduling', ar: 'جدولة دورات الأطباء المقيمين' } },
    ohealth: { file: 'ohealth-mark-white.png', letter: 'O', url: 'https://ohealth.medresearch-academy.om/', name: { en: 'OHealth', ar: 'OHealth' }, tag: { en: 'Health-system data', ar: 'بيانات النظام الصحي' } },
    olearn: { file: 'olearn-mark-white.png', letter: 'O', url: 'https://olearn-sandy.vercel.app/', name: { en: 'OLearn', ar: 'OLearn' }, tag: { en: 'Education data', ar: 'بيانات التعليم' } }
  };

  /* ------------------------------------------------------------------ answers (no AI)
   * This is the whole "brain" when there is no AI: each rule lists trigger words and a reply
   * in English and Arabic. Edit freely.
   *   strong: words that clearly point to the topic (3 points each)
   *   words:  weaker hints (1 point each)
   * The rule with the most points replies; ties go to the rule higher in the list.
   * With no match, FALLBACK replies.
   * Matching ignores capitals, punctuation and Arabic diacritics, and treats أ إ آ as ا, ة as ه, ى as ي.
   * Short English words (4 letters or fewer) must match a whole word (a plural "s" is fine);
   * everything else may match inside a word, so "collaborat" catches collaborate and collaboration.
   * The reply language follows the visitor's message: Arabic letters get the Arabic reply.
   * Replies can use **bold**, "- " lists, [text](https://link) or [text](mailto:address),
   * and these tags, each on its own line:
   *   [[product:medad]]     a card for one solution: bayan, medad, preop, journalready, smartrota, ohealth, olearn
   *   [[suggest:Question]]  a button that asks that question
   *   [[collaborate]]       the collaboration form
   * ---------------------------------------------------------------- */
  var RULES = [
    {
      id: 'crisis',
      strong: ['suicid', 'kill myself', 'end my life', 'ending my life', 'take my life', 'take my own life', 'want to die', 'no reason to live', 'self harm', 'hurt myself',
        'انتحار', 'انتحر', 'اقتل نفسي', 'إيذاء نفسي', 'أؤذي نفسي', 'أريد أن أموت', 'إنهاء حياتي', 'أنهي حياتي'],
      words: [],
      en: 'I’m sorry you’re going through this. Please get help now: call **9999** in Oman (or your local emergency number), or go to the nearest emergency department. If you can, reach out to someone you trust.',
      ar: 'يؤسفني أنك تمر بهذا. أرجو أن تطلب المساعدة الآن: اتصل بالرقم **9999** في عُمان (أو برقم الطوارئ في بلدك)، أو توجّه إلى أقرب قسم طوارئ. وإن استطعت، تحدّث مع شخص تثق به.'
    },
    {
      id: 'medical-advice',
      strong: ['my symptoms', 'diagnose me', 'diagnose my', 'dosage', 'dose', 'overdose', 'side effect', 'should i take', 'safe to take', 'treatment for', 'treat my', 'my pain', 'chest pain', 'i feel sick',
        'أعراض', 'جرعة', 'علاج ل', 'عندي ألم', 'أشعر بألم', 'ألم شديد', 'هل آخذ', 'آثار جانبية'],
      words: ['symptom', 'diagnos', 'pain', 'sick', 'fever', 'emergency', 'تشخيص', 'حمى', 'طوارئ'],
      en: 'I can’t give medical advice. Please talk to a doctor or another qualified clinician about your situation. In an emergency, call **9999** in Oman or your local emergency number.',
      ar: 'لا يمكنني تقديم استشارة طبية. يرجى التحدث مع طبيب أو مختص مؤهل بشأن حالتك. وفي حالات الطوارئ، اتصل بالرقم **9999** في عُمان أو برقم الطوارئ المحلي لديك.'
    },
    {
      id: 'preop',
      strong: ['preop', 'pre op', 'perioperative', 'peri operative', 'risk calculator', 'ما حول العمليات', 'حاسبة المخاطر', 'حاسبات المخاطر'],
      words: ['surgery', 'surgical', 'anaesthe', 'anesthe', 'medication reference', 'جراحة', 'العمليات', 'تخدير', 'الأدوية'],
      en: '**PreOp** is our perioperative medicine toolkit, with risk calculators and medication references in one place.\n[[product:preop]]\n[[suggest:See all seven solutions]]',
      ar: '**PreOp** هي أدواتنا لطب ما حول العمليات، وتجمع حاسبات المخاطر ومراجع الأدوية في مكان واحد.\n[[product:preop]]\n[[suggest:اعرض جميع الحلول]]'
    },
    {
      id: 'medad',
      strong: ['medad', 'مداد', 'speech recognition', 'dictation', 'التعرف على الكلام', 'تحويل الكلام'],
      words: ['speech', 'voice', 'documentation', 'clinical notes', 'transcri', 'توثيق', 'ملاحظات', 'الصوت', 'الكلام', 'تفريغ'],
      en: '**Medad** (مداد) is our Arabic clinical AI research, focused on speech recognition and structured clinical documentation.\n[[product:medad]]\n[[suggest:How can my hospital collaborate with you?]]\n[[suggest:See all seven solutions]]',
      ar: '**مداد** هو عملنا البحثي في الذكاء الاصطناعي السريري باللغة العربية، ويركّز على التعرّف على الكلام والتوثيق السريري المنظّم.\n[[product:medad]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]\n[[suggest:اعرض جميع الحلول]]'
    },
    {
      id: 'journalready',
      strong: ['journalready', 'journal ready', 'manuscript', 'مخطوطة'],
      words: ['publish', 'publication', 'paper', 'journal', 'study design', 'submission', 'write up', 'النشر', 'ورقة بحثية', 'مجلة', 'تصميم الدراسة'],
      en: '**JournalReady** supports researchers from study design through manuscript submission.\n[[product:journalready]]\n[[suggest:How can my hospital collaborate with you?]]',
      ar: '**JournalReady** يدعم الباحثين من تصميم الدراسة حتى تقديم المخطوطة للنشر.\n[[product:journalready]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]'
    },
    {
      id: 'smartrota',
      strong: ['smartrota', 'smart rota', 'rota', 'roster'],
      words: ['schedul', 'rotation', 'shift', 'on call', 'جدول', 'مناوب', 'دورات', 'التدوير'],
      en: '**SmartRota** handles residency rotation scheduling across multiple hospital sites.\n[[product:smartrota]]\n[[suggest:Which tool fits a medical resident?]]',
      ar: '**SmartRota** يتولى جدولة دورات الأطباء المقيمين عبر عدة مواقع للمستشفيات.\n[[product:smartrota]]\n[[suggest:ما الأداة المناسبة لطبيب مقيم؟]]'
    },
    {
      id: 'ohealth',
      strong: ['ohealth', 'health data', 'health system data', 'بيانات صحية', 'بيانات النظام الصحي'],
      words: ['health system', 'statistic', 'trend', 'dashboard', 'indicator', 'open data', 'النظام الصحي', 'إحصاء', 'مؤشرات', 'اتجاهات'],
      en: '**OHealth** is for exploring open health-system data and analysing trends.\n[[product:ohealth]]\n[[suggest:What is OLearn?]]',
      ar: '**OHealth** منصة لاستكشاف البيانات المفتوحة للنظام الصحي وتحليل الاتجاهات.\n[[product:ohealth]]\n[[suggest:ما هو OLearn؟]]'
    },
    {
      id: 'olearn',
      strong: ['olearn', 'education data', 'بيانات التعليم'],
      words: ['workforce', 'graduate', 'geographic', 'القوى العاملة', 'خريج', 'جغرافي'],
      en: '**OLearn** is our education data platform, tracking workforce and geographic patterns.\n[[product:olearn]]\n[[suggest:What is OHealth?]]',
      ar: '**OLearn** منصتنا لبيانات التعليم، وتتابع أنماط القوى العاملة والتوزيع الجغرافي.\n[[product:olearn]]\n[[suggest:ما هو OHealth؟]]'
    },
    {
      id: 'resident',
      strong: ['resident', 'residency', 'registrar', 'مقيم', 'الإقامة'],
      words: ['trainee', 'متدرب'],
      en: 'For residents, three of our solutions fit:\n\n- **Bayan** for exam preparation, with adaptive learning, flashcards and OSCE tools\n- **SmartRota** for rotation schedules across hospital sites\n- **JournalReady** for your research projects\n[[product:bayan]]\n[[product:smartrota]]\n[[product:journalready]]\n[[suggest:Tell me about OSCE tools]]\n[[suggest:See all seven solutions]]',
      ar: 'للأطباء المقيمين، تناسبك ثلاثة من حلولنا:\n\n- **بيان** للاستعداد للامتحانات، مع التعلّم التكيّفي والبطاقات التعليمية وأدوات OSCE\n- **SmartRota** لجدولة الدورات بين مواقع المستشفيات\n- **JournalReady** لمشاريعك البحثية\n[[product:bayan]]\n[[product:smartrota]]\n[[product:journalready]]\n[[suggest:حدّثني عن أدوات OSCE]]\n[[suggest:اعرض جميع الحلول]]'
    },
    {
      id: 'bayan',
      strong: ['osce', 'flashcard', 'bayan edu', 'exam prep', 'منصة بيان', 'البطاقات التعليمية'],
      words: ['bayan', 'بيان', 'exam', 'education', 'learning', 'student', 'امتحان', 'اختبار', 'التعليم الطبي', 'تعليم طبي', 'طالب', 'طلاب', 'مذاكرة'],
      en: '**Bayan** is our medical education platform, with adaptive learning, exam preparation, flashcards and OSCE tools.\n[[product:bayan]]\n[[suggest:Which tool fits a medical resident?]]\n[[suggest:See all seven solutions]]',
      ar: '**بيان** هي منصتنا للتعليم الطبي، وتشمل التعلّم التكيّفي، والاستعداد للامتحانات، والبطاقات التعليمية، وأدوات OSCE.\n[[product:bayan]]\n[[suggest:ما الأداة المناسبة لطبيب مقيم؟]]\n[[suggest:اعرض جميع الحلول]]'
    },
    {
      id: 'sample-size',
      strong: ['sample size', 'حجم العينة', 'حجم عينة'],
      words: ['how many participants', 'كم مشارك'],
      en: 'For a cross-sectional prevalence study, a common starting point is Cochran’s formula:\n\n`n = Z² × p × (1 − p) / d²`\n\nWith an expected prevalence p = 0.30, margin of error d = 0.05 and 95% confidence (Z = 1.96), n ≈ 323, or about 359 if you expect 10% non-response. Other study designs need different calculations.\n\nSources:\n1. Cochran WG. Sampling Techniques. 3rd ed. Wiley; 1977.\n2. Naing L, Winn T, Rusli BN. Practical issues in calculating the sample size for prevalence studies. Arch Orofac Sci. 2006;1:9–14.\n[[product:journalready]]\n[[suggest:Can JournalReady help with my study design?]]',
      ar: 'في دراسة مقطعية لتقدير الانتشار، نقطة البداية الشائعة هي معادلة كوكران:\n\n`n = Z² × p × (1 − p) / d²`\n\nإذا كان الانتشار المتوقع p = 0.30، وهامش الخطأ d = 0.05، ومستوى الثقة 95% (Z = 1.96)، فإن n ≈ 323، أو نحو 359 إذا توقعت عدم استجابة بنسبة 10%. أما تصاميم الدراسات الأخرى فتحتاج إلى حسابات مختلفة.\n\nالمصادر:\n1. Cochran WG. Sampling Techniques. 3rd ed. Wiley; 1977.\n2. Naing L, Winn T, Rusli BN. Practical issues in calculating the sample size for prevalence studies. Arch Orofac Sci. 2006;1:9–14.\n[[product:journalready]]\n[[suggest:هل يساعدني JournalReady في تصميم دراستي؟]]'
    },
    {
      id: 'collaborate',
      strong: ['collaborat', 'partner', 'cooperat', 'work with you', 'work together', 'تعاون', 'شراكة', 'شريك', 'العمل معكم'],
      words: ['join', 'together', 'proposal', 'مقترح'],
      en: 'We’d be glad to hear from you. We collaborate through clinical research, academic collaboration and scientific exchange. Share a few details and the team will reply by email.\n[[collaborate]]',
      ar: 'يسعدنا تواصلكم. نتعاون عبر البحث السريري، والتعاون الأكاديمي، والتبادل العلمي. شاركنا بعض التفاصيل وسيرد عليك الفريق عبر البريد الإلكتروني.\n[[collaborate]]'
    },
    {
      id: 'research',
      strong: ['research question', 'research project', 'methodology', 'سؤال بحثي', 'مشروع بحثي', 'منهجية'],
      words: ['research', 'study', 'analysis', 'statistic', 'بحث', 'دراسة', 'تحليل', 'إحصائي'],
      en: 'For help with a research project, **JournalReady** supports you from study design to manuscript submission. If you’d like to work with our team on a study, I can pass your details on.\n[[product:journalready]]\n[[suggest:How can my hospital collaborate with you?]]',
      ar: 'لمساعدتك في مشروع بحثي، يدعمك **JournalReady** من تصميم الدراسة حتى تقديم المخطوطة. وإذا رغبت في العمل مع فريقنا على دراسة، يمكنني إيصال بياناتك.\n[[product:journalready]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]'
    },
    {
      id: 'contact',
      strong: ['contact', 'email', 'e mail', 'phone', 'call you', 'reach you', 'talk to', 'speak to', 'human', 'real person',
        'تواصل', 'اتصال', 'إيميل', 'البريد', 'هاتف', 'رقم الهاتف', 'رقمكم', 'موظف'],
      words: ['team', 'support', 'الفريق', 'دعم'],
      en: 'You can email the team at [info@bayanai.tech](mailto:info@bayanai.tech). If it’s about a research collaboration, I can pass your details on directly.\n[[suggest:How can my hospital collaborate with you?]]',
      ar: 'يمكنك مراسلة الفريق على [info@bayanai.tech](mailto:info@bayanai.tech). وإذا كان الأمر يتعلق بتعاون بحثي، يمكنني إيصال بياناتك مباشرة.\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]'
    },
    {
      id: 'pricing',
      strong: ['price', 'pricing', 'cost', 'how much', 'subscription', 'fee', 'free', 'سعر', 'أسعار', 'تكلفة', 'اشتراك', 'رسوم', 'مجاني', 'كم يكلف'],
      words: ['pay', 'payment', 'دفع'],
      en: 'I don’t have pricing details here. The team can tell you what fits your needs at [info@bayanai.tech](mailto:info@bayanai.tech).\n[[suggest:How do I contact the team?]]',
      ar: 'لا تتوفر لديّ تفاصيل الأسعار هنا. يمكن للفريق إفادتك بما يناسب احتياجك عبر [info@bayanai.tech](mailto:info@bayanai.tech).\n[[suggest:كيف أتواصل مع الفريق؟]]'
    },
    {
      id: 'jobs',
      strong: ['job', 'career', 'vacanc', 'hiring', 'internship', 'وظيفة', 'وظائف', 'توظيف', 'فرص عمل', 'تدريب صيفي'],
      words: ['cv', 'resume', 'السيرة الذاتية'],
      en: 'For jobs or internships, please email the team at [info@bayanai.tech](mailto:info@bayanai.tech).',
      ar: 'للاستفسار عن الوظائف أو فرص التدريب، يرجى مراسلة الفريق على [info@bayanai.tech](mailto:info@bayanai.tech).'
    },
    {
      id: 'location',
      strong: ['where are you', 'located', 'location', 'address', 'office', 'based in', 'أين أنتم', 'أين مقركم', 'موقعكم', 'عنوانكم', 'العنوان', 'مقركم', 'مكتبكم'],
      words: ['muscat', 'oman', 'مسقط', 'عمان'],
      en: 'We’re based in Muscat, Sultanate of Oman. To arrange a visit or meeting, email [info@bayanai.tech](mailto:info@bayanai.tech).\n[[suggest:What does Bayan AI do?]]',
      ar: 'مقرنا في مسقط، سلطنة عُمان. لترتيب زيارة أو اجتماع، راسلنا على [info@bayanai.tech](mailto:info@bayanai.tech).\n[[suggest:ماذا تقدم بيان؟]]'
    },
    {
      id: 'solutions',
      strong: ['all solutions', 'seven solutions', 'your solutions', 'your products', 'your services', 'what do you offer', 'جميع الحلول', 'حلولكم', 'منتجاتكم', 'خدماتكم', 'ماذا تقدمون'],
      words: ['solution', 'product', 'service', 'tool', 'platform', 'app', 'حلول', 'منتجات', 'خدمات', 'أدوات', 'منصات', 'تطبيق'],
      en: 'Here are our seven solutions:\n\n- **Bayan**: medical education, exam prep and OSCE tools\n- **Medad**: Arabic clinical AI research\n- **PreOp**: perioperative medicine toolkit\n- **JournalReady**: research support, from study design to submission\n- **SmartRota**: residency rotation scheduling\n- **OHealth**: health-system data exploration\n- **OLearn**: education and workforce data\n[[suggest:Which tool fits a medical resident?]]\n[[suggest:How can my hospital collaborate with you?]]',
      ar: 'هذه حلولنا السبعة:\n\n- **بيان**: التعليم الطبي والاستعداد للامتحانات وأدوات OSCE\n- **مداد**: أبحاث الذكاء الاصطناعي السريري بالعربية\n- **PreOp**: أدوات طب ما حول العمليات\n- **JournalReady**: دعم البحث من تصميم الدراسة حتى النشر\n- **SmartRota**: جدولة دورات الأطباء المقيمين\n- **OHealth**: استكشاف بيانات النظام الصحي\n- **OLearn**: بيانات التعليم والقوى العاملة\n[[suggest:ما الأداة المناسبة لطبيب مقيم؟]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]'
    },
    {
      id: 'about',
      strong: ['bayan ai', 'who are you', 'about you', 'about bayan', 'about the company', 'your company', 'what do you do', 'founder', 'founded',
        'من أنتم', 'عن الشركة', 'ماذا تقدم', 'ماذا تفعلون', 'المؤسس', 'من أسس'],
      words: ['company', 'mission', 'vision', 'شركة', 'رؤية'],
      en: '**Bayan AI Technologies** is a healthcare technology company in Muscat, Oman, founded by Dr. Abdullah M. Al Alawi. We connect clinical insight, scientific inquiry and artificial intelligence across medical education, clinical practice, research, and health and education data.\n[[suggest:See all seven solutions]]\n[[suggest:How can my hospital collaborate with you?]]',
      ar: '**Bayan AI Technologies** شركة تقنية صحية في مسقط، سلطنة عُمان، أسسها الدكتور عبدالله العلوي. نربط الخبرة السريرية والبحث العلمي والذكاء الاصطناعي في التعليم الطبي والممارسة السريرية والبحث، وفي بيانات الصحة والتعليم.\n[[suggest:اعرض جميع الحلول]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]'
    },
    {
      id: 'identity',
      strong: ['are you a bot', 'are you ai', 'are you an ai', 'are you human', 'are you real', 'are you a person', 'chatgpt', 'هل أنت روبوت', 'هل أنت إنسان', 'هل أنت حقيقي', 'هل أنت بوت'],
      words: ['bot', 'robot', 'روبوت'],
      en: 'I’m the Bayan AI website assistant. I answer common questions about our work with pre-written answers. For anything else, the team is happy to help at [info@bayanai.tech](mailto:info@bayanai.tech).',
      ar: 'أنا مساعد موقع Bayan AI، وأجيب عن الأسئلة الشائعة حول عملنا بإجابات مُعدّة مسبقًا. ولأي أمر آخر، يسعد الفريق بمساعدتك عبر [info@bayanai.tech](mailto:info@bayanai.tech).'
    },
    {
      id: 'language',
      strong: ['speak arabic', 'arabic please', 'english please', 'do you speak', 'تتكلم عربي', 'تتحدث العربية', 'هل تتكلم', 'هل تتحدث'],
      words: [],
      en: 'Yes. I answer in English or Arabic: write in the language you prefer, or use the button at the top to switch.',
      ar: 'نعم، أجيب بالعربية أو الإنجليزية. اكتب باللغة التي تفضلها، أو استخدم الزر في الأعلى للتبديل.'
    },
    {
      id: 'greeting',
      strong: [],
      words: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'salam', 'السلام عليكم', 'مرحبا', 'أهلا', 'هلا', 'صباح الخير', 'مساء الخير'],
      en: 'Hello! I can help you find the right solution, start a collaboration, or reach the team. What would you like to know?\n[[suggest:See all seven solutions]]\n[[suggest:How can my hospital collaborate with you?]]\n[[suggest:How do I contact the team?]]',
      ar: 'أهلًا وسهلًا! أستطيع مساعدتك في اختيار الحل المناسب، أو بدء تعاون، أو التواصل مع الفريق. بماذا أخدمك؟\n[[suggest:اعرض جميع الحلول]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]\n[[suggest:كيف أتواصل مع الفريق؟]]'
    },
    {
      id: 'thanks',
      strong: [],
      words: ['thank', 'thx', 'appreciate', 'شكرا', 'مشكور', 'يعطيك العافية', 'جزاك الله'],
      en: 'You’re welcome. Is there anything else I can help with?',
      ar: 'العفو! هل هناك شيء آخر أستطيع مساعدتك فيه؟'
    }
  ];

  var FALLBACK = {
    en: 'Sorry, I didn’t catch that. I can answer questions about our solutions, collaborations and how to reach the team. For anything else, email [info@bayanai.tech](mailto:info@bayanai.tech).\n[[suggest:See all seven solutions]]\n[[suggest:How can my hospital collaborate with you?]]\n[[suggest:How do I contact the team?]]',
    ar: 'عذرًا، لم أفهم سؤالك تمامًا. أستطيع الإجابة عن حلولنا والتعاون معنا وطرق التواصل مع الفريق. ولأي استفسار آخر، راسلنا على [info@bayanai.tech](mailto:info@bayanai.tech).\n[[suggest:اعرض جميع الحلول]]\n[[suggest:كيف يمكن لمستشفانا التعاون معكم؟]]\n[[suggest:كيف أتواصل مع الفريق؟]]'
  };

  /* ------------------------------------------------------------------ icons */
  var ICONS = {
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    external: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    newChat: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    up: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    down: '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'
  };
  function icon(name, size, width) {
    var tpl = document.createElement('template');
    tpl.innerHTML = '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="' +
      (width || 1.75) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
    return tpl.content.firstChild;
  }

  /* ------------------------------------------------------------------ helpers */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v; /* only ever given escaped/trusted markup */
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Direction of a piece of text. Product names are ignored, so "ما هو SmartRota؟" counts as Arabic. */
  function textDir(s) {
    var rest = String(s).replace(/smartrota|journalready|ohealth|olearn|preop|medad|bayan|osce|ai\b/gi, '');
    var ar = (rest.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    var lat = (rest.match(/[A-Za-z]/g) || []).length;
    return ar && ar >= lat ? 'rtl' : 'ltr';
  }
  function isNarrow() { return window.matchMedia && window.matchMedia('(max-width: 640px)').matches; }
  function isTouch() { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; }

  /* Light Markdown -> safe HTML. Everything is escaped first; only a small set of formats is re-enabled. */
  function inlineMd(s) {
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, function (m, t, u) {
      var external = u.indexOf('mailto:') !== 0;
      return '<a href="' + u + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return '<code>' + codes[+i] + '</code>'; });
    return s;
  }
  function renderMarkdown(text, strings) {
    var lines = escapeHtml(text).split('\n');
    var html = '';
    var para = [];
    var list = null;
    var fence = null;
    var sourcesNext = false;
    var sourceWords = strings.sources.concat(T.en.sources, T.ar.sources);
    function flushPara() {
      if (!para.length) return;
      var joined = para.join(' ');
      var bare = joined.replace(/<\/?strong>|\*\*/g, '').replace(/[:：]\s*$/, '').trim().toLowerCase();
      if (sourceWords.indexOf(bare) !== -1) {
        html += '<p class="bc-sources-h">' + inlineMd(para.join(' ').replace(/[:：]\s*$/, '')) + '</p>';
        sourcesNext = true;
      } else {
        html += '<p>' + inlineMd(joined) + '</p>';
        sourcesNext = false;
      }
      para = [];
    }
    function closeList() { if (list) { html += '</' + list + '>'; list = null; } }
    lines.forEach(function (line) {
      var t = line.trim();
      if (fence !== null) {
        if (/^```/.test(t)) { html += '<pre><code>' + fence.join('\n') + '</code></pre>'; fence = null; }
        else fence.push(line);
        return;
      }
      if (/^```/.test(t)) { flushPara(); closeList(); fence = []; return; }
      if (!t) { flushPara(); closeList(); return; }
      var m;
      if ((m = t.match(/^[-*•]\s+(.*)$/))) {
        flushPara();
        if (list !== 'ul') { closeList(); html += '<ul' + (sourcesNext ? ' class="bc-sources"' : '') + '>'; list = 'ul'; }
        html += '<li>' + inlineMd(m[1]) + '</li>';
        return;
      }
      if ((m = t.match(/^(\d+)[.)]\s+(.*)$/))) {
        flushPara();
        if (list !== 'ol') { closeList(); html += '<ol' + (sourcesNext ? ' class="bc-sources"' : '') + (m[1] !== '1' ? ' start="' + m[1] + '"' : '') + '>'; list = 'ol'; }
        html += '<li>' + inlineMd(m[2]) + '</li>';
        return;
      }
      if ((m = t.match(/^#{1,6}\s+(.*)$/))) { flushPara(); closeList(); para.push('<strong>' + m[1] + '</strong>'); flushPara(); return; }
      if (list) { closeList(); sourcesNext = false; }
      para.push(t);
    });
    if (fence !== null) html += '<pre><code>' + fence.join('\n') + '</code></pre>';
    flushPara();
    closeList();
    return html;
  }

  /* Pull the website tags out of a reply: [[product:id]], [[suggest:text]], [[collaborate]] */
  function parseReply(full, streaming) {
    var products = [];
    var suggestions = [];
    var collaborate = false;
    var text = String(full).replace(/\[\[\s*(product|suggest|collaborate)\s*(?::([^\]]*))?\]\]/gi, function (m, kind, arg) {
      kind = kind.toLowerCase();
      arg = (arg || '').trim();
      if (kind === 'product') {
        var id = arg.toLowerCase().replace(/[^a-z]/g, '');
        if (PRODUCTS[id] && products.indexOf(id) === -1) products.push(id);
      } else if (kind === 'suggest') {
        if (arg && suggestions.indexOf(arg) === -1) suggestions.push(arg.slice(0, 80));
      } else {
        collaborate = true;
      }
      return '';
    });
    if (streaming) {
      var open = text.lastIndexOf('[[');
      if (open !== -1 && text.indexOf(']]', open) === -1) text = text.slice(0, open);
      text = text.replace(/\[$/, '');
    }
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return { text: text, products: products.slice(0, 3), suggestions: suggestions.slice(0, 3), collaborate: collaborate };
  }

  /* ------------------------------------------------------------------ styles */
  var CSS = [
    ':host{all:initial;position:fixed;z-index:2147483000;right:0;bottom:0;width:0;height:0}',
    '[hidden]{display:none!important}',
    '.bc,.bc *{box-sizing:border-box}',
    '.bc{--bc-primary:#0B1A28;--bc-ink:#0B1A28;--bc-ink-2:#4D5D6C;--bc-ink-3:#5A6B7C;--bc-line:#E2E8EE;--bc-line-2:#CBD5DF;--bc-soft:#EDF1F5;--bc-soft-2:#F6F8FA;',
    "--bc-font:'DM Sans','IBM Plex Sans Arabic',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;",
    "--bc-font-ar:'IBM Plex Sans Arabic','DM Sans',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;",
    "--bc-mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;",
    'font-family:var(--bc-font);color:var(--bc-ink);font-size:14.5px;line-height:22px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-align:start}',
    '.bc[dir=rtl]{font-family:var(--bc-font-ar)}',
    ':where(.bc) :where(button,input,textarea){font:inherit;color:inherit;margin:0}',
    ':where(.bc) :where(button){cursor:pointer}',
    '.bc :focus-visible{outline:2px solid #2F6FEB;outline-offset:2px}',
    '.bc-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',

    /* launcher + teaser */
    '.bc-launcher{position:fixed;right:24px;bottom:24px;height:52px;padding:0 20px 0 6px;display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(11,26,40,.10);border-radius:999px;background:#fff;color:var(--bc-ink);font-weight:600;font-size:15px;line-height:1;box-shadow:0 12px 32px rgba(11,26,40,.28),0 2px 6px rgba(11,26,40,.12);transition:transform .15s ease,box-shadow .15s ease;animation:bc-in .3s ease both}',
    '.bc-launcher:hover{transform:translateY(-1px);box-shadow:0 16px 36px rgba(11,26,40,.32),0 2px 6px rgba(11,26,40,.14)}',
    '.bc[dir=rtl] .bc-launcher{padding:0 6px 0 20px}',
    '.bc-launcher-icon{width:40px;height:40px;flex:none;border-radius:999px;background:var(--bc-primary);color:#fff;display:grid;place-items:center}',
    '.bc[data-pos=left] .bc-launcher{right:auto;left:24px}',
    '.bc[data-open=true] .bc-launcher{display:none}',
    '.bc-teaser{position:fixed;right:24px;bottom:88px;width:296px;max-width:calc(100vw - 32px);padding:6px;display:flex;align-items:flex-start;gap:2px;background:#fff;color:var(--bc-ink);border:1px solid rgba(11,26,40,.08);border-radius:14px 14px 4px 14px;box-shadow:0 16px 40px rgba(11,26,40,.25);animation:bc-in .3s ease both}',
    '.bc[data-pos=left] .bc-teaser{right:auto;left:24px;border-radius:14px 14px 14px 4px}',
    '.bc-teaser-text{flex:1;min-width:0;padding-block:6px;padding-inline:10px 4px;border:0;background:none;text-align:start;font-size:14px;line-height:21px;border-radius:10px}',
    '.bc-icon-btn{width:36px;height:36px;flex:none;display:grid;place-items:center;border:0;background:transparent;border-radius:8px;color:var(--bc-ink-2)}',
    '.bc-icon-btn:hover{background:var(--bc-soft);color:var(--bc-ink)}',
    '.bc-teaser .bc-icon-btn{width:32px;height:32px}',

    /* panel */
    '.bc-panel{position:fixed;right:24px;bottom:24px;width:400px;height:min(720px,calc(100vh - 48px));display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid rgba(11,26,40,.08);border-radius:16px;box-shadow:0 24px 60px rgba(11,26,40,.30),0 2px 8px rgba(11,26,40,.14);transform-origin:bottom right;animation:bc-pop .2s cubic-bezier(.2,.8,.2,1) both}',
    '@supports (height:100dvh){.bc-panel{height:min(720px,calc(100dvh - 48px))}}',
    '.bc[data-pos=left] .bc-panel{right:auto;left:24px;transform-origin:bottom left}',
    '.bc-head{flex:none;min-height:64px;padding-inline:16px 8px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--bc-line)}',
    '.bc-avatar{width:34px;height:34px;flex:none;border-radius:999px;background:transparent;color:var(--bc-primary);display:grid;place-items:center;font:600 15px/1 var(--bc-font);overflow:hidden}',
    '.bc-mark{width:100%;height:100%;display:block;background:currentColor;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}',
    '.bc-titles{flex:1;min-width:0;display:flex;flex-direction:column}',
    '.bc-title{margin:0;font-size:15px;line-height:20px;font-weight:600}',
    '.bc[dir=rtl] .bc-title{line-height:22px}',
    '.bc-sub{margin:0;font-size:12.5px;line-height:17px;color:var(--bc-ink-2)}',
    '.bc-actions{display:flex;align-items:center;gap:2px}',
    '.bc-lang{height:36px;padding:0 12px;border:0;background:transparent;border-radius:8px;font-weight:500;font-size:14px;line-height:1}',
    '.bc-lang[lang=ar]{font-family:var(--bc-font-ar)}',
    '.bc-lang[lang=en]{font-family:var(--bc-font)}',
    '.bc-lang:hover{background:var(--bc-soft)}',
    '.bc-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:20px;scrollbar-width:thin}',
    '.bc-body:focus{outline:none}',

    /* welcome */
    '.bc-welcome{padding-top:8px;display:flex;flex-direction:column;gap:24px}',
    '.bc-hello{margin:0;font-size:21px;line-height:28px;font-weight:600;letter-spacing:-.01em}',
    '.bc[dir=rtl] .bc-hello{line-height:32px;letter-spacing:0}',
    '.bc-intro{margin:8px 0 0;color:var(--bc-ink-2)}',
    '.bc[dir=rtl] .bc-intro{font-size:15px;line-height:26px}',
    '.bc-try{margin:0 0 10px;font-size:13px;line-height:18px;font-weight:600;color:var(--bc-ink-2)}',
    '.bc-starters{margin:0;padding:0;list-style:none;border:1px solid var(--bc-line);border-radius:12px;overflow:hidden}',
    '.bc-starters li+li{border-top:1px solid var(--bc-line)}',
    '.bc-starter{width:100%;min-height:52px;padding-block:8px;padding-inline:16px 14px;display:flex;align-items:center;gap:12px;border:0;background:#fff;color:var(--bc-ink);text-align:start;line-height:20px}',
    '.bc-starter:hover{background:var(--bc-soft-2)}',
    '.bc-starter span{flex:1;min-width:0}',
    '.bc-starter svg{color:var(--bc-ink-3)}',
    '.bc[dir=rtl] .bc-starter svg,.bc[dir=rtl] .bc-submit svg{transform:scaleX(-1)}',

    /* messages */
    '.bc-log{display:flex;flex-direction:column;gap:20px}',
    '.bc-user{align-self:flex-end;max-width:82%;margin:0;padding:10px 14px;background:var(--bc-soft);border-radius:16px 16px 4px 16px;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.bc[dir=rtl] .bc-user{border-radius:16px 16px 16px 4px}',
    '.bc-user[dir=rtl],.bc-md[dir=rtl]{line-height:1.75}',
    '.bc-bot{display:flex;align-items:flex-start;gap:10px}',
    '.bc-mini-avatar{width:24px;height:24px;flex:none;margin-top:1px;border-radius:999px;background:transparent;color:var(--bc-primary);display:grid;place-items:center;font:600 11px/1 var(--bc-font);overflow:hidden}',
    '.bc-bot-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}',
    '.bc-md{overflow-wrap:anywhere}',
    '.bc-md p{margin:0 0 10px}',
    '.bc-md>:last-child{margin-bottom:0}',
    '.bc-md ul,.bc-md ol{margin:0 0 10px;padding-inline-start:20px}',
    '.bc-md li{margin:3px 0}',
    '.bc-md strong{font-weight:600}',
    '.bc-md a{color:var(--bc-ink);text-decoration:underline;text-underline-offset:2px;text-decoration-color:rgba(11,26,40,.35)}',
    '.bc-md code{font-family:var(--bc-mono);font-size:.92em;background:var(--bc-soft-2);border:1px solid var(--bc-line);border-radius:6px;padding:1px 5px;direction:ltr;unicode-bidi:isolate}',
    '.bc-md pre{margin:0 0 10px;padding:12px 14px;background:var(--bc-soft-2);border:1px solid var(--bc-line);border-radius:10px;overflow-x:auto;direction:ltr}',
    '.bc-md pre code{border:0;background:none;padding:0;font-size:13.5px}',
    '.bc-md .bc-sources-h{margin:4px 0 6px;padding-top:12px;border-top:1px solid var(--bc-line);font-size:12.5px;line-height:18px;font-weight:600;color:var(--bc-ink-2)}',
    '.bc-md .bc-sources{font-size:12.5px;line-height:18px;color:var(--bc-ink-2)}',
    '.bc-typing{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid var(--bc-line);border-radius:999px;align-self:flex-start}',
    '.bc-typing i{width:6px;height:6px;border-radius:999px;background:var(--bc-ink);opacity:.25;animation:bc-dot 1.2s infinite ease-in-out}',
    '.bc-typing i:nth-child(2){animation-delay:.15s}.bc-typing i:nth-child(3){animation-delay:.3s}',
    '.bc-cards{display:flex;flex-direction:column;gap:8px}',
    '.bc-card{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--bc-line);border-radius:12px;background:#fff;color:var(--bc-ink);text-decoration:none}',
    '.bc-card:hover{background:var(--bc-soft-2);border-color:var(--bc-line-2)}',
    '.bc-card-tile{width:36px;height:36px;flex:none;border-radius:8px;background:transparent;color:var(--bc-primary);display:grid;place-items:center;font:600 14px/1 var(--bc-font);overflow:hidden}',
    '.bc-card-text{flex:1;min-width:0;display:flex;flex-direction:column}',
    '.bc-card-name{font-size:14px;line-height:20px;font-weight:600}',
    '.bc-card-meta{font-size:12.5px;line-height:18px;color:var(--bc-ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.bc-card svg{color:var(--bc-ink-3);flex:none}',
    '.bc[dir=rtl] .bc-card svg{transform:scaleX(-1)}',
    '.bc-chips{display:flex;flex-wrap:wrap;gap:8px}',
    '.bc-chip{min-height:34px;padding:6px 12px;border:1px solid var(--bc-line-2);border-radius:999px;background:#fff;color:var(--bc-ink);font-size:13px;line-height:20px;font-weight:500;text-align:start}',
    '.bc-chip:hover{background:var(--bc-soft-2)}',
    '.bc-tools{display:flex;gap:2px;margin-inline-start:-7px}',
    '.bc-tool{width:30px;height:30px;display:grid;place-items:center;border:0;background:transparent;border-radius:8px;color:var(--bc-ink-3)}',
    '.bc-tool:hover{background:var(--bc-soft);color:var(--bc-ink)}',
    '.bc-tool[aria-pressed=true]{background:var(--bc-soft);color:var(--bc-ink)}',
    '.bc-error{margin:0;color:var(--bc-ink)}',

    /* collaboration form */
    '.bc-form{margin:0;padding:14px;display:flex;flex-direction:column;gap:14px;border:1px solid var(--bc-line);border-radius:12px;background:#fff;position:relative}',
    '.bc-form-title{margin:0;font-size:14px;line-height:20px;font-weight:600}',
    '.bc-form-note{margin:2px 0 0;font-size:12.5px;line-height:18px;color:var(--bc-ink-2)}',
    '.bc-fieldset{margin:0;padding:0;border:0;min-width:0}',
    '.bc-legend,.bc-field label{display:block;padding:0;margin:0 0 6px;font-size:12.5px;line-height:16px;font-weight:500;color:var(--bc-ink-2)}',
    '.bc-legend{margin-bottom:8px}',
    '.bc-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
    '.bc-seg button{height:34px;padding:0 6px;border:1px solid var(--bc-line-2);border-radius:8px;background:#fff;font-size:13px;font-weight:500;line-height:1}',
    '.bc-seg button[aria-pressed=true]{background:var(--bc-primary);border-color:var(--bc-primary);color:#fff}',
    '.bc-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '.bc-field{min-width:0}',
    '.bc-field input{width:100%;height:38px;padding:0 12px;border:1px solid var(--bc-line-2);border-radius:8px;background:#fff;font-size:14px;line-height:normal;outline:none}',
    '.bc-field input:focus{border-color:var(--bc-primary);box-shadow:0 0 0 3px rgba(11,26,40,.10)}',
    '.bc-field input::placeholder,.bc-input::placeholder{color:var(--bc-ink-3);opacity:1}',
    '.bc-hp{position:absolute;left:-10000px;width:1px;height:1px;opacity:0}',
    '.bc-form-msg{margin:-4px 0 0;font-size:12.5px;line-height:18px;color:#8A1C1C}',
    '.bc-submit{height:40px;border:0;border-radius:10px;background:var(--bc-primary);color:#fff;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}',
    '.bc-submit[disabled]{opacity:.7;cursor:default}',
    '.bc-done{margin:0;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;border:1px solid var(--bc-line);border-radius:12px;background:var(--bc-soft-2);font-size:14px;line-height:21px}',
    '.bc-done svg{flex:none;margin-top:2px}',
    '.bc-done a{color:var(--bc-ink);font-weight:600}',

    /* composer */
    '.bc-composer{flex:none;margin:0;padding:12px 16px 14px;display:flex;flex-direction:column;gap:8px;background:#fff}',
    '.bc-inputrow{display:flex;align-items:flex-end;gap:8px;padding-block:6px;padding-inline:14px 6px;border:1px solid var(--bc-line-2);border-radius:14px;background:#fff;box-shadow:0 1px 2px rgba(11,26,40,.06);transition:border-color .15s,box-shadow .15s}',
    '.bc-inputrow:focus-within{border-color:var(--bc-primary);box-shadow:0 0 0 3px rgba(11,26,40,.08)}',
    '.bc-input{flex:1;min-width:0;height:40px;max-height:132px;padding:9px 0;border:0;outline:none;resize:none;background:transparent;font-size:14.5px;line-height:22px;color:var(--bc-ink)}',
    '.bc-input:focus-visible{outline:none}',
    '.bc-send{width:40px;height:40px;flex:none;display:grid;place-items:center;border:0;border-radius:10px;background:var(--bc-primary);color:#fff}',
    '.bc-send:disabled{background:var(--bc-soft);color:#8A99A8;cursor:default}',
    '.bc-disclaimer{margin:0;font-size:11.5px;line-height:16px;color:var(--bc-ink-3);text-align:center}',
    '.bc[dir=rtl] .bc-disclaimer{font-size:12px;line-height:18px}',

    /* phones: full screen */
    '@media (max-width:640px){',
    '.bc{font-size:16px;line-height:24px}',
    '.bc-launcher,.bc[dir=rtl] .bc-launcher{right:16px;bottom:max(16px,calc(env(safe-area-inset-bottom) + 12px));width:56px;height:56px;padding:0;justify-content:center}',
    '.bc[data-pos=left] .bc-launcher{left:16px;right:auto}',
    '.bc-launcher-label{display:none}',
    '.bc-launcher-icon{background:transparent;color:var(--bc-ink)}',
    '.bc-launcher-icon svg{width:24px;height:24px}',
    '.bc-teaser{right:16px;bottom:calc(max(16px,calc(env(safe-area-inset-bottom) + 12px)) + 68px);width:260px}',
    '.bc[data-pos=left] .bc-teaser{left:16px;right:auto}',
    '.bc-teaser .bc-icon-btn{width:44px;height:44px}',
    '.bc-panel,.bc[data-pos=left] .bc-panel{inset:0;width:100%;height:100%;border:0;border-radius:0;box-shadow:none;animation-name:bc-slide}',
    '.bc-head{padding-top:env(safe-area-inset-top);min-height:calc(60px + env(safe-area-inset-top));padding-inline:16px 4px}',
    '.bc-icon-btn,.bc-lang{height:44px}.bc-icon-btn{width:44px}',
    '.bc-title{font-size:16px;line-height:21px}.bc-sub{font-size:13px;line-height:18px}',
    '.bc-body{padding:20px 16px}',
    '.bc-hello{font-size:22px;line-height:30px}',
    '.bc-intro{font-size:16px;line-height:24px}',
    '.bc-try{font-size:14px}',
    '.bc-starter{min-height:56px}',
    '.bc-user{border-radius:18px 18px 4px 18px}',
    '.bc[dir=rtl] .bc-user{border-radius:18px 18px 18px 4px}',
    '.bc-mini-avatar{width:28px;height:28px;font-size:12px}',
    '.bc-chip{min-height:44px;padding:10px 16px;font-size:14px}',
    '.bc-tool{width:44px;height:44px}',
    '.bc-tools{margin-inline-start:-12px}',
    '.bc-card-tile{width:40px;height:40px}',
    '.bc-card-name{font-size:15px}.bc-card-meta{font-size:13px}',
    '.bc-grid2{grid-template-columns:1fr}',
    '.bc-seg button{height:44px;font-size:14px}',
    '.bc-field input{height:44px;font-size:16px}',
    '.bc-submit{height:48px;font-size:15px}',
    '.bc-composer{padding:10px 12px max(14px,calc(env(safe-area-inset-bottom) + 8px))}',
    '.bc-inputrow{padding-block:4px;padding-inline:16px 4px;border-radius:16px}',
    '.bc-input{height:44px;padding:10px 0;font-size:16px;line-height:24px}',
    '.bc-send{width:44px;height:44px;border-radius:12px}',
    '.bc-disclaimer{font-size:12px;line-height:17px}',
    '}',

    '@keyframes bc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '@keyframes bc-pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}',
    '@keyframes bc-slide{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}',
    '@keyframes bc-dot{0%,80%,100%{opacity:.25;transform:none}40%{opacity:1;transform:translateY(-2px)}}',
    '@media (prefers-reduced-motion:reduce){.bc *{animation:none!important;transition:none!important}}'
  ].join('\n');

  /* ------------------------------------------------------------------ state */
  var state = { open: false, lang: startLang, messages: [], busy: false, collabSent: false, controller: null, token: 0 };
  (function restore() {
    var raw = storeGet('sessionStorage', SESSION_KEY);
    if (!raw) return;
    try {
      var saved = JSON.parse(raw);
      if (Array.isArray(saved.messages)) {
        state.messages = saved.messages.filter(function (m) {
          return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
        }).slice(-40);
      }
      state.collabSent = !!saved.collabSent;
      state.open = !!saved.open && !isNarrow();
    } catch (e) { /* ignore corrupt session */ }
    while (state.messages.length && state.messages[state.messages.length - 1].role === 'user') state.messages.pop();
  })();
  function save() {
    storeSet('sessionStorage', SESSION_KEY, JSON.stringify({ messages: state.messages.slice(-40), collabSent: state.collabSent, open: state.open }));
  }
  function S() { return T[state.lang]; }

  /* ------------------------------------------------------------------ build */
  var host, root, ui = {};
  var savedOverflow = null;
  var teaserTimer = null;

  /* Logo marks: show the letter first, swap in the image only once it has loaded (cached per URL). */
  var logoCache = {};
  function withLogo(el, file, letter) {
    el.textContent = letter;
    if (!CONFIG.assets || !file) return el;
    var src = CONFIG.assets + file;
    /* The marks are white on transparent, so each is used as a mask and filled with the brand colour. */
    var put = function () {
      var mark = h('span', { class: 'bc-mark' });
      mark.style.webkitMaskImage = mark.style.maskImage = 'url("' + src + '")';
      el.textContent = '';
      el.appendChild(mark);
    };
    var entry = logoCache[src];
    if (!entry) {
      entry = logoCache[src] = { state: 'loading', waiting: [] };
      var probe = new Image();
      probe.onload = function () { entry.state = 'ok'; entry.waiting.forEach(function (f) { f(); }); entry.waiting = []; };
      probe.onerror = function () { entry.state = 'failed'; entry.waiting = []; };
      probe.src = src;
    }
    if (entry.state === 'ok') put();
    else if (entry.state === 'loading') entry.waiting.push(put);
    return el;
  }
  function avatar(cls) {
    return withLogo(h('span', { class: cls, 'aria-hidden': 'true' }), 'bayan-ai-mark-white.png', 'B');
  }

  function build() {
    if (CONFIG.fonts && !document.querySelector('link[href*="IBM+Plex+Sans"]')) {
      document.head.appendChild(h('link', {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap'
      }));
    }
    host = h('div', { id: 'bayan-chat', 'data-bayan-chat': '' });
    document.body.appendChild(host);
    root = host.attachShadow({ mode: 'open' });
    root.appendChild(h('style', { text: CSS }));

    ui.wrap = h('div', { class: 'bc', 'data-pos': CONFIG.position, 'data-open': 'false' });
    if (/^#[0-9a-f]{3,8}$/i.test(CONFIG.color)) ui.wrap.style.setProperty('--bc-primary', CONFIG.color);

    /* teaser */
    ui.teaserText = h('button', { type: 'button', class: 'bc-teaser-text', onclick: function () { openChat(); } });
    ui.teaserClose = h('button', { type: 'button', class: 'bc-icon-btn', onclick: dismissTeaser }, [icon('close', 16)]);
    ui.teaser = h('div', { class: 'bc-teaser', hidden: true }, [ui.teaserText, ui.teaserClose]);

    /* launcher */
    ui.launcherLabel = h('span', { class: 'bc-launcher-label' });
    ui.launcher = h('button', { type: 'button', class: 'bc-launcher', 'aria-expanded': 'false', 'aria-controls': 'bc-panel', onclick: function () { toggle(); } },
      [h('span', { class: 'bc-launcher-icon' }, [icon('chat', 20)]), ui.launcherLabel]);

    /* header */
    ui.title = h('h2', { class: 'bc-title', id: 'bc-title' });
    ui.sub = h('p', { class: 'bc-sub' });
    ui.langBtn = h('button', { type: 'button', class: 'bc-lang', onclick: function () { setLanguage(state.lang === 'ar' ? 'en' : 'ar'); } });
    ui.newBtn = h('button', { type: 'button', class: 'bc-icon-btn', onclick: function () { reset(); } }, [icon('newChat', 18)]);
    ui.minBtn = h('button', { type: 'button', class: 'bc-icon-btn', onclick: function () { closeChat(); } }, [icon('chevronDown', 20)]);
    var head = h('div', { class: 'bc-head' }, [
      avatar('bc-avatar'),
      h('div', { class: 'bc-titles' }, [ui.title, ui.sub]),
      h('div', { class: 'bc-actions' }, [ui.langBtn, ui.newBtn, ui.minBtn])
    ]);

    /* body. Streaming text is not announced piece by piece; the finished answer goes to ui.live. */
    ui.welcome = h('div', { class: 'bc-welcome' });
    ui.log = h('div', { class: 'bc-log' });
    ui.live = h('div', { class: 'bc-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
    ui.body = h('div', { class: 'bc-body', tabindex: '-1' }, [ui.welcome, ui.log, ui.live]);

    /* composer */
    ui.inputLabel = h('label', { class: 'bc-sr', for: 'bc-input' });
    ui.input = h('textarea', { id: 'bc-input', class: 'bc-input', rows: '1', maxlength: String(MAX_INPUT), enterkeyhint: 'send', autocomplete: 'off' });
    ui.send = h('button', { type: 'submit', class: 'bc-send', disabled: true }, [icon('arrowUp', 18, 2)]);
    ui.disclaimer = h('p', { class: 'bc-disclaimer' });
    ui.composer = h('form', { class: 'bc-composer', novalidate: true }, [
      h('div', { class: 'bc-inputrow' }, [ui.inputLabel, ui.input, ui.send]),
      ui.disclaimer
    ]);
    ui.composer.addEventListener('submit', function (e) { e.preventDefault(); send(ui.input.value); });
    ui.input.addEventListener('input', function () { autoGrow(); updateSend(); });
    ui.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        send(ui.input.value);
      }
    });

    ui.panel = h('section', { class: 'bc-panel', id: 'bc-panel', role: 'dialog', 'aria-labelledby': 'bc-title', 'aria-modal': 'false', hidden: true },
      [head, ui.body, ui.composer]);
    ui.panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeChat(); }
    });

    ui.wrap.appendChild(ui.teaser);
    ui.wrap.appendChild(ui.launcher);
    ui.wrap.appendChild(ui.panel);
    root.appendChild(ui.wrap);

    applyStrings();
    renderAll();
    if (state.open) openChat(true);
    scheduleTeaser();
    window.addEventListener('resize', function () { if (state.open) lockScroll(isNarrow()); });
  }

  function applyStrings() {
    var s = S();
    var rules = CONFIG.mode === 'rules';
    ui.wrap.setAttribute('dir', s.dir);
    ui.wrap.setAttribute('lang', state.lang);
    ui.launcherLabel.textContent = s.launcher;
    ui.launcher.setAttribute('aria-label', s.open);
    ui.teaserText.textContent = s.teaser;
    ui.teaserClose.setAttribute('aria-label', s.dismiss);
    ui.title.textContent = s.title;
    ui.sub.textContent = rules ? s.subtitleRules : s.subtitle;
    ui.langBtn.textContent = s.otherLang;
    ui.langBtn.setAttribute('lang', s.otherLangCode);
    ui.langBtn.setAttribute('aria-label', s.switchLang);
    ui.newBtn.setAttribute('aria-label', s.newChat);
    ui.minBtn.setAttribute('aria-label', s.minimize);
    ui.inputLabel.textContent = s.message;
    ui.send.setAttribute('aria-label', s.send);
    ui.disclaimer.textContent = rules ? s.disclaimerRules : s.disclaimer;
    ui.welcome.textContent = '';
    ui.welcome.appendChild(h('div', null, [h('p', { class: 'bc-hello', text: s.hello }), h('p', { class: 'bc-intro', text: rules ? s.introRules : s.intro })]));
    var list = h('ul', { class: 'bc-starters' });
    (rules ? s.startersRules : s.starters).forEach(function (q) {
      list.appendChild(h('li', null, [h('button', { type: 'button', class: 'bc-starter', onclick: function () { send(q); } }, [h('span', { text: q }), icon('arrowRight', 18)])]));
    });
    ui.welcome.appendChild(h('div', null, [h('p', { class: 'bc-try', text: s.tryAsking }), list]));
    updateChrome();
  }

  function updateChrome() {
    var has = state.messages.length > 0 || state.busy;
    ui.welcome.hidden = has;
    ui.newBtn.hidden = !has;
    ui.input.setAttribute('placeholder', has ? S().placeholderNext : S().placeholder);
  }
  function updateSend() { ui.send.disabled = state.busy || !ui.input.value.trim(); }
  function autoGrow() {
    ui.input.style.height = 'auto';
    var base = isNarrow() ? 44 : 40;
    ui.input.style.height = Math.min(132, Math.max(base, ui.input.scrollHeight)) + 'px';
  }
  function nearBottom() { return ui.body.scrollHeight - ui.body.scrollTop - ui.body.clientHeight < 96; }
  function scrollDown(force) { if (force || nearBottom()) ui.body.scrollTop = ui.body.scrollHeight; }

  /* ------------------------------------------------------------------ messages */
  function addUser(text) {
    ui.log.appendChild(h('p', { class: 'bc-user', dir: textDir(text), text: text }));
  }

  function addBot(content, opts) {
    opts = opts || {};
    var md = h('div', { class: 'bc-md' });
    var typing = h('div', { class: 'bc-typing' }, [h('span', { class: 'bc-sr', text: S().typing }), h('i'), h('i'), h('i')]);
    var bodyEl = h('div', { class: 'bc-bot-body' }, [md, typing]);
    var el = h('div', { class: 'bc-bot' }, [avatar('bc-mini-avatar'), bodyEl]);
    ui.log.appendChild(el);

    var view = {
      el: el,
      update: function (full, streaming, isLast) {
        var r = parseReply(full, streaming);
        typing.hidden = !(streaming && !r.text);
        md.hidden = !r.text;
        md.setAttribute('dir', textDir(r.text || full));
        md.innerHTML = renderMarkdown(r.text, S());
        Array.prototype.forEach.call(bodyEl.querySelectorAll('.bc-cards,.bc-chips,.bc-tools,.bc-form,.bc-done'), function (n) { n.remove(); });
        if (streaming) return;
        if (r.products.length) bodyEl.appendChild(cards(r.products));
        if (r.collaborate && isLast && !state.collabSent) bodyEl.appendChild(collabForm());
        if (r.suggestions.length && isLast) bodyEl.appendChild(chips(r.suggestions));
        if (r.text) bodyEl.appendChild(tools(function () { return md.innerText; }, full));
      },
      error: function (retry) {
        typing.hidden = true;
        md.hidden = false;
        md.innerHTML = '';
        md.setAttribute('dir', S().dir);
        md.appendChild(h('p', { class: 'bc-error', text: S().error }));
        bodyEl.appendChild(h('div', { class: 'bc-chips' }, [h('button', { type: 'button', class: 'bc-chip', text: S().retry, onclick: retry })]));
      },
      remove: function () { el.remove(); }
    };
    view.update(content, !!opts.streaming, !!opts.isLast);
    return view;
  }

  function cards(ids) {
    var wrap = h('div', { class: 'bc-cards' });
    ids.forEach(function (id) {
      var p = PRODUCTS[id];
      var tile = withLogo(h('span', { class: 'bc-card-tile', 'aria-hidden': 'true' }), p.file, p.letter);
      var domain = p.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      wrap.appendChild(h('a', { class: 'bc-card', href: p.url, target: '_blank', rel: 'noopener' }, [
        tile,
        h('span', { class: 'bc-card-text' }, [
          h('span', { class: 'bc-card-name', text: p.name[state.lang] }),
          h('span', { class: 'bc-card-meta', text: p.tag[state.lang] + ' · ' + domain })
        ]),
        icon('external', 18)
      ]));
    });
    return wrap;
  }

  function chips(list) {
    var wrap = h('div', { class: 'bc-chips' });
    list.forEach(function (q) {
      wrap.appendChild(h('button', { type: 'button', class: 'bc-chip', dir: textDir(q), text: q, onclick: function () { send(q); } }));
    });
    return wrap;
  }

  function tools(getText, full) {
    var s = S();
    var copyBtn = h('button', { type: 'button', class: 'bc-tool', 'aria-label': s.copy }, [icon('copy', 16)]);
    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.textContent = '';
        copyBtn.appendChild(icon('check', 16));
        copyBtn.setAttribute('aria-label', s.copied);
        setTimeout(function () { copyBtn.textContent = ''; copyBtn.appendChild(icon('copy', 16)); copyBtn.setAttribute('aria-label', s.copy); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(getText()).then(done, function () {});
    });
    var mk = function (value, name, label) {
      var b = h('button', { type: 'button', class: 'bc-tool', 'aria-label': label, 'aria-pressed': 'false' }, [icon(name, 16)]);
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        Array.prototype.forEach.call(b.parentNode.querySelectorAll('[aria-pressed]'), function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) {
          try { window.dispatchEvent(new CustomEvent('bayanchat:feedback', { detail: { value: value, answer: full, lang: state.lang } })); } catch (e) { /* old browser */ }
        }
      });
      return b;
    };
    return h('div', { class: 'bc-tools' }, [copyBtn, mk('up', 'up', s.helpful), mk('down', 'down', s.notHelpful)]);
  }

  function collabForm() {
    var s = S().form;
    var uid = 'bc' + Math.random().toString(36).slice(2, 7);
    var type = 'clinical';
    var seg = h('div', { class: 'bc-seg' });
    s.types.forEach(function (t, i) {
      var b = h('button', { type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false', text: t[1] });
      b.addEventListener('click', function () {
        type = t[0];
        Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      seg.appendChild(b);
    });
    function field(key, label, ph, type, auto) {
      var input = h('input', { id: uid + key, name: key, type: type, placeholder: ph, autocomplete: auto, required: key !== 'org' });
      return { input: input, el: h('div', { class: 'bc-field' }, [h('label', { for: uid + key, text: label }), input]) };
    }
    var name = field('name', s.name, s.namePh, 'text', 'name');
    var email = field('email', s.email, s.emailPh, 'email', 'email');
    var org = field('org', s.org, s.orgPh, 'text', 'organization');
    var trap = h('input', { class: 'bc-hp', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    var rules = CONFIG.mode === 'rules';
    var msg = h('p', { class: 'bc-form-msg', role: 'alert', hidden: true });
    var submit = h('button', { type: 'submit', class: 'bc-submit' }, [h('span', { text: rules ? s.submitRules : s.submit }), icon('arrowRight', 16, 2)]);
    var form = h('form', { class: 'bc-form', novalidate: true, 'aria-label': s.title }, [
      h('div', null, [h('p', { class: 'bc-form-title', text: s.title }), h('p', { class: 'bc-form-note', text: rules ? s.noteRules : s.note })]),
      h('fieldset', { class: 'bc-fieldset' }, [h('legend', { class: 'bc-legend', text: s.type }), seg]),
      h('div', { class: 'bc-grid2' }, [name.el, email.el]),
      org.el, trap, msg, submit
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = { type: type, name: name.input.value.trim(), email: email.input.value.trim(), institution: org.input.value.trim(), website: trap.value };
      if (!data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        msg.textContent = s.invalid;
        msg.hidden = false;
        (data.name ? email.input : name.input).focus();
        return;
      }
      msg.hidden = true;
      if (rules) {
        /* No server: hand the request to the visitor's email app, inside the click so browsers allow it. */
        if (!data.website) window.location.href = mailtoLink(data);
        state.collabSent = true;
        save();
        form.replaceWith(collabDone('opened', data));
        return;
      }
      submit.disabled = true;
      submit.firstChild.textContent = s.sending;
      sendCollab(data).then(function (result) {
        state.collabSent = true;
        save();
        form.replaceWith(collabDone(result, data));
      });
    });
    return form;
  }

  function collabDone(result, data) {
    var s = S().form;
    if (result === 'sent') {
      return h('p', { class: 'bc-done', role: 'status' }, [icon('check', 18, 2), h('span', { text: s.sent })]);
    }
    var link = h('a', { href: mailtoLink(data), text: s.fallbackLink });
    return h('p', { class: 'bc-done', role: 'status' }, [icon('mail', 18), h('span', null, [(result === 'opened' ? s.opened : s.fallback) + ' ', link])]);
  }

  function transcript() {
    return state.messages.slice(-12).map(function (m) {
      return { role: m.role, content: parseReply(m.content, false).text.slice(0, 1500) };
    });
  }

  function mailtoLink(data) {
    var lastUser = state.messages.filter(function (m) { return m.role === 'user'; }).slice(-3).map(function (m) { return '- ' + m.content.slice(0, 300); }).join('\n');
    var labels = { clinical: 'Clinical research', academic: 'Academic collaboration', scientific: 'Scientific exchange' };
    var body = 'Name: ' + data.name + '\nEmail: ' + data.email + '\nInstitution: ' + (data.institution || '-') +
      '\nType: ' + labels[data.type] + '\n\nFrom the website chat:\n' + lastUser;
    return 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Collaboration request: ' + labels[data.type]) + '&body=' + encodeURIComponent(body);
  }

  function sendCollab(data) {
    var payload = { type: data.type, name: data.name, email: data.email, institution: data.institution, website: data.website, lang: state.lang, page: location.href, transcript: transcript() };
    return fetch(CONFIG.endpoint + '/collaborate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) { return res.ok ? 'sent' : 'mailto'; })
      .catch(function () { return 'mailto'; });
  }

  function renderAll() {
    ui.log.textContent = '';
    var lastBot = -1;
    state.messages.forEach(function (m, i) { if (m.role === 'assistant') lastBot = i; });
    state.messages.forEach(function (m, i) {
      if (m.role === 'user') addUser(m.content);
      else addBot(m.content, { streaming: false, isLast: i === lastBot && i === state.messages.length - 1 });
    });
    updateChrome();
    scrollDown(true);
  }

  /* ------------------------------------------------------------------ talking to the backend */
  function streamChat(history, onDelta, signal) {
    return fetch(CONFIG.endpoint + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, lang: state.lang }),
      signal: signal
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      function handle(block) {
        var data = '';
        block.split('\n').forEach(function (line) { if (line.indexOf('data:') === 0) data += line.slice(5).trim(); });
        if (!data) return;
        var evt;
        try { evt = JSON.parse(data); } catch (e) { return; }
        if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') onDelta(evt.delta.text);
        else if (evt.type === 'error') throw new Error((evt.error && evt.error.message) || 'stream error');
      }
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) { if (buffer.trim()) handle(buffer); return; }
          buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(/\r\n?/g, '\n');
          var idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            var block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            handle(block);
          }
          return pump();
        });
      }
      return pump();
    });
  }

  /* ------------------------------------------------------------------ rule matching (no AI) */
  function prep(s) {
    return ' ' + String(s).toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[^0-9a-z؀-ۿ]+/g, ' ')
      .replace(/\s+/g, ' ').trim() + ' ';
  }
  RULES.forEach(function (r) {
    var clean = function (list) { return (list || []).map(function (k) { return prep(k).trim(); }).filter(Boolean); };
    r._strong = clean(r.strong);
    r._words = clean(r.words);
  });
  function hit(text, k) {
    if (k.length <= 4 && /^[a-z0-9 ]+$/.test(k)) return text.indexOf(' ' + k + ' ') !== -1 || text.indexOf(' ' + k + 's ') !== -1;
    return text.indexOf(k) !== -1;
  }
  function findRule(message) {
    var text = prep(message);
    var best = null;
    var top = 0;
    RULES.forEach(function (r) {
      var matched = r._strong.filter(function (k) { return hit(text, k); });
      var score = matched.length * 3;
      r._words.forEach(function (k) {
        /* a hint already inside a matched strong phrase doesn't count twice */
        if (hit(text, k) && !matched.some(function (m) { return m.indexOf(k) !== -1; })) score += 1;
      });
      if (score > top) { top = score; best = r; }
    });
    return best;
  }
  function replyLang(message) {
    if (textDir(message) === 'rtl') return 'ar';
    return /[A-Za-z]/.test(message) ? 'en' : state.lang;
  }
  function ruleAnswer(message) {
    var lang = replyLang(message);
    var rule = findRule(message);
    return (rule && rule[lang]) || FALLBACK[lang];
  }
  function rulesStream(history, onDelta) {
    var reply = ruleAnswer(history[history.length - 1].content);
    var parts = reply.match(/[\s\S]{1,8}/g) || [];
    return new Promise(function (resolve) {
      var i = 0;
      setTimeout(function tick() {
        if (i >= parts.length) return resolve();
        onDelta(parts[i++]);
        setTimeout(tick, 12);
      }, 450);
    });
  }

  function send(text) {
    text = String(text || '').trim().slice(0, MAX_INPUT);
    if (!text || state.busy) return;
    Array.prototype.forEach.call(ui.log.querySelectorAll('.bc-chips,.bc-form'), function (n) { n.remove(); });
    state.messages.push({ role: 'user', content: text });
    addUser(text);
    ui.input.value = '';
    autoGrow();
    save();
    respond();
  }

  function respond() {
    var token = state.token;
    state.busy = true;
    updateSend();
    updateChrome();
    var view = addBot('', { streaming: true });
    ui.live.textContent = S().typing;
    scrollDown(true);
    var full = '';
    var history = state.messages.slice(-MAX_HISTORY);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    state.controller = ctrl;
    var pending = false;
    var finished = false;
    var onDelta = function (t) {
      if (token !== state.token || finished) return;
      full += t;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (token !== state.token || finished) return; /* a late frame must not undo the final render */
        var stick = nearBottom();
        view.update(full, true);
        scrollDown(stick);
      });
    };
    var run = CONFIG.mode === 'rules' ? rulesStream(history, onDelta) : streamChat(history, onDelta, ctrl && ctrl.signal);
    run.then(function () {
      finished = true;
      if (token !== state.token) return;
      var parsed = parseReply(full, false);
      if (!parsed.text && !/\[\[/.test(full)) throw new Error('empty reply');
      state.messages.push({ role: 'assistant', content: full });
      save();
      var stick = nearBottom();
      view.update(full, false, true);
      ui.live.textContent = parsed.text.slice(0, 600);
      scrollDown(stick);
    }).catch(function (err) {
      finished = true;
      if (token !== state.token) return;
      if (err && err.name === 'AbortError') { view.remove(); return; }
      if (window.console) console.warn('[Bayan chat]', err);
      var stick = nearBottom();
      view.error(function () { view.remove(); respond(); });
      ui.live.textContent = S().error;
      scrollDown(stick);
    }).then(function () {
      if (token !== state.token) return;
      state.busy = false;
      state.controller = null;
      updateSend();
      updateChrome();
    });
  }

  /* ------------------------------------------------------------------ open / close */
  function lockScroll(lock) {
    var el = document.documentElement;
    if (lock && savedOverflow === null) { savedOverflow = el.style.overflow; el.style.overflow = 'hidden'; }
    if (!lock && savedOverflow !== null) { el.style.overflow = savedOverflow; savedOverflow = null; }
  }
  function openChat(silent) {
    state.open = true;
    hideTeaser();
    storeSet('localStorage', TEASER_KEY, '1');
    ui.panel.hidden = false;
    ui.wrap.setAttribute('data-open', 'true');
    ui.launcher.setAttribute('aria-expanded', 'true');
    ui.panel.setAttribute('aria-modal', isNarrow() ? 'true' : 'false');
    lockScroll(isNarrow());
    scrollDown(true);
    if (!silent) {
      if (isTouch()) ui.body.focus({ preventScroll: true }); else ui.input.focus({ preventScroll: true });
    }
    save();
  }
  function closeChat() {
    state.open = false;
    ui.panel.hidden = true;
    ui.wrap.setAttribute('data-open', 'false');
    ui.launcher.setAttribute('aria-expanded', 'false');
    lockScroll(false);
    ui.launcher.focus({ preventScroll: true });
    save();
  }
  function toggle() { if (state.open) closeChat(); else openChat(); }
  function reset() {
    state.token++;
    if (state.controller) state.controller.abort();
    state.controller = null;
    state.messages = [];
    state.collabSent = false;
    state.busy = false;
    ui.live.textContent = '';
    save();
    renderAll();
    updateSend();
    ui.input.focus({ preventScroll: true });
  }
  function setLanguage(lang) {
    state.lang = lang === 'ar' ? 'ar' : 'en';
    storeSet('localStorage', 'bayanChat.lang', state.lang);
    applyStrings();
    if (!state.busy) renderAll();
    ui.langBtn.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ teaser */
  function scheduleTeaser() {
    if (!CONFIG.teaser || state.open || state.messages.length || storeGet('localStorage', TEASER_KEY)) return;
    teaserTimer = setTimeout(function () { if (!state.open) ui.teaser.hidden = false; }, CONFIG.teaserDelay);
  }
  function hideTeaser() { clearTimeout(teaserTimer); ui.teaser.hidden = true; }
  function dismissTeaser() { hideTeaser(); storeSet('localStorage', TEASER_KEY, '1'); }

  /* ------------------------------------------------------------------ start */
  window.BayanChat = {
    open: function () { if (ui.panel) openChat(); },
    close: function () { if (ui.panel) closeChat(); },
    toggle: function () { if (ui.panel) toggle(); },
    setLanguage: function (l) { if (ui.panel) setLanguage(l); },
    reset: function () { if (ui.panel) reset(); },
    /* For editing rules: BayanChat.test('your question') in the browser console shows which rule answers. */
    test: function (q) { var r = findRule(q); return { rule: r ? r.id : 'fallback', reply: ruleAnswer(q) }; },
    config: CONFIG
  };
  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
