import { LanguageMode } from '../types/workspace';

export interface Translations {
  appName: string;
  tagline: string;
  banglaSubline: string;
  privacyBadge: string;
  nav: {
    home: string;
    pdfStudio: string;
    imageStudio: string;
    bgRemover: string;
    creativeStudio: string;
    whiteboard: string;
    batchStudio: string;
    convertStudio: string;
    ocrStudio: string;
    docIntel: string;
    sheetIntel: string;
    slidesIntel: string;
    formsHub: string;
    officePack: string;
    aiCommandCenter: string;
    aiAssistant: string;
    recent: string;
    privacy: string;
    help: string;
    jobs: string;
  };
  universal: {
    dropTitle: string;
    dropSubtitle: string;
    browseFiles: string;
    detectedType: string;
    size: string;
    suggestedActions: string;
    clearFile: string;
    unsupportedTitle: string;
    unsupportedPhase1Note: string;
  };
  pdf: {
    title: string;
    subtitle: string;
    merge: string;
    split: string;
    extract: string;
    deletePages: string;
    rotate: string;
    imagesToPdf: string;
    metadata: string;
    compress: string;
    addFiles: string;
    pageRange: string;
    rotateAngle: string;
    processBtn: string;
    processing: string;
    originalSize: string;
    newSize: string;
    reduction: string;
    noReductionNote: string;
    noFakeOcrNote: string;
    intelTab: string;
    searchPlaceholder: string;
    copyPage: string;
    exportTxt: string;
  };
  image: {
    title: string;
    subtitle: string;
    resize: string;
    compress: string;
    crop: string;
    rotate: string;
    flip: string;
    convertFormat: string;
    quality: string;
    width: string;
    height: string;
    lockAspect: string;
    processBtn: string;
    beforeAfter: string;
    futureAiNotice: string;
  };
  batch: {
    title: string;
    subtitle: string;
    resizeBatch: string;
    compressBatch: string;
    convertBatch: string;
    imagesToSinglePdf: string;
    pdfsToSinglePdf: string;
    queueStatus: string;
    downloadAllZip: string;
    clearQueue: string;
    isolationNotice: string;
  };
  convert: {
    title: string;
    subtitle: string;
    realConversions: string;
    futureConversions: string;
    comingInFuture: string;
  };
  ocr: {
    title: string;
    subtitle: string;
    selectLang: string;
    langEng: string;
    langBen: string;
    langMixed: string;
    preprocess: string;
    grayscale: string;
    contrast: string;
    brightness: string;
    threshold: string;
    startOcr: string;
    confidence: string;
    copyText: string;
    downloadTxt: string;
    downloadCleaned: string;
    scannedPdfNotice: string;
  };
  docIntel: {
    title: string;
    subtitle: string;
    outline: string;
    metrics: string;
    words: string;
    chars: string;
    readingTime: string;
    downloadTxt: string;
    exportDocx: string;
  };
  sheetIntel: {
    title: string;
    subtitle: string;
    sheets: string;
    rows: string;
    cols: string;
    emptyRows: string;
    duplicates: string;
    cleanDuplicates: string;
    exportCsv: string;
  };
  slidesIntel: {
    title: string;
    subtitle: string;
    slidesCount: string;
    totalWords: string;
    downloadTxt: string;
    phase3Note: string;
  };
  aiAssistant: {
    title: string;
    subtitle: string;
    notConfigured: string;
    privacyBadge: string;
    consentTitle: string;
    consentMessage: string;
    cancel: string;
    continue: string;
    askPlaceholder: string;
    send: string;
    chips: {
      summarize: string;
      explain: string;
      translate: string;
      dates: string;
      actions: string;
    };
  };
  privacyModes: {
    local: string;
    cloudAi: string;
  };
  privacyModal: {
    title: string;
    assurance: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    bullet4: string;
    close: string;
  };
  common: {
    download: string;
    clearAll: string;
    completed: string;
    failed: string;
    processing: string;
    waiting: string;
    cancelled: string;
    remove: string;
    viewHistory: string;
    clearHistory: string;
    emptyHistory: string;
    bytes: string;
  };
  futureModules: {
    docStudio: string;
    sheetStudio: string;
    presentationStudio: string;
    scanOcr: string;
    aiAssistant: string;
    comingSoonBadge: string;
    aiExampleTitle: string;
    aiExample1: string;
    aiExample2: string;
    aiExample3: string;
    aiDisclosure: string;
  };
}

