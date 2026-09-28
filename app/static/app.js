const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let project = { repository: 'farriiig/proxypulse-mvp', generated_branch: 'generated' };
let toastTimer;
let regionNames;
let latestStats = null;
let latestHistory = [];
let latestIranInternet = {available:false,status:'unknown'};
let currentCountryManifest = {};
let currentProfileManifest = {};
let activeProfile = 'balanced';
let lastLoadError = '';
const FAVORITES_KEY = 'proxypulse-country-favorites-v1';
const LANG_KEY = 'proxypulse-language-v1';
const VIEW_KEY = 'proxypulse-view-v1';
const THEME_KEY = 'proxypulse-theme-v1';
const THEMES = ['ocean','aurora','violet','sunset','ruby'];
const THEME_PALETTES = {
  ocean:{
    '--theme-bg':'#07111b','--theme-surface':'#0c1723','--theme-surface-2':'#09131e','--theme-inner':'#08121c','--theme-control':'#0d1b29','--theme-control-hover':'#142a40','--theme-line':'#20364a','--theme-text':'#eef8ff','--theme-muted':'#8ea4ba',
    '--accent':'#67e8f9','--accent-2':'#60a5fa','--accent-3':'#a78bfa','--accent-rgb':'103,232,249','--accent2-rgb':'96,165,250','--accent3-rgb':'167,139,250','--panel':'#0c1723','--panel2':'#09131e','--border':'#20364a','--border2':'#29445d','--cyan':'#67e8f9','--blue':'#60a5fa','--green':'#4ade80','--theme-panel':'#0c1723','--theme-panel-soft':'#09131e','--theme-border':'#20364a'
  },
  aurora:{
    '--theme-bg':'#06120f','--theme-surface':'#0a1b17','--theme-surface-2':'#071511','--theme-inner':'#06110e','--theme-control':'#0d241c','--theme-control-hover':'#14372b','--theme-line':'#1d4739','--theme-text':'#effff8','--theme-muted':'#8eb8a7',
    '--accent':'#5eead4','--accent-2':'#4ade80','--accent-3':'#22d3ee','--accent-rgb':'94,234,212','--accent2-rgb':'74,222,128','--accent3-rgb':'34,211,238','--panel':'#0a1b17','--panel2':'#071511','--border':'#1d4739','--border2':'#285c4c','--cyan':'#5eead4','--blue':'#22d3ee','--green':'#4ade80','--theme-panel':'#0a1b17','--theme-panel-soft':'#071511','--theme-border':'#1d4739'
  },
  violet:{
    '--theme-bg':'#0d0918','--theme-surface':'#151124','--theme-surface-2':'#100d1d','--theme-inner':'#0b0916','--theme-control':'#1a1530','--theme-control-hover':'#2a2148','--theme-line':'#40345f','--theme-text':'#f8f3ff','--theme-muted':'#aa9dc3',
    '--accent':'#c4b5fd','--accent-2':'#8b5cf6','--accent-3':'#f0abfc','--accent-rgb':'196,181,253','--accent2-rgb':'139,92,246','--accent3-rgb':'240,171,252','--panel':'#151124','--panel2':'#100d1d','--border':'#40345f','--border2':'#564477','--cyan':'#c4b5fd','--blue':'#8b5cf6','--green':'#a7f3d0','--theme-panel':'#151124','--theme-panel-soft':'#100d1d','--theme-border':'#40345f'
  },
  sunset:{
    '--theme-bg':'#170b06','--theme-surface':'#1e120c','--theme-surface-2':'#170d09','--theme-inner':'#120a07','--theme-control':'#28170e','--theme-control-hover':'#402416','--theme-line':'#5b3724','--theme-text':'#fff5ec','--theme-muted':'#c0a08c',
    '--accent':'#fb923c','--accent-2':'#f97316','--accent-3':'#f472b6','--accent-rgb':'251,146,60','--accent2-rgb':'249,115,22','--accent3-rgb':'244,114,182','--panel':'#1e120c','--panel2':'#170d09','--border':'#5b3724','--border2':'#74482f','--cyan':'#fdba74','--blue':'#fb923c','--green':'#facc15','--theme-panel':'#1e120c','--theme-panel-soft':'#170d09','--theme-border':'#5b3724'
  },
  ruby:{
    '--theme-bg':'#15070d','--theme-surface':'#1e0d15','--theme-surface-2':'#170a11','--theme-inner':'#11070c','--theme-control':'#29101b','--theme-control-hover':'#411827','--theme-line':'#5a293b','--theme-text':'#fff1f5','--theme-muted':'#c29aaa',
    '--accent':'#fb7185','--accent-2':'#ef4444','--accent-3':'#f43f5e','--accent-rgb':'251,113,133','--accent2-rgb':'239,68,68','--accent3-rgb':'244,63,94','--panel':'#1e0d15','--panel2':'#170a11','--border':'#5a293b','--border2':'#71364b','--cyan':'#fda4af','--blue':'#fb7185','--green':'#fbbf24','--theme-panel':'#1e0d15','--theme-panel-soft':'#170a11','--theme-border':'#5a293b'
  }
};
let currentLang = (()=>{try{const v=localStorage.getItem(LANG_KEY);return v==='en'||v==='fa'?v:'fa';}catch{return 'fa';}})();
let currentView = (()=>{try{return localStorage.getItem(VIEW_KEY)==='advanced'?'advanced':'compact';}catch{return 'compact';}})();
let currentTheme = (()=>{try{const v=localStorage.getItem(THEME_KEY);return THEMES.includes(v)?v:'ocean';}catch{return 'ocean';}})();

