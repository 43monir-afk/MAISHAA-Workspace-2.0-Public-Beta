/**
 * MAISHAA WORKSPACE — Public SEO & Discoverability Registry
 * Domain: workspace.maishaa.bd
 * 
 * Provides authentic, high-quality metadata, structured headings, step-by-step
 * usage guides, troubleshooting tips, genuine FAQs, and Schema.org JSON-LD definitions.
 */

import { ToolCategory } from '../types/workspace';

export interface SeoFaqItem {
  questionBn: string;
  answerBn: string;
  questionEn: string;
  answerEn: string;
}

export interface PublicRouteSeo {
  path: string;
  module: ToolCategory | 'tutorials' | 'privacy' | 'about';
  subTab?: string;
  titleBn: string;
  titleEn: string;
  metaDescriptionBn: string;
  metaDescriptionEn: string;
  h1Bn: string;
  h1En: string;
  summaryBn: string;
  summaryEn: string;
  instructionsBn: string[];
  instructionsEn: string[];
  supportedFormats: string[];
  limits: string;
  faqs: SeoFaqItem[];
  relatedRoutes: string[];
}

export const CANONICAL_DOMAIN = 'https://workspace.maishaa.bd';

export const PUBLIC_ROUTES_SEO: Record<string, PublicRouteSeo> = {
  '/': {
    path: '/',
    module: 'universal',
    titleBn: 'মায়িশা ওয়ার্কস্পেস — এক জায়গায় আপনার সব অফিস কাজ | MAISHAA WORKSPACE',
    titleEn: 'MAISHAA WORKSPACE — One Workspace. Every Office Task.',
    metaDescriptionBn: 'পিডিএফ মার্চ, স্প্লিট, কম্প্রেস, ব্যাকগ্রাউন্ড রিমুভ, বাংলা ওসিআর ও অফিস ফরম পূরণ করুন নিরাপদে ব্রাউজারে সম্পূর্ণ বিনামূল্যে।',
    metaDescriptionEn: 'Free all-in-one browser workspace for PDF tools, background removal, Bangla OCR, forms generation, and graphic design with 100% client-side privacy.',
    h1Bn: 'মায়িশা ওয়ার্কস্পেস — সব অফিস টুলের নির্ভরযোগ্য প্ল্যাটফর্ম',
    h1En: 'MAISHAA WORKSPACE — All-in-One Office Productivity Suite',
    summaryBn: 'মায়িশা ওয়ার্কস্পেস বাংলাদেশের প্রথম সমন্বিত অফিস স্যুট যা শতভাগ ব্রাউজার-ভিত্তিক প্রক্রিয়াকরণে পিডিএফ এডিট, ইমেজ প্রসেসিং, বাংলা ওসিআর ও ডিজাইন সুবিধা দেয়।',
    summaryEn: 'MAISHAA WORKSPACE is a private, client-first productivity suite delivering PDF organizing, image background matting, Bangla OCR, and design tools.',
    instructionsBn: [
      'যে কোনো ফাইল ড্র্যাগ অ্যান্ড ড্রপ করে সেন্ট্রাল বক্সে আপলোড করুন।',
      'প্রয়োজনীয় টুল নির্বাচন করুন (পিডিএফ, ইমেজ, ওসিআর বা ডিজাইন)।',
      'এক ক্লিকে প্রসেসিং সম্পন্ন করে প্রস্তুত ফাইলটি ডাউনলোড করে নিন।',
    ],
    instructionsEn: [
      'Drop your files into the central workspace upload zone.',
      'Select your desired tool (PDF, Image, OCR, Forms, or Design).',
      'Process your documents instantly and download high-quality results.',
    ],
    supportedFormats: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'WebP', 'TXT'],
    limits: 'ফাইল সাইজ সীমা ১০০ এমবি পর্যন্ত; ফাইল ডিভাইসেই প্রসেস হয়।',
    faqs: [
      {
        questionBn: 'মায়িশা ওয়ার্কস্পেস কি সম্পূর্ণ ফ্রি?',
        answerBn: 'হ্যাঁ, মায়িশা ওয়ার্কস্পেসের সব মূল ফিচার (পিডিএফ মার্চ, সাইজ কমানো, ব্যাকগ্রাউন্ড রিমুভ, বাংলা ওসিআর ইত্যাদি) সম্পূর্ণ বিনামূল্যে ব্যবহার করা যায়।',
        questionEn: 'Is MAISHAA WORKSPACE free to use?',
        answerEn: 'Yes, all core productivity tools including PDF merge, split, compress, background removal, and Bangla OCR are completely free.',
      },
      {
        questionBn: 'আমার ফাইল কি সার্ভারে সংরক্ষিত থাকে?',
        answerBn: 'না। আপনার ফাইল শতভাগ লোকাল ব্রাউজারে প্রসেস হয় এবং কোনো সার্ভার স্টোরেজে সংরক্ষিত হয় না।',
        questionEn: 'Are my files stored on remote servers?',
        answerEn: 'No. Documents are processed locally in your browser sandbox without persistent cloud storage.',
      },
    ],
    relatedRoutes: ['/pdf-studio/merge', '/pdf-studio/compress', '/image-studio/background-remover', '/scan-ocr'],
  },

  '/pdf-studio/merge': {
    path: '/pdf-studio/merge',
    module: 'pdf',
    subTab: 'merge',
    titleBn: 'PDF Merge করার নিয়ম — একাধিক পিডিএফ ফাইল যুক্ত করুন | মায়িশা',
    titleEn: 'Merge PDF Files Online — Combine Multiple PDFs Free | MAISHAA',
    metaDescriptionBn: 'সহজে একাধিক পিডিএফ ফাইল একসঙ্গে মার্জ ও সাজিয়ে নিন। ব্রাউজারে সুরক্ষিত ও দ্রুত পিডিএফ একত্রীকরণ পদ্ধতি।',
    metaDescriptionEn: 'Combine and merge multiple PDF files in your preferred page order. Fast, secure, and client-side processing.',
    h1Bn: 'PDF Merge করার নিয়ম ও একাধিক ফাইল একত্রীকরণ',
    h1En: 'Merge Multiple PDF Files Online',
    summaryBn: 'একাধিক পিডিএফ ডকুমেন্টকে ক্রমানুসারে সাজিয়ে একটি একক ফাইলে যুক্ত করার নিরাপদ অনলাইন টুল।',
    summaryEn: 'Fast and private tool to arrange, reorder, and merge multiple PDF documents into a single organized file.',
    instructionsBn: [
      '‘সিলেক্ট পিডিএফ ফাইল’ বাটনে ক্লিক করুন অথবা একাধিক ফাইল টেনে এনে দিন।',
      'ফাইলগুলোর থাম্বনেইল টেনে কাঙ্ক্ষিত ক্রম বা সিকোয়েন্সে সাজান।',
      '‘Merge PDF Files’ বাটনে ক্লিক করুন এবং মার্জকৃত পিডিএফ ডাউনলোড করুন।',
    ],
    instructionsEn: [
      'Upload two or more PDF files via browse or drag-and-drop.',
      'Reorder the file thumbnails into your desired sequence.',
      'Click Merge PDF Files to combine and download your merged document.',
    ],
    supportedFormats: ['PDF (সকল ভার্সন)'],
    limits: 'সর্বোচ্চ ২০টি ফাইল এবং প্রতিটি ফাইল ৫০ এমবি পর্যন্ত সমর্থিত।',
    faqs: [
      {
        questionBn: 'পিডিএফ ফাইল মার্জ করলে কি লেখার মান নষ্ট হয়?',
        answerBn: 'না, মূল ভেক্টর টেক্সট এবং ফ্রেম হুবহু অপরিবর্তিত থাকে এবং কোনো কোয়ালিটি লস হয় না।',
        questionEn: 'Does merging affect PDF font quality?',
        answerEn: 'No, all original vector fonts and layout streams are preserved perfectly.',
      },
    ],
    relatedRoutes: ['/pdf-studio/split', '/pdf-studio/compress', '/pdf-studio/organize'],
  },

  '/pdf-studio/split': {
    path: '/pdf-studio/split',
    module: 'pdf',
    subTab: 'split',
    titleBn: 'PDF Split করার সহজ নিয়ম — পিডিএফ পৃষ্ঠা আলাদা করুন | মায়িশা',
    titleEn: 'Split PDF Online — Separate Pages & Extract Ranges | MAISHAA',
    metaDescriptionBn: 'পিডিএফ থেকে নির্দিষ্ট পৃষ্ঠা আলাদা বা পেজ রেঞ্জ অনুযায়ী স্প্লিট করুন। বিনামূল্যে বাংলা নির্দেশনাসহ দ্রুত ফলাফল।',
    metaDescriptionEn: 'Split PDF files by specific page ranges, extract single pages, or burst all pages securely.',
    h1Bn: 'PDF পৃষ্ঠা আলাদা ও স্প্লিট করার টুল',
    h1En: 'Split PDF Pages by Range or Extract Single Pages',
    summaryBn: 'বড় পিডিএফ ফাইল থেকে আপনার প্রয়োজনীয় পেজ বা সেকশন আলাদা করে পৃথক পিডিএফ ফাইলে সেভ করুন।',
    summaryEn: 'Extract specific pages, page ranges, or split each page into standalone documents safely.',
    instructionsBn: [
      'আপনার পিডিএফ ফাইলটি আপলোড করুন।',
      'স্প্লিট মোড নির্বাচন করুন (পেজ রেঞ্জ যেমন ১-৫, বা প্রতিটি পৃষ্ঠা আলাদা)।',
      'প্রিভিউ দেখে ‘Split PDF’ বাটনে ক্লিক করুন।',
    ],
    instructionsEn: [
      'Upload your PDF file.',
      'Choose your split mode (e.g. ranges 1-5, single page, or split all).',
      'Click Split PDF to generate and download extracted files.',
    ],
    supportedFormats: ['PDF'],
    limits: '১০০ পৃষ্ঠা পর্যন্ত পিডিএফ এবং ১০০ এমবি ফাইল সাইজ।',
    faqs: [
      {
        questionBn: 'নির্দিষ্ট কোনো একটি পৃষ্ঠা কি বের করা সম্ভব?',
        answerBn: 'হ্যাঁ, পেজ এক্সট্র্যাক্ট অপশনে পৃষ্ঠার নম্বর দিলেই শুধু সেই পৃষ্ঠাটি ডাউনলোড করা যাবে।',
        questionEn: 'Can I extract a single specific page?',
        answerEn: 'Yes, specify the page number in the range input to extract it immediately.',
      },
    ],
    relatedRoutes: ['/pdf-studio/merge', '/pdf-studio/organize', '/pdf-studio/compress'],
  },

  '/pdf-studio/compress': {
    path: '/pdf-studio/compress',
    module: 'pdf',
    subTab: 'compress',
    titleBn: 'PDF ফাইলের সাইজ কমানোর উপায় — PDF Compress করুন | মায়িশা',
    titleEn: 'Compress PDF Online — Reduce PDF File Size Free | MAISHAA',
    metaDescriptionBn: 'কোয়ালিটি ঠিক রেখে পিডিএফ ফাইলের সাইজ কমান। চাকরির আবেদন ও ইমেইলে পাঠানোর জন্য আদর্শ কম্প্রেস টুল।',
    metaDescriptionEn: 'Reduce PDF file size without sacrificing readability. Perfect for job portals and email attachments.',
    h1Bn: 'PDF ফাইলের সাইজ কমানোর উপায় ও অনলাইন কম্প্রেসার',
    h1En: 'Compress PDF File Size While Retaining Quality',
    summaryBn: 'ডকুমেন্টের স্পষ্টতা বজায় রেখে অপ্রয়োজনীয় স্ট্রিম অপটিমাইজ করে ফাইল সাইজ ৬০-৮০% পর্যন্ত কমানোর সুবিধা।',
    summaryEn: 'Lossless stream optimization and balanced image compression to reduce file sizes for easy sharing.',
    instructionsBn: [
      'যে পিডিএফের সাইজ কমাতে চান সেটি আপলোড করুন।',
      'কম্প্রেশন লেভেল নির্বাচন করুন (প্রস্তাবিত ব্যালান্সড বা ম্যাক্সিমাম)।',
      '‘Compress PDF’ বাটনে ক্লিক করুন এবং সাইজ হ্রাসের হার দেখে ফাইল সেভ করুন।',
    ],
    instructionsEn: [
      'Select or drop the PDF file you wish to optimize.',
      'Select compression strength (Standard, Recommended, or High).',
      'Click Compress PDF to inspect exact size reduction and download.',
    ],
    supportedFormats: ['PDF'],
    limits: '১০০ এমবি পর্যন্ত ফাইল সাইজ।',
    faqs: [
      {
        questionBn: 'সরকারি চাকরিতে পিডিএফের সাইজ ২৫০ কেবি বা ৫০০ কেবির নিচে রাখা যায়?',
        answerBn: 'হ্যাঁ, আমাদের কম্প্রেসরে চাকরি ও ভর্তির আবেদনের জন্য সুনির্দিষ্ট সাইজ টার্গেট করা যায়।',
        questionEn: 'Can I compress to meet 250KB or 500KB job application limits?',
        answerEn: 'Yes, the compressor provides balanced presets tailored for official upload quotas.',
      },
    ],
    relatedRoutes: ['/pdf-studio/merge', '/pdf-studio/organize', '/forms-hub'],
  },

  '/pdf-studio/organize': {
    path: '/pdf-studio/organize',
    module: 'pdf',
    subTab: 'organize',
    titleBn: 'PDF পেজ ঘোরানো ও সাজানোর নিয়ম — Rotate & Reorder | মায়িশা',
    titleEn: 'Organize, Rotate & Reorder PDF Pages Online | MAISHAA',
    metaDescriptionBn: 'পিডিএফ পৃষ্ঠা ৯০°, ১৮০° ডিগ্রি ঘোরান, বাদ দিন বা পৃষ্ঠা ক্রম পরিবর্তন করুন সহজেই।',
    metaDescriptionEn: 'Rotate, delete, duplicate, and rearrange PDF page thumbnails visually with zero quality loss.',
    h1Bn: 'PDF পৃষ্ঠা ঘোরানো, মোছা ও সাজানোর নিয়ম',
    h1En: 'Visual PDF Page Organizer and Rotator',
    summaryBn: 'ভিজুয়াল গ্রিডে সব পৃষ্ঠার প্রিভিউ দেখে বাঁকা পৃষ্ঠা সোজা করা ও অপ্রয়োজনীয় পাতা মুছে ফেলার টুল।',
    summaryEn: 'Interactive visual grid to correct page orientation, reorder sequence, and delete redundant pages.',
    instructionsBn: [
      'পিডিএফ ফাইল আপলোড করলে সব পৃষ্ঠার থাম্বনেইল দেখা যাবে।',
      'যেকোনো পৃষ্ঠায় রোটেট বাটনে ক্লিক করে ৯০° বা ১৮০° ঘুরিয়ে নিন।',
      'মাউস দিয়ে টেনে পাতার ক্রম আগে-পিছে সাজিয়ে ‘Save Changes’ করুন।',
    ],
    instructionsEn: [
      'Upload your PDF to view all page thumbnails visually.',
      'Click rotate icons to adjust orientation (90°, 180°, 270°).',
      'Drag and drop pages to reorder, then click Save Changes.',
    ],
    supportedFormats: ['PDF'],
    limits: '৫০টি পৃষ্ঠা পর্যন্ত একবারে সাজানো যায়।',
    faqs: [
      {
        questionBn: 'উল্টো স্ক্যান করা পেজ কি সোজা করা সম্ভব?',
        answerBn: 'হ্যাঁ, যেকোনো বাঁকা বা উল্টো পৃষ্ঠা এক ক্লিকে সঠিক কোণে ঘুরিয়ে নেওয়া যায়।',
        questionEn: 'Can upside-down scanned pages be fixed?',
        answerEn: 'Yes, rotate controls rotate individual pages 90° clockwise or counter-clockwise.',
      },
    ],
    relatedRoutes: ['/pdf-studio/merge', '/pdf-studio/split', '/pdf-studio/compress'],
  },

  '/pdf-studio/convert': {
    path: '/pdf-studio/convert',
    module: 'pdf',
    subTab: 'convert',
    titleBn: 'বাংলা Word থেকে PDF ও PDF রূপান্তর — PDF Converter | মায়িশা',
    titleEn: 'Convert PDF to Word, Excel, PPT & Images | MAISHAA',
    metaDescriptionBn: 'বাংলা ফন্ট ও ফরম্যাটিং অক্ষুণ্ণ রেখে Word থেকে PDF এবং PDF থেকে Word ও ছবি রূপান্তর করুন।',
    metaDescriptionEn: 'Convert PDF to and from DOCX, XLSX, PPTX, JPG, and PNG with full Bengali Unicode support.',
    h1Bn: 'বাংলা Word থেকে PDF ও বহুমুখী PDF কনভার্টার',
    h1En: 'Multi-Format PDF Converter with Bengali Script Fidelity',
    summaryBn: 'বাংলা কমপ্লেক্স স্ক্রিপ্ট (যুক্তাক্ষর) অবিকৃত রেখে নিখুঁত ডকুমেন্ট ও স্প্রেডশীট রূপান্তর।',
    summaryEn: 'High-fidelity document converter engineered to maintain complex Bengali conjuncts and layout structures.',
    instructionsBn: [
      'আপনার Word, Excel, বা PDF ফাইল নির্বাচন করুন।',
      'টার্গেট ফরম্যাট সিলেক্ট করুন (যেমন PDF থেকে DOCX বা Word থেকে PDF)।',
      '‘Convert Now’ বাটনে চাপুন এবং প্রস্তুত ডকুমেন্টটি ডাউনলোড করুন।',
    ],
    instructionsEn: [
      'Select your input file (Word, Excel, PPTX, or PDF).',
      'Select your output target format.',
      'Click Convert Now to download the converted document.',
    ],
    supportedFormats: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG', 'WebP'],
    limits: '৫০ এমবি পর্যন্ত ফাইল সাইজ।',
    faqs: [
      {
        questionBn: 'বাংলা লেখার যুক্তাক্ষর কি কনভার্ট করার পর ভেঙে যায়?',
        answerBn: 'না, মায়িশা কনভার্টার সুলেমানলিপি ও কালপুরুষ ফ্রেমওয়ার্কে অপটিমাইজড হওয়ায় যুক্তবর্ণ অক্ষুণ্ণ থাকে।',
        questionEn: 'Are complex Bengali characters preserved?',
        answerEn: 'Yes, specialized font-shaping ensures Bengali conjuncts remain crisp and accurate.',
      },
    ],
    relatedRoutes: ['/pdf-studio/compress', '/scan-ocr', '/forms-hub'],
  },

  '/image-studio/background-remover': {
    path: '/image-studio/background-remover',
    module: 'bg_remover',
    titleBn: 'ছবির Background Remove করার নিয়ম — ব্যাকগ্রাউন্ড পরিবর্তন | মায়িশা',
    titleEn: 'Remove Background from Image Online — Transparent PNG | MAISHAA',
    metaDescriptionBn: 'এক ক্লিকে ছবির ব্যাকগ্রাউন্ড রিমুভ করে স্বচ্ছ পিএনজি তৈরি করুন। পাসপোর্ট ছবি, প্রোডাক্ট ও প্রোফাইল ফটোর ব্যাকগ্রাউন্ড পরিবর্তন।',
    metaDescriptionEn: 'Instant automatic background remover for portraits, products, and passport photos. Export transparent PNGs for free.',
    h1Bn: 'ছবির Background Remove করার নিয়ম ও ব্যাকগ্রাউন্ড পরিবর্তন',
    h1En: 'Free AI & Local Image Background Remover Studio',
    summaryBn: 'পোর্ট্রেট, কমার্শিয়াল প্রোডাক্ট ও পাসপোর্ট ছবির ব্যাকগ্রাউন্ড এক ক্লিকে মুছে স্বচ্ছ বা সাদা ব্যাকগ্রাউন্ড দেওয়ার টুল।',
    summaryEn: 'Studio-grade background remover with automatic segmentation, manual refine brushes, and preset color backdrops.',
    instructionsBn: [
      'আপনার ছবি আপলোড করুন অথবা ড্র্যাগ করে আনুন।',
      '‘Remove Background’ বাটনে চাপলে স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ড মুছে যাবে।',
      'প্রয়োজনে ট্রান্সপারেন্ট, সাদা, স্টুডিও বা কাস্টম কালার ব্যাকগ্রাউন্ড দিয়ে HD PNG সেভ করুন।',
    ],
    instructionsEn: [
      'Upload your portrait or product photo.',
      'Click Remove Background for automated edge segmentation.',
      'Apply solid colors, custom backgrounds, or export pure transparent PNG.',
    ],
    supportedFormats: ['PNG', 'JPG', 'JPEG', 'WebP'],
    limits: 'সর্বোচ্চ ২০ মেগাপিক্সেল ও ৩০ এমবি ফাইল সাইজ।',
    faqs: [
      {
        questionBn: 'ছবি কি স্বচ্ছ (Transparent) পিএনজি আকারে ডাউনলোড করা যায়?',
        answerBn: 'হ্যাঁ, ট্রান্সপারেন্ট আলফা চ্যানেলসহ হাই-রেজোলিউশন PNG ফরম্যাটে সেভ করতে পারবেন।',
        questionEn: 'Does it support transparent PNG download?',
        answerEn: 'Yes, lossless transparent PNG with true alpha channel is generated instantly.',
      },
    ],
    relatedRoutes: ['/image-studio/resize', '/scan-ocr', '/creative-suite'],
  },

  '/image-studio/resize': {
    path: '/image-studio/resize',
    module: 'image',
    titleBn: 'ছবির সাইজ ও মাপ রিসাইজ করার নিয়ম — Image Resize & Crop | মায়িশা',
    titleEn: 'Image Resizer & Crop Tool — Passport & Social Presets | MAISHAA',
    metaDescriptionBn: 'পাসপোর্ট সাইজ ছবি (300x300 px), ফেসবুক কভার, সিগনেচার রিসাইজ (300x80 px) করুন দ্রুত ও নির্ভুল মাপে।',
    metaDescriptionEn: 'Resize, crop, and compress images with official Bangladeshi passport (300x300) and signature (300x80) presets.',
    h1Bn: 'ছবির সাইজ ও রেজোলিউশন রিসাইজ করার টুল',
    h1En: 'Image Resizing, Cropping and Aspect Ratio Optimizer',
    summaryBn: 'চাকরির আবেদন, পাসপোর্ট ছবি (৩০০×৩০০) এবং ডিজিটাল স্বাক্ষরের (৩০০×৮০) জন্য সুনির্দিষ্ট পিক্সেল মাপে ছবি রিসাইজ।',
    summaryEn: 'Preset-driven image resizer supporting standard government form dimensions, aspect locking, and quality controls.',
    instructionsBn: [
      'আপনার ছবি বা সিগনেচার সিলেক্ট করুন।',
      'প্রিসেট নির্বাচন করুন (যেমন পাসপোর্ট ৩০০×৩০০ বা সিগনেচার ৩০০×৮০)।',
      '‘Download Resized Image’ বাটনে ক্লিক করুন।',
    ],
    instructionsEn: [
      'Upload your photo or signature scan.',
      'Pick a standard preset or enter custom width and height.',
      'Save the optimized image ready for job portal submission.',
    ],
    supportedFormats: ['PNG', 'JPG', 'WebP'],
    limits: '৩০ এমবি পর্যন্ত ফাইল।',
    faqs: [
      {
        questionBn: 'সরকারি চাকরির আবেদনের মাপ কি সরাসরি পাওয়া যায়?',
        answerBn: 'হ্যাঁ, বিপিএসসি ও সরকারি চাকরির প্রমিত ৩০০×৩০০ ছবি এবং ৩০০×৮০ সিগনেচার প্রিসেট দেওয়া আছে।',
        questionEn: 'Are official Bangladeshi job presets supported?',
        answerEn: 'Yes, standard 300x300 px photo and 300x80 px signature presets are built-in.',
      },
    ],
    relatedRoutes: ['/image-studio/background-remover', '/forms-hub', '/scan-ocr'],
  },

  '/scan-ocr': {
    path: '/scan-ocr',
    module: 'ocr',
    titleBn: 'ছবি থেকে বাংলা লেখা বের করার নিয়ম — বাংলা ওসিআর (Bangla OCR) | মায়িশা',
    titleEn: 'Bangla OCR Online — Extract Bengali Text from Images & Scans | MAISHAA',
    metaDescriptionBn: 'স্ক্যান করা ছবি বা পিডিএফ থেকে অবিকল বাংলা লেখা টেক্সট আকারে বের করুন। টিসেরাক্ট ও সুলেমানলিপি নির্ভুল রিকগনিশন।',
    metaDescriptionEn: 'Extract editable Bengali and English text from scanned images and documents with high optical recognition accuracy.',
    h1Bn: 'ছবি থেকে বাংলা লেখা বের করার নিয়ম ও বাংলা ওসিআর',
    h1En: 'Bangla Optical Character Recognition (OCR) Engine',
    summaryBn: 'বইয়ের পাতা, নোটিশ বা টাইপ করা বাংলা দলিলের ছবি আপলোড করে এক ক্লিকে এডিটেবল ইউনিকোড বাংলা টেক্সট বের করার প্রযুক্তি।',
    summaryEn: 'High-accuracy client OCR engine specialized in recognizing Bengali characters, diacritics, and complex conjuncts.',
    instructionsBn: [
      'বাংলা বই, নোটিশ বা দলিলের স্পষ্ট ছবি আপলোড করুন।',
      'ভাষা ‘বাংলা ও ইংরেজি’ নির্বাচন করুন।',
      '‘Extract Text’ বাটনে চাপুন; প্রাপ্ত টেক্সট কপি করুন বা ওয়ার্ড ফাইলে সেভ করুন।',
    ],
    instructionsEn: [
      'Upload a clear scan or snapshot containing Bengali text.',
      'Select language mode (Bengali + English).',
      'Click Extract Text to copy or export editable Unicode text.',
    ],
    supportedFormats: ['JPG', 'PNG', 'PDF', 'WebP'],
    limits: 'প্রতিবার ৫টি পৃষ্ঠা বা ছবি প্রসেস করা যায়।',
    faqs: [
      {
        questionBn: 'বাংলা যুক্তবর্ণ কি সঠিকভাবে পড়তে পারে?',
        answerBn: 'হ্যাঁ, স্পষ্ট মুদ্রিত টেক্সটের ক্ষেত্রে ক্ষ, জ্ঞ, ত্র, শ্র, ক্ত ইত্যাদি নিখুঁতভাবে ইউনিকোডে রূপান্তরিত হয়।',
        questionEn: 'Does it recognize complex Bengali conjuncts?',
        answerEn: 'Yes, modern neural OCR models recognize common conjuncts when images have decent contrast.',
      },
    ],
    relatedRoutes: ['/pdf-studio/convert', '/forms-hub', '/image-studio/background-remover'],
  },

  '/forms-hub': {
    path: '/forms-hub',
    module: 'forms',
    titleBn: 'চাকরির আবেদনপত্র ও সরকারি ফরম তৈরি — বাংলাদেশ ফরম হাব | মায়িশা',
    titleEn: 'Bangladesh Smart Forms Hub — Official Application Forms | MAISHAA',
    metaDescriptionBn: 'সরকারি চাকরির আবেদন, ছুটির দরখাস্ত, প্রত্যায়নপত্র ও অফিসিয়াল ফরম পূরণ করে সরাসরি রেডি-টু-প্রিন্ট পিডিএফ তৈরি করুন।',
    metaDescriptionEn: 'Create and generate official Bangladeshi job applications, leave requests, and administrative forms in minutes.',
    h1Bn: 'চাকরির আবেদনপত্র তৈরি ও বাংলাদেশ স্মার্ট ফরম হাব',
    h1En: 'Bangladesh Official Smart Forms & Templates Hub',
    summaryBn: 'বাংলাদেশের স্ট্যান্ডার্ড সরকারি ও কর্পোরেট ফরম্যাটের আবেদনপত্র স্বয়ংক্রিয়ভাবে পূরণ ও প্রিন্ট উপযোগী পিডিএফ তৈরির প্ল্যাটফর্ম।',
    summaryEn: 'Template repository for standardized administrative, academic, and employment application documents.',
    instructionsBn: [
      'ফরমের তালিকা থেকে প্রয়োজনীয় ফরম্যাট সিলেক্ট করুন (যেমন ছুটির আবেদন বা চাকরির আবেদন)।',
      'ফর্মের খালি ঘরগুলোতে আপনার তথ্য দিন।',
      '‘Generate Official PDF’ বাটনে ক্লিক করে প্রফেশনাল ডকুমেন্ট প্রিন্ট বা সেভ করুন।',
    ],
    instructionsEn: [
      'Select your desired form template (job application, leave letter, certificate).',
      'Fill in applicant details in the guided form builder.',
      'Click Generate Official PDF for instant print-ready download.',
    ],
    supportedFormats: ['PDF', 'DOCX'],
    limits: 'সকল স্ট্যান্ডার্ড ফরম্যাট বিনামূল্যে আনলিমিটেড তৈরি করা যায়।',
    faqs: [
      {
        questionBn: 'তৈরিকৃত আবেদনপত্রে কি বাংলা ফন্ট সঠিক থাকে?',
        answerBn: 'হ্যাঁ, সরকারের অনুমোদিত স্ট্যান্ডার্ড ইউনিকোড ফন্টে এলাইনমেন্ট ও মার্জিন ঠিক রেখে ফরম জেনারেট হয়।',
        questionEn: 'Are margins and Bengali fonts compliant?',
        answerEn: 'Yes, generated PDFs adhere strictly to standard government margin rules (1 inch) and clean typography.',
      },
    ],
    relatedRoutes: ['/office-pack', '/scan-ocr', '/pdf-studio/convert'],
  },

  '/creative-suite': {
    path: '/creative-suite',
    module: 'creative',
    titleBn: 'ক্যানভাস ডিজাইন স্যুট — সার্টিফিকেট, আইডি কার্ড ও পোস্টার | মায়িশা',
    titleEn: 'Creative Design Suite — Multi-Page Vector Graphics | MAISHAA',
    metaDescriptionBn: 'ক্যানভা-স্টাইল ডিজাইন এডিটর: সার্টিফিকেট, স্টুডেন্ট আইডি কার্ড, সোশ্যাল মিডিয়া পোস্টার ও বাল্ক সার্টিফিকেট তৈরি করুন।',
    metaDescriptionEn: 'Full-featured vector design editor with templates for certificates, ID cards, social banners, and CSV bulk creation.',
    h1Bn: 'ক্যানভাস ডিজাইন স্যুট ও বাল্ক সার্টিফিকেট জেনারেটর',
    h1En: 'Canva-Style Creative Vector Canvas & Bulk Create',
    summaryBn: 'প্রফেশনাল ড্র্যাগ অ্যান্ড ড্রপ ক্যানভাস, মায়িশা অফিশিয়াল ব্র্যান্ড কিট এবং এক্সেল বা সিএসভি থেকে এক ক্লিকে শত শত সার্টিফিকেট তৈরির সুবিধা।',
    summaryEn: 'Vector design suite with rich typography, shapes, brand kit palettes, and bulk CSV personalization.',
    instructionsBn: [
      'টেমপ্লেট নির্বাচন করুন অথবা নতুন ফাঁকা ক্যানভাস দিয়ে শুরু করুন।',
      'লেখা, ছবি, লোগো, কিউআর কোড বা আকার যুক্ত করুন।',
      'বাল্ক ক্রিয়েট করতে সিএসভি আপলোড করুন অথবা সরাসরি PDF/PNG আকারে এক্সপোর্ট করুন।',
    ],
    instructionsEn: [
      'Pick a template or start with a custom blank canvas.',
      'Add vector shapes, text elements, logos, or QR codes.',
      'Export multi-page documents as high-resolution PDF or zipped PNG assets.',
    ],
    supportedFormats: ['PNG', 'PDF', 'SVG', 'CSV'],
    limits: '৫০টি ক্যানভাস পেজ ও আনলিমিটেড ভেক্টর উপাদান।',
    faqs: [
      {
        questionBn: 'সিএসভি ফাইল দিয়ে কি একসাথে অনেক সার্টিফিকেট বানানো যায়?',
        answerBn: 'হ্যাঁ, আমাদের ‘Bulk Create’ ফিচারে নামের তালিকা দিলে এক ক্লিকে সবার সার্টিফিকেট জিপ ফাইলে তৈরি হয়।',
        questionEn: 'Can multiple personalized certificates be made at once?',
        answerEn: 'Yes, Bulk Create accepts CSV spreadsheets and generates individualized certificate archives.',
      },
    ],
    relatedRoutes: ['/whiteboard', '/forms-hub', '/image-studio/background-remover'],
  },

  '/whiteboard': {
    path: '/whiteboard',
    module: 'whiteboard',
    titleBn: 'ইনফিনিট হোয়াইটবোর্ড — ব্রেনস্টর্মিং ও ফ্লোচার্ট ডায়াগ্রাম | মায়িশা',
    titleEn: 'Infinite Whiteboard — Brainstorming, Sticky Notes & Diagrams | MAISHAA',
    metaDescriptionBn: 'সীমাহীন ক্যানভাসে আইডিয়া ব্রেনস্টর্মিং, স্টিকি নোটস ও ফ্লোচার্ট ডায়াগ্রাম তৈরি করুন। সম্পূর্ণ বিনামূল্যে ব্রাউজারে।',
    metaDescriptionEn: 'Infinite digital canvas for mind mapping, brainstorming, sticky notes, and flowchart diagrams.',
    h1Bn: 'ইনফিনিট ডিজিটাল হোয়াইটবোর্ড ও আইডিয়া ম্যাপিং',
    h1En: 'Infinite Canvas Whiteboard for Brainstorming & Flowcharts',
    summaryBn: 'টিম মিটিং, নোট-নেওয়া ও ফ্লোচার্ট তৈরির জন্য ইনফিনিট জুমেবল ভার্চুয়াল বোর্ড।',
    summaryEn: 'Interactive infinite zoomable whiteboard equipped with sticky notes, connecting lines, and shape tools.',
    instructionsBn: [
      'টুলবার থেকে পেন, স্টিকি নোট বা আকার সিলেক্ট করুন।',
      'ক্যানভাসে ক্লিক করে নোট লিখুন বা আঁকুন।',
      'সম্পূর্ণ বোর্ড ইমেজ বা পিডিএফ হিসেবে সেভ করুন।',
    ],
    instructionsEn: [
      'Choose pen, shapes, or sticky note tools from the left bar.',
      'Click anywhere on the infinite canvas to sketch or type.',
      'Export the finished diagram as high-resolution PNG or PDF.',
    ],
    supportedFormats: ['PNG', 'PDF', 'SVG'],
    limits: 'আনলিমিটেড ক্যানভাস সাইজ।',
    faqs: [
      {
        questionBn: 'হোয়াইটবোর্ডের কাজ কি অফলাইনে করা সম্ভব?',
        answerBn: 'হ্যাঁ, সম্পূর্ণ কোড ব্রাউজারে রান করায় ইন্টারনেট চলে গেলেও বোর্ড সচল থাকে।',
        questionEn: 'Does the whiteboard work offline?',
        answerEn: 'Yes, the canvas runs completely client-side and functions smoothly offline.',
      },
    ],
    relatedRoutes: ['/creative-suite', '/pdf-studio/organize', '/office-pack'],
  },

  '/office-pack': {
    path: '/office-pack',
    module: 'office_pack',
    titleBn: 'ওয়ান-ক্লিক অফিস প্যাক — চাকরির আবেদন ও অফিস ফাইল কিট | মায়িশা',
    titleEn: 'One-Click Office Pack — Bundled Document Preparation | MAISHAA',
    metaDescriptionBn: 'চাকরির আবেদন, বিদেশ যাত্রা বা প্রাতিষ্ঠানিক ফাইলের সকল প্রয়োজনীয় ডকুমেন্ট এক ক্লিকে রেডি ও জিপ আকারে ডাউনলোড করুন।',
    metaDescriptionEn: 'Automated document pack compiler for job applications, scholarship submissions, and office administrative packs.',
    h1Bn: 'ওয়ান-ক্লিক অফিস প্যাক ও ডকুমেন্ট কিট জেনারেটর',
    h1En: 'One-Click Office Pack & Document Bundle Hub',
    summaryBn: 'চাকরি বা অফিসের জন্য ছবি, সিগনেচার, সনদ ও আবেদনপত্র একসাথে নিখুঁত সাইজ ও ফরম্যাটে বান্ডিল করার সিস্টেম।',
    summaryEn: 'Complete bundling system to organize photos, signatures, resumes, and certificates into verified application packages.',
    instructionsBn: [
      'আপনার প্যাকেজ ক্যাটাগরি বেছে নিন (যেমন সরকারি চাকরি আবেদন)।',
      'প্রয়োজনীয় ফাইল আপলোড ও চেক করে নিন।',
      'এক ক্লিকে প্রসেস করে সম্পূর্ণ প্যাক ZIP ফরম্যাটে নামিয়ে নিন।',
    ],
    instructionsEn: [
      'Select your document bundle profile (e.g. Govt Job Application).',
      'Attach your photo, signature, and educational certificates.',
      'Generate a standardized submission ZIP file with single click.',
    ],
    supportedFormats: ['ZIP', 'PDF', 'JPG'],
    limits: 'সকল ডকুমেন্ট সমন্বিত প্যাক।',
    faqs: [
      {
        questionBn: 'প্যাকেজের ছবি কি স্বয়ংক্রিয়ভাবে সঠিক সাইজে পরিবর্তিত হয়?',
        answerBn: 'হ্যাঁ, প্যাক তৈরির সময় ছবি ও সিগনেচার স্বয়ংক্রিয়ভাবে ৩০০×৩০০ ও ৩০০×৮০ মাপে অপটিমাইজ হয়ে যায়।',
        questionEn: 'Are documents automatically formatted to job guidelines?',
        answerEn: 'Yes, attachments are automatically formatted to meet recruitment portal specifications.',
      },
    ],
    relatedRoutes: ['/forms-hub', '/image-studio/resize', '/pdf-studio/merge'],
  },

  '/tutorials': {
    path: '/tutorials',
    module: 'tutorials',
    titleBn: 'মায়িশা টিউটোরিয়াল ও ব্যবহার নির্দেশিকা — Help & Guides | মায়িশা',
    titleEn: 'Help, Tutorials & User Guides — MAISHAA WORKSPACE',
    metaDescriptionBn: 'পিডিএফ মার্চ, সাইজ কমানো, ব্যাকগ্রাউন্ড রিমুভ ও বাংলা ওসিআর ব্যবহারের সহজ টিউটোরিয়াল ও প্রশ্নোত্তর।',
    metaDescriptionEn: 'Comprehensive guides, step-by-step tutorials, and helpful FAQs for all MAISHAA WORKSPACE tools.',
    h1Bn: 'মায়িশা ওয়ার্কস্পেস ব্যবহার নির্দেশিকা ও টিউটোরিয়াল হাব',
    h1En: 'MAISHAA WORKSPACE Guides & Documentation Hub',
    summaryBn: 'সকল টুলের ধাপে ধাপে বাংলা নির্দেশিকা, স্ক্রিনশট ও সাধারণ সমস্যার সমাধান।',
    summaryEn: 'Original step-by-step guides, troubleshooting tips, and frequently asked questions for all productivity tools.',
    instructionsBn: [
      'নিচের তালিকা থেকে আপনার প্রয়োজনীয় টুলের টিউটোরিয়াল সিলেক্ট করুন।',
      'সহজ ৩-ধাপের নির্দেশিকা ও ভিডিও/ইমেজ টিপস দেখুন।',
      'টিউটোরিয়াল থেকে সরাসরি ‘টুল খুলুন’ বাটনে ক্লিক করে কাজ শুরু করুন।',
    ],
    instructionsEn: [
      'Select any tutorial from the catalog below.',
      'Review simple instructions and best-practice tips.',
      'Click Open Tool directly from any guide to start working.',
    ],
    supportedFormats: ['সকল টিউটোরিয়াল'],
    limits: 'উন্মুক্ত পাবলিক নলেজ বেস।',
    faqs: [
      {
        questionBn: 'আমি কি টিউটোরিয়াল বন্ধুদের সাথে শেয়ার করতে পারি?',
        answerBn: 'হ্যাঁ, প্রতিটি গাইডে হোয়াটসঅ্যাপ, ফেসবুক ও টুইটারে সহজে শেয়ার করার বাটন রয়েছে।',
        questionEn: 'Can I share guides with colleagues?',
        answerEn: 'Yes, one-click sharing via WhatsApp, Facebook, and Twitter/X is built into each guide.',
      },
    ],
    relatedRoutes: ['/', '/pdf-studio/merge', '/image-studio/background-remover', '/privacy'],
  },

  '/privacy': {
    path: '/privacy',
    module: 'privacy',
    titleBn: 'গোপনীয়তা ও বিজ্ঞাপন নীতি — Privacy Policy & Ad Disclosures | মায়িশা',
    titleEn: 'Privacy Policy & Advertising Transparency | MAISHAA WORKSPACE',
    metaDescriptionBn: 'মায়িশা ওয়ার্কস্পেসের স্বচ্ছ গোপনীয়তা নীতি: লোকাল ফাইল প্রসেসিং, ক্লাউড এআই অনুমতি এবং বিজ্ঞাপন নেটওয়ার্ক তথ্য।',
    metaDescriptionEn: 'Detailed privacy disclosures covering client-side processing, optional AI services, advertising transparency, and zero file retention.',
    h1Bn: 'গোপনীয়তা, নিরাপত্তা ও বিজ্ঞাপন স্বচ্ছতা নীতি',
    h1En: 'Privacy Policy, Data Security & Advertising Disclosures',
    summaryBn: 'ব্যবহারকারীর ডেটা সুরক্ষা, ক্লায়েন্ট-সাইড প্রসেসিং এবং অ্যাডভার্টাইজিং পলিসি সম্পর্কিত স্পষ্ট বিবৃতি।',
    summaryEn: 'Comprehensive disclosure of file handling, local sandboxing, advertising networks, cookies, and user rights.',
    instructionsBn: [
      'আমরা আপনার আপলোড করা কোনো ফাইল সার্ভারে সংরক্ষণ করি না।',
      'বিজ্ঞাপন প্রদর্শনের জন্য বিশ্বস্ত নেটওয়ার্ক (Adsterra/AdSense) ব্যবহৃত হয় যা ডকুমেন্টের কোনো অংশ দেখতে পারে না।',
      'যেকোনো প্রশ্ন বা ফিডব্যাকের জন্য আমাদের সাথে যোগাযোগ করতে পারেন।',
    ],
    instructionsEn: [
      'All standard file operations execute inside your browser memory.',
      'Display ads do not have access to document payloads or canvas data.',
      'Zero user documents or personal files are retained or stored.',
    ],
    supportedFormats: ['পলিসি ডকুমেন্ট'],
    limits: 'শতভাগ স্বচ্ছতা নীতি।',
    faqs: [
      {
        questionBn: 'বিজ্ঞাপন কি আমার ডকুমেন্টের বিষয়বস্তু ট্র্যাক করতে পারে?',
        answerBn: 'না। বিজ্ঞাপন স্লটগুলো বিচ্ছিন্ন স্যান্ডবক্সে চলে এবং আপনার আপলোড করা কোনো ফাইলের সাথে এর সংযোগ নেই।',
        questionEn: 'Can advertisements access my document data?',
        answerEn: 'No. Ad units run inside isolated sandboxes with zero access to browser canvas or file memory.',
      },
    ],
    relatedRoutes: ['/', '/tutorials', '/about'],
  },

  '/about': {
    path: '/about',
    module: 'about',
    titleBn: 'মায়িশা ওয়ার্কস্পেস পরিচিতি ও সততা নীতি — About Us | মায়িশা',
    titleEn: 'About MAISHAA WORKSPACE — Mission & Integrity Standards',
    metaDescriptionBn: 'মায়িশা ওয়ার্কস্পেসের পরিচিতি, মিশন এবং বাংলাদেশের শিক্ষার্থীদের ও অফিস কর্মীদের জন্য ফ্রি টুলস তৈরি করার গল্প।',
    metaDescriptionEn: 'Learn about MAISHAA WORKSPACE, our mission to empower Bangladeshi students and professionals with private office tools.',
    h1Bn: 'মায়িশা ওয়ার্কস্পেস পরিচিতি ও সততা প্রতিশ্রুতি',
    h1En: 'About MAISHAA WORKSPACE & Our Integrity Commitment',
    summaryBn: 'বাংলাদেশের শিক্ষার্থীদের, চাকরিপ্রার্থীদের ও পেশাজীবীদের জন্য নির্মিত আধুনিক ও নিরাপদ অফিস টুল প্ল্যাটফর্ম।',
    summaryEn: 'Built for Bangladeshi students, job seekers, and office professionals seeking reliable browser tools without intrusive paywalls.',
    instructionsBn: [
      'মায়িশা কোনো ফেক বা মিথ্যা সুবিধা প্রদর্শন করে না।',
      'আমাদের প্ল্যাটফর্ম শতভাগ বাংলা ভাষা এবং কমপ্লেক্স স্ক্রিপ্ট সাপোর্ট করে।',
      'বিজ্ঞাপনের মাধ্যমে এই প্ল্যাটফর্মটি সবার জন্য সম্পূর্ণ বিনামূল্যে পরিচালিত হয়।',
    ],
    instructionsEn: [
      'MAISHAA strictly avoids fake promises or simulated results.',
      'Engineered with first-class Bengali typography and conjunct rendering.',
      'Supported by non-intrusive display ads to remain 100% free for everyone.',
    ],
    supportedFormats: ['সকল'],
    limits: 'পাবলিক মিশন স্টেটমেন্ট।',
    faqs: [
      {
        questionBn: 'মায়িশা প্রজেক্টের উদ্দেশ্য কী?',
        answerBn: 'প্রতিটি শিক্ষার্থী ও অফিস কর্মীকে একটি প্ল্যাটফর্মেই তাদের সকল প্রয়োজনীয় কাজ নিরাপদে সম্পন্ন করার সুযোগ দেওয়া।',
        questionEn: 'What is the vision of MAISHAA?',
        answerEn: 'To provide a unified, private, and capable workspace eliminating fragmented single-purpose tools.',
      },
    ],
    relatedRoutes: ['/', '/tutorials', '/privacy'],
  },
};

