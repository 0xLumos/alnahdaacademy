// Public home page content. Edit this file to change what visitors see.
// Any text that starts with "[" is a placeholder: the page shows it with a dashed amber outline
// so it cannot go live unnoticed. Replace every one before publishing.

export const SITE = {
  name: "أكاديمية النهضة الرياضية",

  // SAMPLE text: confirm or rewrite.
  tagline: "MMA وكيك بوكسينغ بإشراف مدربين، للشباب والأطفال والسيدات.",
  about:
    "أكاديمية النهضة الرياضية مكان للتدريب على الفنون القتالية واللياقة. نبدأ معك من الأساسيات: الوقفة، الحركة، والضربات، ثم نرفع المستوى تدريجياً حسب جاهزيتك.",

  // Programs and monthly prices are not here: they come from the database (admin > المالية > أسعار الاشتراك).

  // Empty list shows "coming soon". Example entry: { days: "الأحد إلى الخميس", time: "4:00 م إلى 10:00 م" }
  hours: [],

  address: "مقابل روضة النهضة الإسلامية، الرام",
  // Paste the "Share" link from Google Maps here. Leave empty to hide the directions button.
  mapUrl: "",
  phones: ["0525514416", "0566701718"],
  // Digits only with country code, e.g. 9627XXXXXXXX. Leave empty to hide.
  whatsapp: "",
  // Full profile link. Leave empty to hide.
  instagram: "",
};

export const isPlaceholder = (s) => typeof s === "string" && s.trim().startsWith("[");