const I18N={
  fa:{
    pageTitle:'ProxyPulse · هوشمندی پروکسی', pageDescription:'ProxyPulse — پایش، تست، امتیازدهی و انتشار هوشمند اشتراک‌های پروکسی روی GitHub.',
    eyebrow:'هوشمندی پروکسی · نسخه GitHub', heroSub:'جمع‌آوری · پالایش · تست · اعتبارسنجی · دسته‌بندی · انتشار',
    languageSelector:'انتخاب زبان', viewSelector:'نوع نمایش', viewCompact:'خلاصه', viewAdvanced:'پیشرفته', themeSelector:'انتخاب پوسته', themeLabel:'پوسته', themeOcean:'اقیانوسی', themeAurora:'شفق', themeViolet:'بنفش', themeSunset:'غروب', themeRuby:'یاقوتی', smartProfilesJump:'پروفایل هوشمند', iranInternetJump:'وضعیت اینترنت ایران', repository:'مخزن GitHub ↗', actions:'GitHub Actions ↗', refresh:'به‌روزرسانی', more:'بیشتر', moreMenu:'منوی بیشتر', sectionNavigation:'دسترسی سریع',
    loadingSnapshot:'در حال دریافت آخرین وضعیت…', checking:'در حال بررسی…', loadingShort:'در حال دریافت…',
    compactPulseKicker:'نمای سریع شبکه', compactPulseTitle:'وضعیت شبکه', compactPulseHint:'تصویری سریع از کیفیت اتصال، سلامت تونل و تازگی داده‌ها برای انتخاب مطمئن‌تر.', compactVerified:'تونل تأییدشده', compactOnline:'آنلاین', compactLatency:'تأخیر', compactUpdated:'آخرین داده', compactChooseProfile:'انتخاب پروفایل هوشمند', compactIranStatus:'وضعیت ایران', compactMoreDetails:'مشاهده جزئیات کامل', compactCountriesTitle:'کشورهای منتخب', compactCountriesDesc:'کشورهای تأییدشده و علاقه‌مندی‌های شما در یک نگاه.', compactTrendTitle:'روند ۲۴ ساعت اخیر', compactTrendDesc:'روند نودهای آنلاین و موفقیت تونل در ۲۴ ساعت گذشته.', compactQualityExcellent:'عالی', compactQualityGood:'خوب', compactQualityFair:'متوسط', compactQualityPoor:'ضعیف', compactRecommendedMeta:'{count} کانفیگ آماده استفاده', compactNoCountries:'هنوز کشور تأییدشده‌ای در دسترس نیست.', compactOnlineTrend:'آنلاین', compactTunnelTrend:'موفقیت تونل', compactViewAll:'نمای پیشرفته',
    metricDiscovered:'شناسایی‌شده', metricSemanticUnique:'یکتای معنایی', metricScanned:'اسکن‌شده', metricCurrentRun:'اجرای فعلی', metricOnline:'آنلاین', metricAvgLatency:'میانگین تأخیر', metricTcpMedian:'میانه TCP', metricAvgScore:'میانگین امتیاز', metricScoreHint:'تاریخچه + تأخیر + پایداری', metricOnlineNodes:'نودهای آنلاین',
    guideKicker:'راهنمای سریع استفاده', guideTitle:'شروع سریع با اشتراک‌ها و اپ‌ها', guideLead:'ProxyPulse یک پلتفرم GitHub-native برای جمع‌آوری، پالایش، تست و انتشار کانفیگ‌های عمومی است. نتایج بر اساس کیفیت، وضعیت و کشور دسته‌بندی می‌شوند و اشتراک‌های آماده استفاده در اختیار کاربر قرار می‌گیرند.',
    guideStep1:'اشتراک مناسب خود را از بخش <strong>اشتراک‌ها</strong> یا <strong>کشورهای تأییدشده</strong> انتخاب کنید.', guideStep2:'برای افزودن مستقیم، روی دکمه‌های <strong>Incy</strong> یا <strong>Happ</strong> بزنید.', guideStep3:'اگر اپ را نصب ندارید، از دکمه‌های دانلود همین بخش استفاده کنید.', guideNote:'نکته: افزودن مستقیم فقط زمانی کار می‌کند که اپ مربوطه روی دستگاه شما نصب باشد.',
    downloadAppsAria:'لینک دانلود اپ‌ها', downloadApps:'دانلود اپ‌ها', downloadIncyIos:'دانلود Incy برای iOS', downloadIncyAndroid:'دانلود Incy برای Android', downloadHappIos:'دانلود Happ برای iOS', downloadHappAndroid:'دانلود Happ برای Android', compactDownloadAppsTitle:'Incy یا Happ را ندارید؟', compactDownloadAppsHint:'نسخه مناسب iOS یا Android را دریافت کنید', appDownloadPopupTitle:'اپ موردنظر را انتخاب کنید', appDownloadPopupNote:'فروشگاه در همین تب باز می‌شود؛ تب جدیدی ساخته نمی‌شود.', closeAppDownloads:'بستن پنجره دانلود',
    smartKicker:'پروفایل هوشمند', smartTitle:'هدف اتصال‌تان را انتخاب کنید', smartDesc:'هدفتان را انتخاب کنید؛ ProxyPulse هر ساعت یک خروجی تازه و متنوع با حداکثر ۱۰۰ کانفیگ می‌سازد.', asnAware:'تنوع ASN', autoRotation:'چرخش خودکار', maxNodes:'حداکثر ۱۰۰ کانفیگ', smartProfilesAria:'پروفایل‌های هوشمند',
    subscriptionsTitle:'اشتراک‌ها', subscriptionsDesc:'خروجی‌های پالایش‌شده‌ای که در آخرین اجرای Workflow ساخته شده‌اند.', countriesTitle:'کشورهای تأییدشده', countriesDesc:'این اشتراک‌ها فقط شامل کانفیگ‌هایی هستند که تست انتها‌به‌انتهای sing-box را پاس کرده و IP خروجی نهایی دریافت کرده‌اند.',
    iranKicker:'وضعیت اتصال ایران', iranTitle:'وضعیت اینترنت ایران', iranDesc:'خلاصه سلامت مسیرهای داخلی و بین‌الملل، همگام با به‌روزرسانی ساعتی ProxyPulse.', iranDetails:'جزئیات در Covered.ir ↗', iranOverallLabel:'وضعیت کلی', iranDomestic:'مسیرهای داخلی', iranInternational:'مسیرهای بین‌الملل', iranIncidentsLabel:'اختلال فعال', iranLoading:'داده در حال بارگذاری است…', iranDisclaimer:'منبع: Covered.ir · این شاخص فقط مسیرهای تحت پایش Covered را نمایش می‌دهد و نماینده تجربه تمام کاربران ایران نیست.',
    intelKicker:'هوشمندی اتصال', intelTitle:'کیفیت تونل و ماندگاری', intelDesc:'موفقیت انتها‌به‌انتها، ماندگاری دوره‌ای و تنوع ASN در آخرین اسکن.', failureGrouped:'علت خطاها به‌صورت خودکار گروه‌بندی می‌شوند', tunnelSuccess:'موفقیت تونل', medianSurvival:'میانه ماندگاری', rollingReachability:'امتیاز دسترسی دوره‌ای', asnDiversity:'تنوع ASN', rotationPool:'مخزن چرخشی', rotationPoolHint:'کانفیگ‌های سالم با جایگزینی خودکار', whyFailed:'چرا تست‌های تونل ناموفق شدند؟',
    historyTitle:'تاریخچه اخیر', historyDesc:'روند ساعتی شاخص‌های کلیدی در اجراهای اخیر.', last24Runs:'۲۴ اجرای اخیر', protocolMix:'ترکیب پروتکل‌ها', protocolMixDesc:'توزیع پروتکل‌ها در مجموعه کاندیداهای تست‌شده.', healthTitle:'سلامت', healthDesc:'وضعیت فعلی بر اساس اجراهای اخیر.',
    validationLevel:'سطح اعتبارسنجی', validationValue:'TCP + خروجی محدود', validationHint:'نودها ابتدا از نظر TCP بررسی می‌شوند و سپس بخشی از آن‌ها برای IP و کشور خروجی تست تونل می‌شوند.', automation:'اتوماسیون', everyHour:'هر ساعت', automationHint:'GitHub Actions + Pages، بدون نیاز به سرور همیشه‌روشن.', persistentHistory:'تاریخچه پایدار', historyHint:'شاخه main تمیز می‌ماند و با بروزرسانی‌های خودکار تداخل ندارد.', footer:'© 2026 farriiig. ProxyPulse تحت مجوز MIT منتشر شده است.',
    closeQr:'بستن QR', scanPhone:'با گوشی اسکن کنید', subscriptionQr:'QR اشتراک', subscriptionQrAlt:'کد QR اشتراک', qrHint:'این کد را اسکن کنید تا لینک اشتراک روی دستگاه دیگری باز شود.',
    copied:'در کلیپ‌بورد کپی شد', copyFailed:'کپی ناموفق بود', copy:'کپی', open:'باز کردن',
    noTimestamp:'بدون زمان', fresh:'تازه', delayed:'با تأخیر', stale:'قدیمی', unknownAge:'نامشخص', justNow:'همین حالا', minutesAgo:'{n} دقیقه پیش', hoursAgo:'{n} ساعت پیش', daysAgo:'{n} روز پیش',
    iranHealthy:'سالم', iranDegraded:'افت کیفیت', iranIncident:'اختلال', iranDown:'قطع', iranUnknown:'نامشخص', iranUnavailable:'داده در دسترس نیست', iranAvailableHint:'خلاصه وضعیت مسیرهای پایش‌شده', iranUnavailableHint:'برای بررسی مستقیم می‌توانید Covered.ir را باز کنید.', healthyPercent:'{n}٪ سالم', monitoredRoutes:'{n} مسیر پایش‌شده', noMonitoredRoutes:'— مسیر پایش‌شده', lastMeasured:'آخرین اندازه‌گیری Covered: {time} IRST', noMeasured:'آخرین اندازه‌گیری: —', snapshotReceived:'Snapshot دریافت‌شده {age}', snapshotMissing:'Snapshot در این اجرا دریافت نشد',
    profileBalanced:'متعادل', profileSpeed:'سرعت', profileGaming:'گیم', profileStreaming:'استریم', profileStability:'پایداری',
    profileBalancedDesc:'ترکیب متعادل از تأیید تونل، ماندگاری، امتیاز و تأخیر.', profileSpeedDesc:'کمترین تأخیر TCP را در اولویت قرار می‌دهد و سپس امتیاز و تأیید تونل را لحاظ می‌کند.', profileGamingDesc:'Gaming Score، تأخیر پایین و jitter دوره‌ای کم را در اولویت قرار می‌دهد.', profileStreamingDesc:'تونل‌های تأییدشده، ماندگاری، uptime و jitter پایدار را در اولویت قرار می‌دهد.', profileStabilityDesc:'کانفیگ‌هایی را ترجیح می‌دهد که در اسکن‌های ساعتی پی‌درپی سالم مانده‌اند.',
    profileUnavailable:'خروجی این پروفایل هنوز در Snapshot فعلی موجود نیست.', profileTitle:'پروفایل {name}', profileMeta:'{count} کانفیگ · کنترل تنوع ASN/کشور · بروزرسانی ساعتی',
    endToEndVerified:'{verified}/{tested} تأییدشده انتها‌به‌انتها', enrichedVerified:'{count} نود تأییدشده دارای اطلاعات ASN', failedChecks:'{count} تست ناموفق', noFailedChecks:'بدون تست ناموفق', noTunnelFailures:'✓ در این اجرا خطای تونل ثبت نشده است',
    failConfigUnsupported:'کانفیگ پشتیبانی‌نمی‌شود', failTunnelStart:'شروع تونل', failTimeout:'Timeout', failTls:'TLS / Handshake', failAuth:'احراز هویت', failDns:'DNS', failInvalidEgress:'پاسخ خروجی نامعتبر', failRuntimeMissing:'Runtime موجود نیست', failRequest:'خطای درخواست', failOther:'سایر', failUnknown:'نامشخص',
    noProtocolData:'داده‌ای برای پروتکل‌ها وجود ندارد.', noHealthData:'داده‌ای برای سلامت وجود ندارد.',
    recommendedKicker:'⭐ پیشنهاد هوشمند', recommended:'اشتراک پیشنهادی', recommendedDesc:'ترکیب متعادل از تأیید تونل، امتیاز، پایداری و تأخیر.', recommendedMeta:'{count} کانفیگ آماده استفاده',
    noSubscriptions:'هنوز خروجی اشتراکی ساخته نشده است.', nodesCount:'{count} نود', configsCount:'{count} کانفیگ',
    favRemove:'حذف از علاقه‌مندی‌ها', favAdd:'افزودن به علاقه‌مندی‌ها', favRemoved:'از علاقه‌مندی‌ها حذف شد', favAdded:'کشور به علاقه‌مندی‌ها اضافه شد', verifiedNodes:'{count} نود تأییدشده انتها‌به‌انتها', asnCount:'{count} ASN', noCountries:'هنوز اشتراک کشوری وجود ندارد؛ پس از پاس شدن تست تونل و دریافت IP خروجی ساخته می‌شود.',
    noHistory:'هنوز تاریخچه‌ای وجود ندارد.', historyOnline:'نودهای آنلاین', historyLatency:'میانگین تأخیر', historyVerified:'تأییدشده', historyTunnel:'موفقیت تونل', historySurvival:'امتیاز ماندگاری', historyCountries:'کشورها', hourlySamples:'{count} نمونه ساعتی',
    egressSummary:'{verified}/{tested} تأیید تونل · {geo} مکان‌یابی · {countries} کشور', egressUnavailable:'Runtime تست انتها‌به‌انتها در این Snapshot در دسترس نیست', onlineRate:'{percent}٪ از اسکن‌شده‌ها',
    liveSnapshot:'Snapshot زنده · {level}', testLevelDefault:'پیش‌بررسی TCP', testLevelFull:'پیش‌بررسی TCP + اعتبارسنجی محدود خروجی انتها‌به‌انتها', loadError:'دریافت Snapshot ناموفق بود: {error}. یک‌بار Workflow گیت‌هاب را اجرا کنید.',
    importIncy:'افزودن {label} به Incy', importHapp:'افزودن {label} به Happ', subscriptionLabel:'اشتراک {name}', countrySubscription:'اشتراک کشور {name}', smartProfileLabel:'پروفایل هوشمند {name}', recommendedSubscription:'اشتراک پیشنهادی',
    statusHealthy:'سالم', statusStable:'پایدار', statusRecovered:'بازیابی‌شده', statusNew:'جدید', statusDegrading:'در حال افت', statusWeak:'ضعیف', statusOffline:'آفلاین',
    subRotating:'چرخشی', subVerified:'تأییدشده', subBest100:'بهترین ۱۰۰', subStable:'پایدار', subFast:'سریع', subGaming:'گیم', subHealthy:'سالم', subReality:'Reality', subOnline:'آنلاین', subAll:'همه', subVless:'VLESS', subVmess:'VMess', subTrojan:'Trojan', subSs:'Shadowsocks', subHysteria2:'Hysteria2', subTuic:'TUIC'
  },
  en:{
    pageTitle:'ProxyPulse · Proxy Intelligence', pageDescription:'ProxyPulse — GitHub-native proxy aggregation, TCP + end-to-end egress checks, country grouping, scoring and subscription publishing.',
    eyebrow:'PROXY INTELLIGENCE · GITHUB EDITION', heroSub:'Collect · Filter · Probe · Verify · Group · Publish', languageSelector:'Language selector', viewSelector:'View mode', viewCompact:'Compact', viewAdvanced:'Advanced', themeSelector:'Theme selector', themeLabel:'Theme', themeOcean:'Ocean', themeAurora:'Aurora', themeViolet:'Violet', themeSunset:'Sunset', themeRuby:'Ruby', smartProfilesJump:'Smart Profiles', iranInternetJump:'Iran Internet', repository:'GitHub Repository ↗', actions:'GitHub Actions ↗', refresh:'Refresh', more:'More', moreMenu:'More menu', sectionNavigation:'Quick navigation',
    loadingSnapshot:'Loading the latest snapshot…', checking:'Checking…', loadingShort:'Loading…',
    compactPulseKicker:'NETWORK QUICK VIEW', compactPulseTitle:'Network status', compactPulseHint:'A quick read on connection quality, tunnel health, and data freshness.', compactVerified:'Verified tunnels', compactOnline:'Online', compactLatency:'Latency', compactUpdated:'Latest data', compactChooseProfile:'Choose profile', compactIranStatus:'Iran status', compactMoreDetails:'More details', compactCountriesTitle:'Selected Countries', compactCountriesDesc:'Verified countries and your favorites at a glance.', compactTrendTitle:'Last 24 hours', compactTrendDesc:'Online nodes and tunnel success over the past 24 hours.', compactQualityExcellent:'Excellent', compactQualityGood:'Good', compactQualityFair:'Fair', compactQualityPoor:'Poor', compactRecommendedMeta:'{count} recommended configs', compactNoCountries:'No verified country is available yet.', compactOnlineTrend:'Online', compactTunnelTrend:'Tunnel success', compactViewAll:'Advanced view',
    metricDiscovered:'Discovered', metricSemanticUnique:'semantic unique', metricScanned:'Scanned', metricCurrentRun:'current run', metricOnline:'Online', metricAvgLatency:'Avg Latency', metricTcpMedian:'TCP median', metricAvgScore:'Avg Score', metricScoreHint:'history + latency + stability', metricOnlineNodes:'online nodes',
    guideKicker:'Quick start guide', guideTitle:'Get started with subscriptions and apps', guideLead:'ProxyPulse is a GitHub-native platform for collecting, filtering, testing and publishing public proxy configurations. Results are grouped by quality, status and country, then published as ready-to-use subscriptions.',
    guideStep1:'Choose a suitable subscription from <strong>Subscriptions</strong> or <strong>Verified Countries</strong>.', guideStep2:'For direct import, tap <strong>Incy</strong> or <strong>Happ</strong>.', guideStep3:'If the app is not installed, use the download buttons in this section.', guideNote:'Note: direct import works only when the corresponding app is installed on your device.',
    downloadAppsAria:'App download links', downloadApps:'Download apps', downloadIncyIos:'Download Incy for iOS', downloadIncyAndroid:'Download Incy for Android', downloadHappIos:'Download Happ for iOS', downloadHappAndroid:'Download Happ for Android', compactDownloadAppsTitle:'Need Incy or Happ?', compactDownloadAppsHint:'Get the right version for iOS or Android', appDownloadPopupTitle:'Choose an app', appDownloadPopupNote:'The store opens in this tab; no new tab is created.', closeAppDownloads:'Close app downloads',
    smartKicker:'SMART PROFILE', smartTitle:'Choose your connection goal', smartDesc:'Pick a goal and ProxyPulse builds a fresh, diverse subscription every hour with up to 100 configs.', asnAware:'ASN diversity', autoRotation:'Auto-rotation', maxNodes:'Up to 100 configs', smartProfilesAria:'Smart profiles',
    subscriptionsTitle:'Subscriptions', subscriptionsDesc:'Curated static endpoints generated by the latest workflow run.', countriesTitle:'Verified Countries', countriesDesc:'Country subscriptions contain only configs that passed an end-to-end sing-box tunnel check and returned a final egress IP.',
    iranKicker:'IRAN CONNECTIVITY', iranTitle:'Iran Internet Status', iranDesc:'A concise view of domestic and international route health, refreshed with the hourly ProxyPulse run.', iranDetails:'Details on Covered.ir ↗', iranOverallLabel:'Overall status', iranDomestic:'Domestic routes', iranInternational:'International routes', iranIncidentsLabel:'Active incidents', iranLoading:'Loading connectivity data…', iranDisclaimer:'Source: Covered.ir · These indicators cover routes monitored by Covered and do not represent every user or operator in Iran.',
    intelKicker:'CONNECTION INTELLIGENCE', intelTitle:'Tunnel quality & survival', intelDesc:'End-to-end success, rolling survival and ASN diversity from the latest scan.', failureGrouped:'failure reasons are grouped automatically', tunnelSuccess:'Tunnel success', medianSurvival:'Median survival', rollingReachability:'rolling reachability score', asnDiversity:'ASN diversity', rotationPool:'Rotation pool', rotationPoolHint:'auto-replaced healthy configs', whyFailed:'Why tunnel checks failed',
    historyTitle:'Recent History', historyDesc:'Hourly trends for the key metrics across recent runs.', last24Runs:'last 24 runs', protocolMix:'Protocol Mix', protocolMixDesc:'Distribution across the tested candidate pool.', healthTitle:'Health', healthDesc:'Current state derived from recent runs.',
    validationLevel:'Validation level', validationValue:'TCP + bounded egress', validationHint:'Reachable nodes are pre-checked; selected nodes are then tunnel-tested for final IP/country.', automation:'Automation', everyHour:'Every hour', automationHint:'GitHub Actions + Pages, no always-on server.', persistentHistory:'Persistent history', historyHint:'Main branch stays clean and conflict-resistant.', footer:'© 2026 farriiig. ProxyPulse is released under the MIT License.',
    closeQr:'Close QR', scanPhone:'SCAN WITH YOUR PHONE', subscriptionQr:'Subscription QR', subscriptionQrAlt:'Subscription QR code', qrHint:'Scan this code to open the subscription URL on another device.',
    copied:'Copied to clipboard', copyFailed:'Copy failed', copy:'Copy', open:'Open',
    noTimestamp:'No timestamp', fresh:'Fresh', delayed:'Delayed', stale:'Stale', unknownAge:'unknown', justNow:'just now', minutesAgo:'{n}m ago', hoursAgo:'{n}h ago', daysAgo:'{n}d ago',
    iranHealthy:'Healthy', iranDegraded:'Degraded', iranIncident:'Incident', iranDown:'Down', iranUnknown:'Unknown', iranUnavailable:'Data unavailable', iranAvailableHint:'Summary of monitored routes', iranUnavailableHint:'Open Covered.ir to check the source directly.', healthyPercent:'{n}% healthy', monitoredRoutes:'{n} monitored routes', noMonitoredRoutes:'— monitored routes', lastMeasured:'Last Covered measurement: {time} IRST', noMeasured:'Last measurement: —', snapshotReceived:'Snapshot fetched {age}', snapshotMissing:'No snapshot fetched in this run',
    profileBalanced:'Balanced', profileSpeed:'Speed', profileGaming:'Gaming', profileStreaming:'Streaming', profileStability:'Stability',
    profileBalancedDesc:'Best overall mix of verified status, survival, score and latency.', profileSpeedDesc:'Prioritizes the lowest current TCP latency, then score and verified status.', profileGamingDesc:'Prioritizes Gaming Score, low latency and low rolling jitter.', profileStreamingDesc:'Prioritizes verified tunnels, survival, uptime and stable jitter.', profileStabilityDesc:'Prioritizes configs that keep surviving across repeated hourly scans.',
    profileUnavailable:'Profile output is not available in this snapshot yet.', profileTitle:'{name} profile', profileMeta:'{count} configs · ASN/country diversity guard · refreshed hourly',
    endToEndVerified:'{verified}/{tested} end-to-end verified', enrichedVerified:'{count} verified nodes enriched', failedChecks:'{count} failed checks', noFailedChecks:'No failed checks', noTunnelFailures:'✓ No tunnel failures recorded in this run',
    failConfigUnsupported:'Config unsupported', failTunnelStart:'Tunnel start', failTimeout:'Timeout', failTls:'TLS / handshake', failAuth:'Authentication', failDns:'DNS', failInvalidEgress:'Invalid egress response', failRuntimeMissing:'Runtime missing', failRequest:'Request failed', failOther:'Other', failUnknown:'Unknown',
    noProtocolData:'No protocol data.', noHealthData:'No health data.',
    recommendedKicker:'⭐ SMART RECOMMENDATION', recommended:'Recommended subscription', recommendedDesc:'A balanced mix of verified status, score, stability, and latency.', recommendedMeta:'{count} ready-to-use configs',
    noSubscriptions:'No subscription output yet.', nodesCount:'{count} nodes', configsCount:'{count} configs',
    favRemove:'Remove from favorites', favAdd:'Add to favorites', favRemoved:'Removed from favorites', favAdded:'Country pinned to favorites', verifiedNodes:'{count} end-to-end verified nodes', asnCount:'{count} ASNs', noCountries:'No country subscriptions yet. They appear only after a config passes the end-to-end tunnel and final-IP check.',
    noHistory:'No history yet', historyOnline:'Online nodes', historyLatency:'Avg latency', historyVerified:'Verified', historyTunnel:'Tunnel success', historySurvival:'Survival score', historyCountries:'Countries', hourlySamples:'{count} hourly samples',
    egressSummary:'{verified}/{tested} tunnel verified · {geo} geolocated · {countries} countries', egressUnavailable:'End-to-end runtime unavailable in this snapshot', onlineRate:'{percent}% of scanned',
    liveSnapshot:'Live snapshot · {level}', testLevelDefault:'TCP pre-check', testLevelFull:'TCP pre-check + bounded end-to-end egress validation', loadError:'Could not load snapshot: {error}. Run the GitHub workflow once.',
    importIncy:'Add {label} to Incy', importHapp:'Add {label} to Happ', subscriptionLabel:'{name} subscription', countrySubscription:'{name} country subscription', smartProfileLabel:'{name} smart profile', recommendedSubscription:'recommended subscription',
    statusHealthy:'HEALTHY', statusStable:'STABLE', statusRecovered:'RECOVERED', statusNew:'NEW', statusDegrading:'DEGRADING', statusWeak:'WEAK', statusOffline:'OFFLINE',
    subRotating:'ROTATING', subVerified:'VERIFIED', subBest100:'BEST100', subStable:'STABLE', subFast:'FAST', subGaming:'GAMING', subHealthy:'HEALTHY', subReality:'REALITY', subOnline:'ONLINE', subAll:'ALL', subVless:'VLESS', subVmess:'VMESS', subTrojan:'TROJAN', subSs:'SS', subHysteria2:'HYSTERIA2', subTuic:'TUIC'
  }
};