/**
 * Generates Schema.org JSON-LD structured data for a given route.
 */
export function generateSchemaJsonLd(routePath: string): object {
  const seo = PUBLIC_ROUTES_SEO[routePath] || PUBLIC_ROUTES_SEO['/'];
  const fullUrl = `${CANONICAL_DOMAIN}${seo.path}`;

  const schemas: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'MAISHAA WORKSPACE',
      url: CANONICAL_DOMAIN,
      logo: `${CANONICAL_DOMAIN}/logo.svg`,
      description: 'One Workspace. Every Office Task. এক জায়গায় আপনার সব অফিস কাজ।',
      sameAs: [
        'https://facebook.com/maishaa.workspace',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MAISHAA WORKSPACE',
      url: CANONICAL_DOMAIN,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${CANONICAL_DOMAIN}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: seo.h1En,
      url: fullUrl,
      applicationCategory: 'OfficeApplication',
      operatingSystem: 'All Modern Web Browsers',
      description: seo.metaDescriptionEn,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BDT',
      },
    },
  ];

  // Breadcrumbs
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: CANONICAL_DOMAIN,
      },
      ...(seo.path !== '/'
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: seo.h1En,
              item: fullUrl,
            },
          ]
        : []),
    ],
  });

  // FAQs
  if (seo.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seo.faqs.map((f) => ({
        '@type': 'Question',
        name: f.questionEn,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answerEn,
        },
      })),
    });
  }

  return schemas;
}