export const translations: Record<LanguageMode, Translations> = {
  bn: {
    appName: 'MAISHAA WORKSPACE',
    tagline: 'One Workspace. Every Office Task.',
    banglaSubline: 'এক জায়গায় আপনার সব অফিস কাজ।',
    privacyBadge: 'যেখানে সম্ভব, আপনার ফাইল আপনার ব্রাউজারেই প্রসেস করা হয়।',
    nav: {
      home: 'হোম',
      pdfStudio: 'পিডিএফ স্টুডিও',
      imageStudio: 'ছবি স্টুডিও',
      bgRemover: 'ব্যাকগ্রাউন্ড রিমুভার',
      creativeStudio: 'ক্রিয়েটিভ ডিজাইন স্টুডিও',
      whiteboard: 'ইনফিনিট হোয়াইটবোর্ড',
      batchStudio: 'ব্যাচ প্রসেসিং',
      convertStudio: 'কনভার্ট স্টুডিও',
      ocrStudio: 'স্ক্যান ও ওসিআর',
      docIntel: 'ডকুমেন্ট ইন্টেলিজেন্স',
      sheetIntel: 'স্প্রেডশিট ডেটা',
      slidesIntel: 'স্লাইড প্রেজেন্টেশন',
      formsHub: 'ফর্মস ও টেমপ্লেট',
      officePack: 'অফিস প্যাক',
      aiCommandCenter: 'এআই কমান্ড সেন্টার',
      aiAssistant: 'মায়িশা অ্যাসিস্ট্যান্ট',
      recent: 'সাম্প্রতিক ইতিহাস',
      privacy: 'গোপনীয়তা নীতি',
      help: 'সাহায্য ও নিয়মাবলী',
      jobs: 'কাজের তালিকা',
    },
    universal: {
      dropTitle: 'এখানে ফাইল ড্র্যাগ ও ড্রপ করুন',
      dropSubtitle: 'অথবা আপনার কম্পিউটার বা ডিভাইস থেকে ফাইল নির্বাচন করুন (PDF, ছবি, অফিস ফাইল)',
      browseFiles: 'ফাইল নির্বাচন করুন',
      detectedType: 'শনাক্তকৃত ফাইলের ধরন',
      size: 'ফাইলের আকার',
      suggestedActions: 'প্রস্তাবিত প্রয়োজনীয় অ্যাকশন',
      clearFile: 'ফাইল পরিবর্তন করুন',
      unsupportedTitle: 'অফিস ডকুমেন্ট শনাক্ত হয়েছে',
      unsupportedPhase1Note: 'এই ফাইলটি শনাক্ত করা হয়েছে, তবে এই টুলটি পরবর্তী সংস্করণে সম্পূর্ণভাবে সমর্থিত হবে।',
    },
    pdf: {
      title: 'পিডিএফ স্টুডিও (PDF Studio)',
      subtitle: 'ব্রাউজারে সরাসরি এবং নিরাপদে পিডিএফ ফাইল প্রসেস করুন। ফাইল কোনো সার্ভারে আপলোড হয় না।',
      merge: 'পিডিএফ একত্রীকরণ (Merge)',
      split: 'পিডিএফ বিভাজন (Split)',
      extract: 'নির্দিষ্ট পৃষ্ঠা পৃথকীকরণ (Extract)',
      deletePages: 'পৃষ্ঠা অপসারণ (Delete Pages)',
      rotate: 'পৃষ্ঠা ঘোরান (Rotate)',
      imagesToPdf: 'ছবি থেকে পিডিএফ (Images to PDF)',
      metadata: 'পিডিএফ মেটাডাটা ও তথ্য',
      compress: 'পিডিএফ সাইজ অপটিমাইজেশন (Compress)',
      addFiles: '+ আরও পিডিএফ ফাইল যুক্ত করুন',
      pageRange: 'পৃষ্ঠার নম্বর বা রেঞ্জ (যেমন: 1, 3-5)',
      rotateAngle: 'ঘোরানোর কোণ',
      processBtn: 'প্রসেসিং শুরু করুন',
      processing: 'প্রসেস হচ্ছে...',
      originalSize: 'মূল সাইজ',
      newSize: 'নতুন সাইজ',
      reduction: 'হ্রাস পেয়েছে',
      noReductionNote: 'এই পিডিএফ ফাইলটি ইতিমধ্যে সর্বোচ্চ অপ্টিমাইজ করা, তাই সাইজ আর কমানো সম্ভব হয়নি।',
      noFakeOcrNote: 'সতর্কতা: কোনো ভুয়া ওকালতি বা ফেক ওসিআর নেই। উচ্চমানের ক্লাউড ওসিআর পরবর্তী ফেজে আসবে।',
      intelTab: 'পিডিএফ টেক্সট ও বিশ্লেষণ',
      searchPlaceholder: 'পিডিএফ টেক্সট খুঁজুন...',
      copyPage: 'পৃষ্ঠার টেক্সট কপি করুন',
      exportTxt: 'টেক্সট হিসেবে ডাউনলোড',
    },
    image: {
      title: 'ছবি স্টুডিও (Image Studio)',
      subtitle: 'ব্রাউজার ক্যানভাসের মাধ্যমে সরাসরি আকার পরিবর্তন, কম্প্রেশন এবং ফরম্যাট রূপান্তর করুন।',
      resize: 'রিসাইজ (Resize)',
      compress: 'কম্প্রেশন (Compress)',
      crop: 'ক্রপ (Crop)',
      rotate: 'ঘোরান (Rotate)',
      flip: 'ফ্লিপ (Flip)',
      convertFormat: 'ফরম্যাট কনভার্ট',
      quality: 'ছবির কোয়ালিটি',
      width: 'প্রস্থ (px)',
      height: 'উচ্চতা (px)',
      lockAspect: 'অনুপাত স্থির রাখুন',
      processBtn: 'ছবি প্রসেস করুন',
      beforeAfter: 'আগের ও পরের তুলনা',
      futureAiNotice: 'এআই ব্যাকগ্রাউন্ড রিমুভাল, রিটাচ এবং সুপার-রেজোলিউশন সক্রিয় রয়েছে।',
    },
    batch: {
      title: 'ব্যাচ স্টুডিও (Batch Studio)',
      subtitle: 'একসাথে একাধিক ফাইল প্রসেস করুন। একটি ফাইল ত্রুটিপূর্ণ হলেও বাকি কাজ থামবে না।',
      resizeBatch: 'ব্যাচ ইমেজ রিসাইজ',
      compressBatch: 'ব্যাচ ইমেজ কম্প্রেশন',
      convertBatch: 'ব্যাচ ফরম্যাট কনভার্ট',
      imagesToSinglePdf: 'একাধিক ছবি → একটি পিডিএফ',
      pdfsToSinglePdf: 'একাধিক পিডিএফ একত্রীকরণ',
      queueStatus: 'সারির অবস্থা',
      downloadAllZip: 'সব ফাইল জিপে ডাউনলোড',
      clearQueue: 'সারি খালি করুন',
      isolationNotice: 'ব্যর্থতা বিচ্ছিন্নতা: একটি ফাইলের ত্রুটি অন্য কোনো ফাইলের কাজ ব্যাহত করে না।',
    },
    convert: {
      title: 'কনভার্ট স্টুডিও (Convert Studio)',
      subtitle: 'শুধুমাত্র ১০০% খাঁটি ও নির্ভরযোগ্য ব্রাউজার রূপান্তরসমূহ ফেজ ১-এ উন্মুক্ত রাখা হয়েছে।',
      realConversions: 'সক্রিয় রূপান্তরসমূহ',
      futureConversions: 'পরবর্তী সংস্করণের জন্য সংরক্ষিত',
      comingInFuture: 'পরবর্তী সংস্করণে আসছে',
    },
    ocr: {
      title: 'স্ক্যান ও ওসিআর স্টুডিও (Scan & OCR Studio)',
      subtitle: 'খাঁটি ব্রাউজার-ফার্স্ট অপটিক্যাল ক্যারেক্টার রিকগনিশন। কোনো কাল্পনিক বা ভুয়া টেক্সট নেই।',
      selectLang: 'ওসিআর ভাষা নির্বাচন',
      langEng: 'ইংরেজি (English)',
      langBen: 'বাংলা (Bengali)',
      langMixed: 'বাংলা + ইংরেজি (Mixed)',
      preprocess: 'ইমেজ প্রি-প্রসেসিং ফিল্টার',
      grayscale: 'সাদা-কালো (Grayscale)',
      contrast: 'কনট্রাস্ট বাড়ানো',
      brightness: 'উজ্জ্বলতা বাড়ানো',
      threshold: 'বাইনারি থ্রেশহোল্ড (B&W)',
      startOcr: 'ওসিআর টেক্সট এক্সট্রাক্ট করুন',
      confidence: 'ওসিআর নির্ভুলতা হার',
      copyText: 'টেক্সট কপি করুন',
      downloadTxt: 'TXT ডাউনলোড',
      downloadCleaned: 'ক্লিনড TXT ডাউনলোড',
      scannedPdfNotice: 'স্ক্যানড ডকুমেন্টের জন্য পেজ-বাই-পেজ ওসিআর এবং সার্চেবল পিডিএফ জেনারেশন সক্রিয় রয়েছে।',
    },
    docIntel: {
      title: 'ডকুমেন্ট ইন্টেলিজেন্স (DOCX / TXT)',
      subtitle: 'ওয়ার্ড ও টেক্সট ডকুমেন্টের অভ্যন্তরীণ অনুচ্ছেদ, শিরোনাম ও পরিসংখ্যান বিশ্লেষণ।',
      outline: 'ডকুমেন্ট আউটলাইন ও শিরোনাম',
      metrics: 'ডকুমেন্ট পরিসংখ্যান',
      words: 'মোট শব্দ',
      chars: 'মোট ক্যারেক্টার',
      readingTime: 'পড়ার আনুমানিক সময়',
      downloadTxt: 'টেক্সট ডাউনলোড',
      exportDocx: 'বেসিক DOCX (Text Only) তৈরি',
    },
    sheetIntel: {
      title: 'স্প্রেডশিট ইন্টেলিজেন্স (XLSX / CSV)',
      subtitle: 'এক্সেল ও সিএসভি ডেটাসেট প্রিভিউ, ডুপ্লিকেট শনাক্তকরণ ও পরিচ্ছন্নকরণ।',
      sheets: 'শিট তালিকা',
      rows: 'মোট রো (Row)',
      cols: 'মোট কলাম',
      emptyRows: 'খালি রো',
      duplicates: 'ডুপ্লিকেট রো',
      cleanDuplicates: 'ডুপ্লিকেট অপসারণ করুন',
      exportCsv: 'নির্বাচিত শিট CSV ডাউনলোড',
    },
    slidesIntel: {
      title: 'প্রেজেন্টেশন ইন্টেলিজেন্স (PPTX)',
      subtitle: 'পাওয়ারপয়েন্ট স্লাইড ডেক থেকে টেক্সট ও শিরোনাম কাঠামো আহরণ।',
      slidesCount: 'মোট স্লাইড',
      totalWords: 'মোট শব্দসংখ্যা',
      downloadTxt: 'সব স্লাইড টেক্সট ডাউনলোড',
      phase3Note: 'সম্পূর্ণ ভিজ্যুয়াল প্রেজেন্টেশন ও স্লাইড এডিটর সক্রিয় রয়েছে।',
    },
    aiAssistant: {
      title: 'মায়িশা অ্যাসিস্ট্যান্ট (Ask MAISHAA)',
      subtitle: 'ডকুমেন্ট-ভিত্তিক সত্যনিষ্ঠ কৃত্রিম বুদ্ধিমত্তা। কোনো তথ্য অনুপস্থিত থাকলে সরাসরি জানিয়ে দেওয়া হয়।',
      notConfigured: 'AI Assistant বর্তমানে কনফিগার করা নেই। (সার্ভারে GEMINI_API_KEY সেট করুন)',
      privacyBadge: 'ক্লাউড এআই — ব্যবহারকারীর সম্মতি সাপেক্ষে',
      consentTitle: 'ক্লাউড এআই ব্যবহারের অনুমতি',
      consentMessage: 'AI বিশ্লেষণের জন্য নির্বাচিত টেক্সট নিরাপদ সার্ভার হয়ে AI সেবায় পাঠানো হবে। চালিয়ে যাবেন?',
      cancel: 'বাতিল',
      continue: 'অনুমতি দিয়ে এগিয়ে যান',
      askPlaceholder: 'ডকুমেন্ট সম্পর্কে প্রশ্ন করুন বা সারসংক্ষেপ চান...',
      send: 'পাঠান',
      chips: {
        summarize: 'এই ডকুমেন্টটা সংক্ষেপে বুঝিয়ে বলুন',
        explain: 'মূল ৫টি পয়েন্ট বের করুন',
        translate: 'বাংলায় অনুবাদ করুন',
        dates: 'তারিখ ও ডেডলাইন বের করুন',
        actions: 'করণীয় কাজের তালিকা (Action Items)',
      },
    },
    privacyModes: {
      local: 'স্থানীয় প্রসেসিং (Local Processing)',
      cloudAi: 'ক্লাউড এআই — অনুমতি প্রয়োজন (Cloud AI)',
    },
    privacyModal: {
      title: 'ক্লায়েন্ট-সাইড প্রাইভেসি আর্কিটেকচার',
      assurance: 'আপনার ব্যক্তিগত ও প্রাতিষ্ঠানিক ফাইলসমূহ সম্পূর্ণ গোপনীয় রাখা আমাদের প্রথম অঙ্গীকার।',
      bullet1: 'যেখানে সম্ভব, আপনার ফাইল ব্রাউজারেই প্রক্রিয়াজাত হয়। কোনো বাহ্যিক সার্ভারে পাঠানো হয় না।',
      bullet2: 'ফাইলগুলো অস্থায়ী মেমরিতে থাকে এবং ব্রাউজার রিলোড বা বন্ধের সাথে সাথে মুছে যায়।',
      bullet3: 'ব্যবহারকারীর ডেটা কখনো লগ বা স্থায়ীভাবে সংরক্ষণ করা হয় না। localStorage-এ কেবল নামমাত্র সেটিংস থাকে।',
      bullet4: '১০০% ক্লায়েন্ট-অথরিটেটিভ ও নিরাপদ এক্সেকিউশন।',
      close: 'বুঝেছি',
    },
    common: {
      download: 'ডাউনলোড',
      clearAll: 'সব মুছুন',
      completed: 'সম্পন্ন',
      failed: 'ব্যর্থ',
      processing: 'প্রসেস হচ্ছে',
      waiting: 'অপেক্ষমাণ',
      cancelled: 'বাতিল',
      remove: 'মুছুন',
      viewHistory: 'সেশন ইতিহাস',
      clearHistory: 'ইতিহাস মুছুন',
      emptyHistory: 'বর্তমান ব্রাউজার সেশনে কোনো কাজের ইতিহাস নেই।',
      bytes: 'বাইট',
    },
    futureModules: {
      docStudio: 'ডকুমেন্ট স্টুডিও (Word/DOCX)',
      sheetStudio: 'স্প্রেডশিট স্টুডিও (Excel/XLSX)',
      presentationStudio: 'প্রেজেন্টেশন স্টুডিও (PPTX)',
      scanOcr: 'স্ক্যান ও ওসিআর (Scan & OCR)',
      aiAssistant: 'মায়িশা অ্যাসিস্ট্যান্ট (Ask MAISHAA)',
      comingSoonBadge: 'পরবর্তী সংস্করণ',
      aiExampleTitle: 'ভবিষ্যৎ এআই কমান্ডের কিছু নমুনা:',
      aiExample1: '• "এই পিডিএফটি সংক্ষেপে ৫ পৃষ্ঠার মধ্যে বুঝিয়ে দিন"',
      aiExample2: '• "২০টি স্ক্যান ফাইল মিলিয়ে একটি একক ডকুমেন্টে রূপান্তর করুন"',
      aiExample3: '• "সব ছবির রেজোলিউশন ১২০০ পিক্সেলে রিসাইজ করুন"',
      aiDisclosure: 'ফেজ ১ স্বচ্ছতা নোটিশ: কোনো ভুয়া এআই বা ফেক চ্যাটবট অন্তর্ভুক্ত করা হয়নি। সত্যিকারের লোকাল এআই অটোমেশন ইঞ্জিন পরবর্তী ফেজে যুক্ত হবে।',
    },
  },
  en: {
    appName: 'MAISHAA WORKSPACE',
    tagline: 'One Workspace. Every Office Task.',
    banglaSubline: 'এক জায়গায় আপনার সব অফিস কাজ।',
    privacyBadge: 'Whenever possible, your files are processed locally in your browser.',
    nav: {
      home: 'Home',
      pdfStudio: 'PDF Studio',
      imageStudio: 'Image Studio',
      bgRemover: 'Background Remover',
      creativeStudio: 'Creative Design Studio',
      whiteboard: 'Infinite Whiteboard',
      batchStudio: 'Batch Studio',
      convertStudio: 'Convert Studio',
      ocrStudio: 'Scan & OCR',
      docIntel: 'Document Intelligence',
      sheetIntel: 'Spreadsheet Intelligence',
      slidesIntel: 'Presentation Intelligence',
      formsHub: 'Forms / Templates',
      officePack: 'Office Pack',
      aiCommandCenter: 'AI Command Center',
      aiAssistant: 'Ask MAISHAA',
      recent: 'Session History',
      privacy: 'Privacy Policy',
      help: 'Help & Guide',
      jobs: 'Job Manager',
    },
    universal: {
      dropTitle: 'Drag and Drop Office Files Here',
      dropSubtitle: 'or choose files from your computer (PDF, images, spreadsheets, and office docs)',
      browseFiles: 'Select Files',
      detectedType: 'Detected File Type',
      size: 'File Size',
      suggestedActions: 'Suggested Actions',
      clearFile: 'Clear File',
      unsupportedTitle: 'Office Document Detected',
      unsupportedPhase1Note: 'This file has been recognized, but full processing will be supported in a future version.',
    },
    pdf: {
      title: 'PDF Studio',
      subtitle: 'Process PDF documents safely and directly in your browser without uploading to external servers.',
      merge: 'Merge PDF',
      split: 'Split PDF',
      extract: 'Extract Pages',
      deletePages: 'Delete Pages',
      rotate: 'Rotate Pages',
      imagesToPdf: 'Images to PDF',
      metadata: 'PDF Properties & Metadata',
      compress: 'Optimize & Compress PDF',
      addFiles: '+ Add More PDF Files',
      pageRange: 'Page Range or Numbers (e.g. 1, 3-5)',
      rotateAngle: 'Rotation Angle',
      processBtn: 'Execute Process',
      processing: 'Processing...',
      originalSize: 'Original Size',
      newSize: 'New Size',
      reduction: 'Reduction',
      noReductionNote: 'This PDF file is already optimal. No meaningful byte reduction was possible without losing quality.',
      noFakeOcrNote: 'Notice: Zero fake OCR capability. Authentic OCR engine available in Scan & OCR Studio.',
      intelTab: 'PDF Text & Intelligence',
      searchPlaceholder: 'Search in extracted PDF text...',
      copyPage: 'Copy Page Text',
      exportTxt: 'Download Text (TXT)',
    },
    image: {
      title: 'Image Studio',
      subtitle: 'Resize, compress, crop, and convert images via client-side HTML5 canvas processing.',
      resize: 'Resize',
      compress: 'Compress',
      crop: 'Crop',
      rotate: 'Rotate',
      flip: 'Flip',
      convertFormat: 'Convert Format',
      quality: 'Image Quality',
      width: 'Width (px)',
      height: 'Height (px)',
      lockAspect: 'Lock Aspect Ratio',
      processBtn: 'Process Image',
      beforeAfter: 'Before & After Comparison',
      futureAiNotice: 'Client-side background removal, photo retouch, and super-resolution are active.',
    },
    batch: {
      title: 'Batch Studio',
      subtitle: 'Process multiple files simultaneously. One failing file will never crash the whole queue.',
      resizeBatch: 'Batch Image Resize',
      compressBatch: 'Batch Image Compress',
      convertBatch: 'Batch Format Convert',
      imagesToSinglePdf: 'Combine Images into One PDF',
      pdfsToSinglePdf: 'Merge Multiple PDFs',
      queueStatus: 'Queue Status',
      downloadAllZip: 'Download All as ZIP',
      clearQueue: 'Clear Queue',
      isolationNotice: 'Failure Isolation: An individual corrupt file will not halt the remaining batch.',
    },
    convert: {
      title: 'Convert Studio',
      subtitle: 'Only 100% genuine and reliable browser-side conversions are exposed in Phase 1.',
      realConversions: 'Active Conversions',
      futureConversions: 'Coming in a future phase',
      comingInFuture: 'Coming in a future phase',
    },
    ocr: {
      title: 'Scan & OCR Studio',
      subtitle: 'Authentic local-first optical character recognition. No fake outputs or simulated hallucinations.',
      selectLang: 'OCR Recognition Language',
      langEng: 'English',
      langBen: 'Bengali (বাংলা)',
      langMixed: 'Bengali + English (Mixed)',
      preprocess: 'Image Preprocessing Filters',
      grayscale: 'Grayscale',
      contrast: 'Enhance Contrast',
      brightness: 'Adjust Brightness',
      threshold: 'Binary Threshold (B&W)',
      startOcr: 'Extract Text via OCR',
      confidence: 'OCR Confidence Score',
      copyText: 'Copy Text',
      downloadTxt: 'Download TXT',
      downloadCleaned: 'Download Cleaned TXT',
      scannedPdfNotice: 'Page-by-page OCR and Searchable PDF generation are active and operational.',
    },
    docIntel: {
      title: 'Document Intelligence (DOCX / TXT)',
      subtitle: 'Deep text, heading structure, table inspection, and word metric analysis for Word documents.',
      outline: 'Document Outline & Headings',
      metrics: 'Document Statistics',
      words: 'Total Words',
      chars: 'Total Characters',
      readingTime: 'Estimated Reading Time',
      downloadTxt: 'Download Extracted TXT',
      exportDocx: 'Export Basic DOCX (Text Only)',
    },
    sheetIntel: {
      title: 'Spreadsheet Intelligence (XLSX / CSV)',
      subtitle: 'Workbook preview, column data typing, empty row count, and duplicate row detection.',
      sheets: 'Worksheets',
      rows: 'Total Rows',
      cols: 'Total Columns',
      emptyRows: 'Empty Rows',
      duplicates: 'Duplicate Rows',
      cleanDuplicates: 'Remove Duplicate Rows',
      exportCsv: 'Export Sheet to CSV',
    },
    slidesIntel: {
      title: 'Presentation Intelligence (PPTX)',
      subtitle: 'Extract slide-by-slide text, titles, and word count from PowerPoint presentations.',
      slidesCount: 'Total Slides',
      totalWords: 'Total Word Count',
      downloadTxt: 'Download Slide Text (TXT)',
      phase3Note: 'Full visual presentation and slide editor is active.',
    },
    aiAssistant: {
      title: 'Ask MAISHAA (AI Assistant)',
      subtitle: 'Strictly grounded document assistant. If information is absent in source, it explicitly states so.',
      notConfigured: 'AI Assistant currently not configured. (Please configure GEMINI_API_KEY in server environment)',
      privacyBadge: 'Cloud AI — Consent Required',
      consentTitle: 'Cloud AI Processing Consent',
      consentMessage: 'To analyze this document, selected text will be sent securely to the AI provider. Proceed?',
      cancel: 'Cancel',
      continue: 'Grant Consent & Proceed',
      askPlaceholder: 'Ask a question or request a summary of this document...',
      send: 'Send',
      chips: {
        summarize: 'Summarize this document briefly',
        explain: 'Extract the top 5 key takeaways',
        translate: 'Translate this text into English',
        dates: 'Extract all dates and deadlines',
        actions: 'List all action items',
      },
    },
    privacyModes: {
      local: 'Local Processing',
      cloudAi: 'Cloud AI — Consent Required',
    },
    privacyModal: {
      title: 'Local-First Privacy Architecture',
      assurance: 'The security of your confidential corporate files is our uncompromising priority.',
      bullet1: 'Whenever possible, your files are processed locally in your browser. No files are uploaded to external servers.',
      bullet2: 'Files reside temporarily in browser memory and are revoked immediately after download or session close.',
      bullet3: 'No user file contents are logged or permanently stored. localStorage holds only minimal metadata.',
      bullet4: '100% private, client-authoritative execution.',
      close: 'Understood',
    },
    common: {
      download: 'Download',
      clearAll: 'Clear All',
      completed: 'Completed',
      failed: 'Failed',
      processing: 'Processing',
      waiting: 'Waiting',
      cancelled: 'Cancelled',
      remove: 'Remove',
      viewHistory: 'Session History',
      clearHistory: 'Clear History',
      emptyHistory: 'No processing history recorded in this browser session yet.',
      bytes: 'bytes',
    },
    futureModules: {
      docStudio: 'Document Studio (Word/DOCX)',
      sheetStudio: 'Spreadsheet Studio (Excel/XLSX)',
      presentationStudio: 'Presentation Studio (PPTX)',
      scanOcr: 'Scan & OCR',
      aiAssistant: 'AI Assistant',
      comingSoonBadge: 'Coming Soon',
      aiExampleTitle: 'Future AI Assistant command examples:',
      aiExample1: '• "Reduce this PDF to under 5MB"',
      aiExample2: '• "Combine 20 scans into a single PDF"',
      aiExample3: '• "Resize all images to 1200px width"',
      aiDisclosure: 'Phase 1 Disclosure: No fake AI responses or simulated chat. True local-first AI automation will arrive in Phase 2.',
    },
  },
};