function t(key,vars={}){
  let value=(I18N[currentLang]&&I18N[currentLang][key]) ?? I18N.en[key] ?? key;
  return String(value).replace(/\{(\w+)\}/g,(_,name)=>vars[name]??`{${name}}`);
}
function locale(){return currentLang==='fa'?'fa-IR-u-ca-gregory':'en-US';}
function num(value,opts={}){const n=Number(value);if(!Number.isFinite(n))return '—';try{return new Intl.NumberFormat(locale(),opts).format(n);}catch{return String(n);}}
function percent(value,digits=1){return num(Number(value),{minimumFractionDigits:digits,maximumFractionDigits:digits});}
function resetRegionNames(){try{regionNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames([currentLang==='fa'?'fa':'en'],{type:'region'}):null;}catch{regionNames=null;}}
function applyStaticTranslations(){
  $$('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  $$('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.dataset.i18nHtml);});
  $$('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria));});
  $$('[data-i18n-alt]').forEach(el=>{el.setAttribute('alt',t(el.dataset.i18nAlt));});
  document.title=t('pageTitle');
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.setAttribute('content',t('pageDescription'));
  const iranLink=$('#iranSourceLink');if(iranLink)iranLink.href=currentLang==='fa'?'https://covered.ir/fa':'https://covered.ir/en';
  $$('[data-lang]').forEach(btn=>{const active=btn.dataset.lang===currentLang;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
  $$('[data-view]').forEach(btn=>{const active=btn.dataset.view===currentView;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
  $$('[data-theme-choice]').forEach(btn=>{const active=btn.dataset.themeChoice===currentTheme;btn.classList.toggle('active',active);btn.setAttribute('aria-checked',active?'true':'false');});
  updateThemeControl();
}
function setLanguage(lang,{persist=true,rerender=true}={}){
  currentLang=lang==='en'?'en':'fa';
  if(persist){try{localStorage.setItem(LANG_KEY,currentLang);}catch{}}
  document.documentElement.lang=currentLang;
  document.documentElement.dir=currentLang==='fa'?'rtl':'ltr';
  resetRegionNames();applyStaticTranslations();
  if(rerender){if(latestStats)renderDashboard(latestStats,latestHistory,latestIranInternet);else if(lastLoadError)setNotice('bad',t('loadError',{error:lastLoadError}));else setNotice('loading',t('loadingSnapshot'));}
}

function positionSmartProfile(){
  const panel=$('#smart-profiles');
  const home=$('#smartProfileHome');
  const compactGrid=$('.compact-secondary-grid');
  if(!panel||!home||!compactGrid)return;
  if(currentView==='compact'){
    compactGrid.parentNode.insertBefore(panel,compactGrid);
  }else{
    home.parentNode.insertBefore(panel,home.nextSibling);
  }
}
function setView(view,{persist=true,rerender=true}={}){
  currentView=view==='advanced'?'advanced':'compact';
  if(persist){try{localStorage.setItem(VIEW_KEY,currentView);}catch{}}
  document.documentElement.dataset.view=currentView;
  $$('[data-view]').forEach(btn=>{const active=btn.dataset.view===currentView;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
  positionSmartProfile();
  if(rerender&&latestStats)renderDashboard(latestStats,latestHistory,latestIranInternet);
}
function themeNameKey(theme){return ({ocean:'themeOcean',aurora:'themeAurora',violet:'themeViolet',sunset:'themeSunset',ruby:'themeRuby'})[theme]||'themeOcean';}
function updateThemeControl(){
  const label=$('#themeCurrentLabel');if(label)label.textContent=`${t('themeLabel')} · ${t(themeNameKey(currentTheme))}`;
  const toggle=$('#themeToggle');if(toggle){toggle.dataset.theme=currentTheme;toggle.setAttribute('title',`${t('themeLabel')}: ${t(themeNameKey(currentTheme))}`);}
}
function setTheme(theme,{persist=true}={}){
  currentTheme=THEMES.includes(theme)?theme:'ocean';
  if(persist){try{localStorage.setItem(THEME_KEY,currentTheme);}catch{}}
  const root=document.documentElement;
  const body=document.body;
  const palette=THEME_PALETTES[currentTheme]||THEME_PALETTES.ocean;
  root.setAttribute('data-theme',currentTheme);
  body?.setAttribute('data-theme',currentTheme);
  Object.entries(palette).forEach(([name,value])=>root.style.setProperty(name,value));
  root.style.colorScheme='dark';
  if(body){
    body.style.background=`radial-gradient(circle at 14% -8%,rgba(var(--accent2-rgb),.25),transparent 32%),radial-gradient(circle at 92% 10%,rgba(var(--accent-rgb),.15),transparent 28%),var(--theme-bg)`;
    body.style.color='var(--theme-text)';
  }
  $$('[data-theme-choice]').forEach(btn=>{const active=btn.dataset.themeChoice===currentTheme;btn.classList.toggle('active',active);btn.setAttribute('aria-checked',active?'true':'false');});
  updateThemeControl();
  requestAnimationFrame(()=>{
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',palette['--theme-bg']||'#07111b');
  });
}
function toggleThemeMenu(force){
  const menu=$('#themeMenu'),toggle=$('#themeToggle');if(!menu||!toggle)return;
  const open=typeof force==='boolean'?force:!menu.classList.contains('show');
  menu.classList.toggle('show',open);menu.setAttribute('aria-hidden',open?'false':'true');toggle.setAttribute('aria-expanded',open?'true':'false');
}

function toggleMoreMenu(force){
  const menu=$('#moreMenu'),toggle=$('#moreToggle');if(!menu||!toggle)return;
  const open=typeof force==='boolean'?force:!menu.classList.contains('show');
  menu.classList.toggle('show',open);menu.setAttribute('aria-hidden',open?'false':'true');toggle.setAttribute('aria-expanded',open?'true':'false');
}

async function getJSON(path){
  const sep = path.includes('?') ? '&' : '?';
  const response = await fetch(`${path}${sep}v=${Date.now()}`, { cache: 'no-store' });
  if(!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
async function getJSONOptional(path,fallback){try{return await getJSON(path);}catch{return fallback;}}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtTime(iso){if(!iso)return '—';try{return new Intl.DateTimeFormat(locale(),{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));}catch{return iso;}}
function statusLabel(status){const map={HEALTHY:'statusHealthy',STABLE:'statusStable',RECOVERED:'statusRecovered',NEW:'statusNew',DEGRADING:'statusDegrading',WEAK:'statusWeak',OFFLINE:'statusOffline'};return t(map[String(status||'').toUpperCase()]||String(status||'—'));}
function badge(status){return `<span class="status status-${String(status||'').toLowerCase()}">${esc(statusLabel(status))}</span>`;}
function showToast(message){const root=$('#toast');root.textContent=message;root.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>root.classList.remove('show'),1800);}
async function copyText(text){try{await navigator.clipboard.writeText(text);showToast(t('copied'));}catch{showToast(t('copyFailed'));}}
function setNotice(kind,message){const root=$('#notice');root.className=`notice ${kind}`;$('#noticeText').textContent=message;}

function relativeAge(iso){
  if(!iso)return t('unknownAge');
  const ms=Math.max(0,Date.now()-new Date(iso).getTime());const minutes=Math.floor(ms/60000);
  if(minutes<1)return t('justNow');
  if(minutes<60)return t('minutesAgo',{n:num(minutes,{maximumFractionDigits:0})});
  const hours=Math.floor(minutes/60);if(hours<48)return t('hoursAgo',{n:num(hours,{maximumFractionDigits:0})});
  return t('daysAgo',{n:num(Math.floor(hours/24),{maximumFractionDigits:0})});
}
function updateFreshness(iso){
  const badge=$('#freshnessBadge');if(!iso){badge.className='freshness freshness-stale';badge.textContent=t('noTimestamp');return;}
  const ageMinutes=Math.max(0,(Date.now()-new Date(iso).getTime())/60000);let state='fresh',key='fresh';
  if(ageMinutes>=180){state='stale';key='stale';}else if(ageMinutes>=90){state='delayed';key='delayed';}
  badge.className=`freshness freshness-${state}`;badge.textContent=`${t(key)} · ${relativeAge(iso)}`;
}

function iranStatusLabel(status='unknown'){
  const map={healthy:'iranHealthy',degraded:'iranDegraded',incident:'iranIncident',down:'iranDown',unknown:'iranUnknown'};
  return t(map[String(status).toLowerCase()]||'iranUnknown');
}
function clampPercent(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;}
function renderIranInternet(data={}){
  const root=$('#iran-internet');if(!root)return;const available=Boolean(data&&data.available);root.classList.toggle('iran-status-unavailable',!available);
  const state=available?String(data.status||'unknown').toLowerCase():'unknown';const dot=$('#iranOverallDot');dot.className=`iran-state-dot state-${['healthy','degraded','incident','down'].includes(state)?state:'unknown'}`;
  $('#iranOverall').textContent=available?iranStatusLabel(state):t('iranUnavailable');$('#iranOverallHint').textContent=available?t('iranAvailableHint'):t('iranUnavailableHint');
  const domestic=clampPercent(data?.domestic_healthy_percent),international=clampPercent(data?.international_healthy_percent);
  $('#iranDomesticPercent').textContent=domestic===null?'—':t('healthyPercent',{n:num(domestic,{maximumFractionDigits:1})});$('#iranInternationalPercent').textContent=international===null?'—':t('healthyPercent',{n:num(international,{maximumFractionDigits:1})});
  $('#iranDomesticBar').style.width=`${domestic??0}%`;$('#iranInternationalBar').style.width=`${international??0}%`;
  $('#iranDomesticRoutes').textContent=Number.isFinite(Number(data?.domestic_routes))?t('monitoredRoutes',{n:num(data.domestic_routes,{maximumFractionDigits:0})}):t('noMonitoredRoutes');
  $('#iranInternationalRoutes').textContent=Number.isFinite(Number(data?.international_routes))?t('monitoredRoutes',{n:num(data.international_routes,{maximumFractionDigits:0})}):t('noMonitoredRoutes');
  $('#iranIncidents').textContent=Number.isFinite(Number(data?.active_incidents))?num(data.active_incidents,{maximumFractionDigits:0}):'—';
  $('#iranMeasured').textContent=data?.last_measured_irst?t('lastMeasured',{time:data.last_measured_irst}):t('noMeasured');
  $('#iranSnapshotAge').textContent=data?.fetched_at?t('snapshotReceived',{age:relativeAge(data.fetched_at)}):t('snapshotMissing');
}

const PROFILE_META={
  balanced:{labelKey:'profileBalanced',icon:'⚖',descKey:'profileBalancedDesc'},speed:{labelKey:'profileSpeed',icon:'⚡',descKey:'profileSpeedDesc'},gaming:{labelKey:'profileGaming',icon:'🎮',descKey:'profileGamingDesc'},streaming:{labelKey:'profileStreaming',icon:'▶',descKey:'profileStreamingDesc'},stability:{labelKey:'profileStability',icon:'🛡',descKey:'profileStabilityDesc'}
};
function renderSmartProfiles(manifest={}){
  currentProfileManifest=manifest||{};const root=$('#profileButtons');
  root.innerHTML=Object.entries(PROFILE_META).map(([key,meta])=>`<button type="button" class="profile-button ${key===activeProfile?'active':''}" data-profile="${key}" role="tab" aria-selected="${key===activeProfile?'true':'false'}"><span>${meta.icon}</span><strong>${esc(t(meta.labelKey))}</strong></button>`).join('');renderActiveProfile();
}
function renderActiveProfile(){
  const meta=PROFILE_META[activeProfile]||PROFILE_META.balanced,item=currentProfileManifest[`profile-${activeProfile}`]||{},root=$('#profileResult'),label=t(meta.labelKey);
  if(!item.path){root.innerHTML=`<div class="empty">${esc(t('profileUnavailable'))}</div>`;return;}
  root.innerHTML=`<div class="profile-result-copy"><span class="profile-result-icon">${meta.icon}</span><div><strong>${esc(t('profileTitle',{name:label}))}</strong><p>${esc(t(meta.descKey))}</p><small>${esc(t('profileMeta',{count:num(item.count||0,{maximumFractionDigits:0})}))}</small></div></div>${subscriptionActions(item,t('smartProfileLabel',{name:label}))}`;
}

const FAILURE_LABEL_KEYS={CONFIG_UNSUPPORTED:'failConfigUnsupported',TUNNEL_START_FAILED:'failTunnelStart',EGRESS_TIMEOUT:'failTimeout',TLS_HANDSHAKE:'failTls',AUTH_FAILED:'failAuth',DNS_FAILED:'failDns',INVALID_EGRESS_RESPONSE:'failInvalidEgress',RUNTIME_MISSING:'failRuntimeMissing',REQUEST_FAILED:'failRequest',OTHER:'failOther',UNKNOWN:'failUnknown'};
function renderConnectionIntelligence(stats={}){
  const tested=Number(stats.egress_tested_nodes||0),verified=Number(stats.egress_verified_nodes||0);
  $('#tunnelSuccess').textContent=`${percent(stats.egress_success_rate||0,1)}%`;$('#tunnelSuccessMeta').textContent=t('endToEndVerified',{verified:num(verified,{maximumFractionDigits:0}),tested:num(tested,{maximumFractionDigits:0})});
  $('#survivalScore').textContent=num(stats.median_survival_score||0,{minimumFractionDigits:1,maximumFractionDigits:1});$('#asnDiversity').textContent=num(stats.asn_diversity_count||0,{maximumFractionDigits:0});
  $('#asnDiversityMeta').textContent=t('enrichedVerified',{count:num(stats.asn_enriched_nodes||0,{maximumFractionDigits:0})});$('#rotationCount').textContent=num(stats.subscriptions?.rotating?.count||0,{maximumFractionDigits:0});
  const reasons=Object.entries(stats.egress_failure_reasons||{}),total=reasons.reduce((sum,[,count])=>sum+Number(count||0),0);$('#failureTotal').textContent=total?t('failedChecks',{count:num(total,{maximumFractionDigits:0})}):t('noFailedChecks');
  $('#failureReasons').innerHTML=reasons.length?reasons.map(([key,count])=>`<div class="failure-chip"><span>${esc(t(FAILURE_LABEL_KEYS[key]||'failUnknown'))}</span><strong>${num(count,{maximumFractionDigits:0})}</strong></div>`).join(''):`<div class="failure-ok">${esc(t('noTunnelFailures'))}</div>`;
}

function renderProtocols(protocols={}){const entries=Object.entries(protocols).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...entries.map(x=>x[1]));$('#protocols').innerHTML=entries.length?entries.map(([name,count])=>`<div><div class="bar-meta"><span>${esc(name.toUpperCase())}</span><span>${num(count,{maximumFractionDigits:0})}</span></div><div class="bar"><i style="width:${Math.max(2,count/max*100)}%"></i></div></div>`).join(''):`<div class="empty">${esc(t('noProtocolData'))}</div>`;}
function renderHealth(statuses={}){const preferred=['HEALTHY','STABLE','RECOVERED','NEW','DEGRADING','WEAK','OFFLINE'],keys=[...preferred.filter(k=>k in statuses),...Object.keys(statuses).filter(k=>!preferred.includes(k))];$('#health').innerHTML=keys.length?keys.map(k=>`<div class="health-item"><div>${badge(k)}</div><strong>${num(statuses[k],{maximumFractionDigits:0})}</strong></div>`).join(''):`<div class="empty">${esc(t('noHealthData'))}</div>`;}

function subscriptionActions(item={},label='subscription'){
  const path=item.path||'',url=new URL(path,window.location.href).href,incyUrl=`incy://import/${url}`,happUrl=`happ://add/${url}`;
  const qr=item.qr_path?`<button type="button" class="qr-action" data-qr="${esc(item.qr_path)}" data-qr-title="${esc(label)}">QR</button>`:'';
  return `<div class="endpoint-actions"><a class="app-import app-incy" href="${esc(incyUrl)}" title="${esc(t('importIncy',{label}))}" aria-label="${esc(t('importIncy',{label}))}">Incy</a><a class="app-import app-happ" href="${esc(happUrl)}" title="${esc(t('importHapp',{label}))}" aria-label="${esc(t('importHapp',{label}))}">Happ</a>${qr}<button type="button" data-copy="${esc(url)}">${esc(t('copy'))}</button><a href="${esc(path)}" target="_blank" rel="noreferrer">${esc(t('open'))}</a></div>`;
}
const SUB_LABEL_KEYS={rotating:'subRotating',verified:'subVerified',best100:'subBest100',stable:'subStable',fast:'subFast',gaming:'subGaming',healthy:'subHealthy',reality:'subReality',online:'subOnline',all:'subAll',vless:'subVless',vmess:'subVmess',trojan:'subTrojan',ss:'subSs',hysteria2:'subHysteria2',tuic:'subTuic'};
function subscriptionDisplayName(name){return t(SUB_LABEL_KEYS[name]||name);}
function renderRecommended(item){const root=$('#recommended');if(!item){root.innerHTML='';return;}const normalized={...item,path:item.path||'subscriptions/recommended.txt'};root.innerHTML=`<div class="recommended-card"><div class="recommended-copy"><span class="recommended-kicker">${esc(t('recommendedKicker'))}</span><strong>${esc(t('recommended'))}</strong><p>${esc(t('recommendedDesc'))}</p><span>${esc(t('recommendedMeta',{count:num(item.count||0,{maximumFractionDigits:0})}))}</span></div>${subscriptionActions(normalized,t('recommendedSubscription'))}</div>`;}
function renderSubscriptions(manifest={}){
  renderRecommended(manifest.recommended);const order=['rotating','verified','best100','stable','fast','gaming','healthy','reality','online','all','vless','vmess','trojan','ss','hysteria2','tuic'];const names=[...order.filter(n=>manifest[n]),...Object.keys(manifest).filter(n=>n!=='recommended'&&!n.startsWith('profile-')&&!order.includes(n))];const root=$('#subscriptions');
  root.innerHTML=names.length?names.map(name=>{const item=manifest[name]||{},normalized={...item,path:item.path||`subscriptions/${name}.txt`},display=subscriptionDisplayName(name);return `<div class="endpoint"><div class="endpoint-main"><strong>${esc(display)}</strong><span>${esc(t('nodesCount',{count:num(item.count||0,{maximumFractionDigits:0})}))}</span></div>${subscriptionActions(normalized,t('subscriptionLabel',{name:display}))}</div>`;}).join(''):`<div class="empty">${esc(t('noSubscriptions'))}</div>`;
}

function flagEmoji(code=''){const value=String(code).toUpperCase();if(!/^[A-Z]{2}$/.test(value))return '🌐';return String.fromCodePoint(...[...value].map(c=>127397+c.charCodeAt(0)));}
function countryName(code=''){const value=String(code).toUpperCase();try{return regionNames?.of(value)||value;}catch{return value;}}
function loadFavorites(){try{return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]').map(x=>String(x).toLowerCase()));}catch{return new Set();}}
function saveFavorites(set){try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...set]));}catch{}}
function renderCountries(manifest={}){
  currentCountryManifest=manifest||{};const root=$('#countries'),favorites=loadFavorites();const entries=Object.entries(manifest).sort((a,b)=>{const af=favorites.has(a[0].toLowerCase())?1:0,bf=favorites.has(b[0].toLowerCase())?1:0;return bf-af||Number(b[1]?.count||0)-Number(a[1]?.count||0)||a[0].localeCompare(b[0]);});
  root.innerHTML=entries.length?entries.map(([key,item])=>{const code=String(item.code||key).toUpperCase(),normalized={...item,path:item.path||`subscriptions/countries/${key}.txt`},name=countryName(code),favorite=favorites.has(key.toLowerCase()),asn=Number(item.asn_count||0);return `<div class="endpoint country-endpoint ${favorite?'country-favorite':''}"><div class="country-main"><div class="country-title-row"><button class="favorite-button" type="button" data-favorite-country="${esc(key)}" aria-pressed="${favorite?'true':'false'}" title="${esc(favorite?t('favRemove'):t('favAdd'))}">${favorite?'★':'☆'}</button><span class="country-flag" aria-hidden="true">${flagEmoji(code)}</span><div class="country-title-copy"><div class="country-title"><strong>${esc(name)}</strong><span class="country-code">${esc(code)}</span></div><span class="country-count">${esc(t('verifiedNodes',{count:num(item.count||0,{maximumFractionDigits:0})}))}${asn?` · ${esc(t('asnCount',{count:num(asn,{maximumFractionDigits:0})}))}`:''}</span></div></div></div><div class="country-actions-wrap">${subscriptionActions(normalized,t('countrySubscription',{name}))}</div></div>`;}).join(''):`<div class="empty">${esc(t('noCountries'))}</div>`;
}


function compactQuality(stats={}){
  const score=Number(stats.avg_score||0),online=Number(stats.online_rate||0),tested=Math.max(0,Number(stats.egress_tested_nodes||0)),verified=Math.max(0,Number(stats.egress_verified_nodes||0));
  const tunnel=tested?Math.min(100,(verified/tested)*100):Math.min(100,online);
  return Math.round(Math.max(0,Math.min(100,score*.45+tunnel*.35+online*.20)));
}
function compactQualityLabel(score){return score>=85?t('compactQualityExcellent'):score>=70?t('compactQualityGood'):score>=50?t('compactQualityFair'):t('compactQualityPoor');}
function compactActionSet(item={},label='subscription'){
  const path=item.path||'',url=new URL(path,window.location.href).href,incyUrl=`incy://import/${url}`,happUrl=`happ://add/${url}`;
  return `<div class="compact-action-set"><a href="${esc(incyUrl)}">Incy</a><a href="${esc(happUrl)}">Happ</a><button type="button" data-copy="${esc(url)}">${esc(t('copy'))}</button></div>`;
}
function renderCompactCountries(manifest={}){
  const root=$('#compactCountries');if(!root)return;const favorites=loadFavorites();
  const entries=Object.entries(manifest).sort((a,b)=>{const af=favorites.has(a[0].toLowerCase())?1:0,bf=favorites.has(b[0].toLowerCase())?1:0;return bf-af||Number(b[1]?.count||0)-Number(a[1]?.count||0)||a[0].localeCompare(b[0]);}).slice(0,4);
  root.innerHTML=entries.length?entries.map(([key,item])=>{const code=String(item.code||key).toUpperCase(),name=countryName(code),normalized={...item,path:item.path||`subscriptions/countries/${key}.txt`};return `<article class="compact-country-item"><div class="compact-country-copy"><span class="country-flag">${flagEmoji(code)}</span><div><strong>${esc(name)}</strong><small>${esc(t('verifiedNodes',{count:num(item.count||0,{maximumFractionDigits:0})}))}</small></div></div>${compactActionSet(normalized,t('countrySubscription',{name}))}</article>`;}).join(''):`<div class="empty">${esc(t('compactNoCountries'))}</div>`;
}
function miniSpark(values=[]){const nums=values.map(Number).filter(Number.isFinite);if(!nums.length)return `<div class="compact-spark-empty">—</div>`;const w=220,h=54,p=4,min=Math.min(...nums),max=Math.max(...nums),span=Math.max(1,max-min),points=nums.map((v,i)=>`${(p+(i/Math.max(1,nums.length-1))*(w-p*2)).toFixed(1)},${(h-p-((v-min)/span)*(h-p*2)).toFixed(1)}`).join(' ');return `<svg class="compact-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${points}"/></svg>`;}
function renderCompactTrend(history=[]){const root=$('#compactTrend');if(!root)return;const recent=(Array.isArray(history)?history:[]).slice(-24),defs=[['online','compactOnlineTrend',v=>num(Math.round(v),{maximumFractionDigits:0})],['tunnel_success_rate','compactTunnelTrend',v=>`${percent(v,1)}%`]];root.innerHTML=defs.map(([field,key,fmt])=>{const vals=recent.map(x=>Number(x?.[field])).filter(Number.isFinite),current=vals.length?vals[vals.length-1]:0;return `<article class="compact-trend-item"><div><span>${esc(t(key))}</span><strong>${fmt(current)}</strong></div>${miniSpark(vals)}</article>`;}).join('');}
function renderCompactDashboard(stats={},history=[]){
  const quality=compactQuality(stats),tested=Number(stats.egress_tested_nodes||0),verified=Number(stats.egress_verified_nodes||0);
  $('#compactQualityScore').textContent=num(quality,{maximumFractionDigits:0});$('#compactQualityLabel').textContent=compactQualityLabel(quality);$('#compactQualityLabel').dataset.level=quality>=85?'excellent':quality>=70?'good':quality>=50?'fair':'poor';
  $('#compactVerified').textContent=tested?`${num(verified,{maximumFractionDigits:0})}/${num(tested,{maximumFractionDigits:0})}`:num(verified,{maximumFractionDigits:0});$('#compactOnline').textContent=num(stats.online_nodes||0,{maximumFractionDigits:0});$('#compactLatency').textContent=stats.avg_latency_ms?`${num(Math.round(stats.avg_latency_ms),{maximumFractionDigits:0})} ms`:'—';$('#compactUpdated').textContent=relativeAge(stats.generated_at);
  const item=stats.subscriptions?.recommended;const copyRoot=$('#compactRecommendedCopy'),actionsRoot=$('#compactRecommendedActions');if(item){const normalized={...item,path:item.path||'subscriptions/recommended.txt'};copyRoot.innerHTML=`<span>${esc(t('recommendedKicker'))}</span><strong>${esc(t('recommended'))}</strong><small>${esc(t('compactRecommendedMeta',{count:num(item.count||0,{maximumFractionDigits:0})}))}</small>`;actionsRoot.innerHTML=subscriptionActions(normalized,t('recommendedSubscription'));}else{copyRoot.innerHTML='';actionsRoot.innerHTML='';}
  renderCompactCountries(stats.country_subscriptions||{});renderCompactTrend(history);
}

function sparkline(values=[]){const nums=values.map(Number).filter(Number.isFinite);if(!nums.length)return `<div class="spark-empty">${esc(t('noHistory'))}</div>`;const width=320,height=76,pad=5,min=Math.min(...nums),max=Math.max(...nums),span=Math.max(1,max-min),points=nums.map((v,i)=>{const x=nums.length===1?width/2:pad+(i/(nums.length-1))*(width-pad*2),y=height-pad-((v-min)/span)*(height-pad*2);return `${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" /></svg>`;}
function renderHistory(history=[]){const root=$('#historyGrid'),recent=(Array.isArray(history)?history:[]).slice(-24),defs=[['online','historyOnline',v=>num(Math.round(v),{maximumFractionDigits:0})],['avg_latency_ms','historyLatency',v=>`${num(Math.round(v),{maximumFractionDigits:0})} ms`],['verified','historyVerified',v=>num(Math.round(v),{maximumFractionDigits:0})],['tunnel_success_rate','historyTunnel',v=>`${percent(v,1)}%`],['survival_score','historySurvival',v=>num(v,{minimumFractionDigits:1,maximumFractionDigits:1})],['countries','historyCountries',v=>num(Math.round(v),{maximumFractionDigits:0})]];root.innerHTML=defs.map(([field,labelKey,format])=>{const values=recent.map(x=>Number(x?.[field])).filter(Number.isFinite),current=values.length?values[values.length-1]:0;return `<article class="history-card"><div class="history-card-head"><span>${esc(t(labelKey))}</span><strong>${format(current)}</strong></div>${sparkline(values)}<small>${esc(t('hourlySamples',{count:num(values.length,{maximumFractionDigits:0})}))}</small></article>`;}).join('');}

function positionAppDownloadPopover(){
  const pop=$('#appDownloadPopover'),toggle=$('#appDownloadToggle');if(!pop||!toggle||!pop.classList.contains('show'))return;
  const pad=12,viewportW=window.innerWidth,viewportH=window.innerHeight;
  pop.style.left='';pop.style.right='';pop.style.top='';pop.style.bottom='';
  if(viewportW<=640){pop.style.left=`${pad}px`;pop.style.right=`${pad}px`;pop.style.bottom='16px';return;}
  const rect=toggle.getBoundingClientRect();
  const width=Math.min(370,viewportW-pad*2);pop.style.width=`${width}px`;
  const popRect=pop.getBoundingClientRect();
  let left=rect.left+(rect.width-width)/2;left=Math.max(pad,Math.min(left,viewportW-width-pad));
  let top=rect.bottom+10;if(top+popRect.height>viewportH-pad)top=Math.max(pad,rect.top-popRect.height-10);
  pop.style.left=`${Math.round(left)}px`;pop.style.top=`${Math.round(top)}px`;
}
function openAppDownloads(){const pop=$('#appDownloadPopover'),toggle=$('#appDownloadToggle');if(!pop||!toggle)return;pop.classList.add('show');pop.setAttribute('aria-hidden','false');toggle.setAttribute('aria-expanded','true');requestAnimationFrame(positionAppDownloadPopover);}
function closeAppDownloads(){const pop=$('#appDownloadPopover'),toggle=$('#appDownloadToggle');if(!pop||!toggle)return;pop.classList.remove('show');pop.setAttribute('aria-hidden','true');toggle.setAttribute('aria-expanded','false');pop.style.left='';pop.style.right='';pop.style.top='';pop.style.bottom='';pop.style.width='';}
function toggleAppDownloads(){const pop=$('#appDownloadPopover');if(pop?.classList.contains('show'))closeAppDownloads();else openAppDownloads();}

function openQr(path,title){const modal=$('#qrModal');$('#qrTitle').textContent=title||t('subscriptionQr');$('#qrImage').src=new URL(path,window.location.href).href;modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');}
function closeQr(){const modal=$('#qrModal');modal.classList.remove('show');modal.setAttribute('aria-hidden','true');$('#qrImage').removeAttribute('src');document.body.classList.remove('modal-open');}
function testLevelLabel(value=''){const s=String(value||'');if(currentLang==='en')return s||t('testLevelDefault');if(/end-to-end|egress/i.test(s))return t('testLevelFull');return t('testLevelDefault');}
function renderDashboard(stats,history,iranInternet){
  $('#discovered').textContent=num(stats.discovered_nodes??0,{maximumFractionDigits:0});$('#scanned').textContent=num(stats.scanned_nodes??0,{maximumFractionDigits:0});$('#online').textContent=num(stats.online_nodes??0,{maximumFractionDigits:0});$('#onlineRate').textContent=t('onlineRate',{percent:percent(stats.online_rate||0,1)});$('#latency').textContent=stats.avg_latency_ms?`${num(Math.round(stats.avg_latency_ms),{maximumFractionDigits:0})} ms`:'—';$('#avgScore').textContent=num(stats.avg_score||0,{minimumFractionDigits:1,maximumFractionDigits:1});$('#reality').textContent=num(stats.reality_nodes??0,{maximumFractionDigits:0});$('#lastUpdate').textContent=fmtTime(stats.generated_at);updateFreshness(stats.generated_at);
  renderSmartProfiles(stats.subscriptions||{});renderIranInternet(iranInternet);
  if(currentView==='compact'){
    renderCompactDashboard(stats,history);
  }else{
    renderSubscriptions(stats.subscriptions||{});renderCountries(stats.country_subscriptions||{});renderConnectionIntelligence(stats);renderHistory(history);renderProtocols(stats.protocols||{});renderHealth(stats.statuses||{});
    const tested=Number(stats.egress_tested_nodes||0),verified=Number(stats.egress_verified_nodes||0),geolocated=Number(stats.egress_geolocated_nodes||0),countries=Number(stats.egress_country_count||0);$('#egressSummary').textContent=stats.egress_runtime_available?t('egressSummary',{verified:num(verified,{maximumFractionDigits:0}),tested:num(tested,{maximumFractionDigits:0}),geo:num(geolocated,{maximumFractionDigits:0}),countries:num(countries,{maximumFractionDigits:0})}):t('egressUnavailable');
  }
  const repo=`https://github.com/${project.repository}`;$('#repoLink').href=repo;$('#actionsLink').href=`${repo}/actions`;setNotice('ok',t('liveSnapshot',{level:testLevelLabel(stats.test_level)}));
  auditInteractiveControls();
}
function initStaticActions(){
  const repo=`https://github.com/${project.repository}`;
  const repoLink=$('#repoLink'),actionsLink=$('#actionsLink');
  if(repoLink&&!repoLink.getAttribute('href'))repoLink.href=repo;
  if(actionsLink&&!actionsLink.getAttribute('href'))actionsLink.href=`${repo}/actions`;
}
function auditInteractiveControls(){
  const supportedButton=(button)=>Boolean(
    button.id==='refreshBtn'||button.id==='themeToggle'||button.id==='moreToggle'||button.id==='appDownloadToggle'||
    button.matches('[data-lang],[data-view],[data-theme-choice],[data-switch-advanced],[data-close-qr],[data-close-app-downloads],[data-copy],[data-profile],[data-favorite-country],[data-qr]')
  );
  const deadButtons=$$('button').filter(button=>!supportedButton(button));
  const deadLinks=$$('a').filter(link=>!link.getAttribute('href'));
  if(deadButtons.length||deadLinks.length){
    console.error('ProxyPulse UI audit failed',{deadButtons,deadLinks});
    deadButtons.forEach(button=>{button.disabled=true;button.setAttribute('aria-disabled','true');button.title='Unavailable control';});
  }
  return {deadButtons:deadButtons.length,deadLinks:deadLinks.length};
}

async function load(){setNotice('loading',t('loadingSnapshot'));lastLoadError='';try{const [stats,proj,history,iranInternet]=await Promise.all([getJSON('./data/stats.json'),getJSON('./data/project.json'),getJSONOptional('./data/history.json',[]),getJSONOptional('./data/iran_internet.json',{available:false,status:'unknown'})]);latestStats=stats;latestHistory=history;latestIranInternet=iranInternet;project=proj||project;renderDashboard(stats,history,iranInternet);}catch(err){lastLoadError=err.message;setNotice('bad',t('loadError',{error:err.message}));updateFreshness(null);}}

document.addEventListener('click',(event)=>{
  const lang=event.target.closest('[data-lang]');if(lang){setLanguage(lang.dataset.lang);return;}
  const view=event.target.closest('.view-option[data-view]');if(view){setView(view.dataset.view);return;}
  if(event.target.closest('[data-switch-advanced]')){setView('advanced');window.scrollTo({top:0,behavior:'smooth'});return;}
  const theme=event.target.closest('[data-theme-choice]');if(theme){setTheme(theme.dataset.themeChoice);toggleThemeMenu(false);return;}
  if(!event.target.closest('.theme-control'))toggleThemeMenu(false);
  if(!event.target.closest('.more-control'))toggleMoreMenu(false);
  if(event.target.closest('#appDownloadToggle')){toggleAppDownloads();return;}
  if(event.target.closest('[data-close-app-downloads]')){closeAppDownloads();return;}
  if(!event.target.closest('#appDownloadPopover'))closeAppDownloads();
  const copy=event.target.closest('[data-copy]');if(copy){copyText(copy.dataset.copy||'');return;}
  const profile=event.target.closest('[data-profile]');if(profile){activeProfile=String(profile.dataset.profile||'balanced');renderSmartProfiles(currentProfileManifest);return;}
  const favorite=event.target.closest('[data-favorite-country]');if(favorite){const key=String(favorite.dataset.favoriteCountry||'').toLowerCase(),favorites=loadFavorites();if(favorites.has(key)){favorites.delete(key);showToast(t('favRemoved'));}else{favorites.add(key);showToast(t('favAdded'));}saveFavorites(favorites);renderCountries(currentCountryManifest);return;}
  const qr=event.target.closest('[data-qr]');if(qr){openQr(qr.dataset.qr,qr.dataset.qrTitle||t('subscriptionQr'));return;}
  if(event.target.closest('[data-close-qr]'))closeQr();
});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeQr();closeAppDownloads();toggleThemeMenu(false);toggleMoreMenu(false);}});
window.addEventListener('resize',()=>{if($('#appDownloadPopover')?.classList.contains('show'))positionAppDownloadPopover();});
$('#refreshBtn').addEventListener('click',load);
$('#themeToggle').addEventListener('click',(event)=>{event.stopPropagation();toggleThemeMenu();toggleMoreMenu(false);});
$('#moreToggle').addEventListener('click',(event)=>{event.stopPropagation();toggleMoreMenu();toggleThemeMenu(false);});
setInterval(()=>{if(latestStats)updateFreshness(latestStats.generated_at);},60000);
setTheme(currentTheme,{persist:false});
setView(currentView,{persist:false,rerender:false});
setLanguage(currentLang,{persist:false,rerender:false});
initStaticActions();
auditInteractiveControls();
load();
