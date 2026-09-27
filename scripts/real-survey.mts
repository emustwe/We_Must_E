// The real job's Survey (25 questions), exactly as the client wrote it. The
// partner jobs share it too (scripts/setup-partner-interviews.mts).
export type SurveyQ = { type: string; prompt: string; options?: string[] };

export const REAL_SURVEY: SurveyQ[] = [
  {
    type: "multi_choice",
    prompt:
      "Online Service Usage\n\nWhich online services do you use most frequently in your daily life?",
    options: [
      "Banking",
      "Shopping",
      "Entertainment",
      "Education",
      "Travel",
      "Food Delivery",
      "Social Media",
      "Work-related services",
      "Other",
    ],
  },
  {
    type: "long_text",
    prompt:
      "Which online service do you currently use that you believe has the best user experience?",
  },
  {
    type: "single_choice",
    prompt: "How often do you currently use AI tools in your daily life?",
    options: ["Never", "Occasionally", "Weekly", "Daily", "Several times a day"],
  },
  {
    type: "multi_choice",
    prompt: "What do you mainly use AI for?",
    options: [
      "Translation",
      "Work",
      "Shopping",
      "Research",
      "Entertainment",
      "Education",
      "Communication",
      "Personal tasks",
      "Other",
    ],
  },
  {
    type: "single_choice",
    prompt: "Which AI service would you be most willing to pay for?",
    options: [
      "Translation",
      "Personal assistant",
      "Business assistant",
      "Education",
      "Content creation",
      "Customer service",
      "Travel",
      "Other",
    ],
  },
  {
    type: "long_text",
    prompt: "What is one thing you wish AI could do for you that it cannot do well today?",
  },
  {
    type: "multi_choice",
    prompt: "Where do you usually discover new products or services?",
    options: [
      "TikTok",
      "Instagram",
      "YouTube",
      "Google",
      "Facebook",
      "Friends",
      "Influencers",
      "Online communities",
      "Other",
    ],
  },
  {
    type: "long_text",
    prompt:
      "When you see a product recommended by an influencer, what makes you trust the recommendation?",
  },
  {
    type: "single_choice",
    prompt: "Which type of advertising are you most likely to pay attention to?",
    options: [
      "Short video",
      "Influencer recommendation",
      "Discount",
      "Free trial",
      "Product review",
      "Sponsored content",
      "Brand event",
      "Other",
    ],
  },
  {
    type: "single_choice",
    prompt: "How often have you purchased something because you saw it on social media?",
    options: ["Never", "Once or twice", "Occasionally", "Frequently", "Very frequently"],
  },
  {
    type: "single_choice",
    prompt: "What category do you spend the most money on online?",
    options: [
      "Fashion",
      "Beauty",
      "Food",
      "Travel",
      "Entertainment",
      "Technology",
      "Education",
      "Gaming",
      "Other",
    ],
  },
  {
    type: "multi_choice",
    prompt: "What usually makes you decide to purchase a product online?",
    options: [
      "Price",
      "Reviews",
      "Brand",
      "Influencer",
      "Quality",
      "Discount",
      "Convenience",
      "Recommendation from friends",
      "Other",
    ],
  },
  {
    type: "scale",
    prompt:
      "How important is a discount when deciding whether to purchase something you are interested in?",
  },
  {
    type: "long_text",
    prompt: "If a new brand wanted to attract you, what would be the best way to reach you?",
  },
  {
    type: "single_choice",
    prompt: "Which type of sponsored event would you be most interested in participating in?",
    options: [
      "Online competition",
      "Gaming tournament",
      "Shopping event",
      "Entertainment event",
      "K-pop event",
      "Sports event",
      "Travel event",
      "Educational event",
      "Other",
    ],
  },
  {
    type: "single_choice",
    prompt: "What type of reward would motivate you most to participate in an online event?",
    options: [
      "Cash",
      "Smartphone",
      "Travel voucher",
      "Shopping voucher",
      "Products",
      "Exclusive membership",
      "Tickets",
      "Other",
    ],
  },
  {
    type: "scale",
    prompt: "If a brand sponsored an online event, how likely would you be to try that brand?",
  },
  { type: "long_text", prompt: "What is one product or service you wish existed in your country?" },
  {
    type: "long_text",
    prompt: "If you could create a new online service for people like yourself, what would it do?",
  },
  {
    type: "long_text",
    prompt: "What do you think will become more important to consumers over the next three years?",
  },
  { type: "long_text", prompt: "If you could travel anywhere tomorrow, where would you go?" },
  {
    type: "long_text",
    prompt:
      "If you could have dinner with any person in the world, living or dead, who would you choose?",
  },
  {
    type: "long_text",
    prompt: "What is one brand you genuinely like, and what do you like about it?",
  },
  {
    type: "long_text",
    prompt: "If you had an extra $1,000 to spend this month, how would you spend it?",
  },
  {
    type: "long_text",
    prompt: "What is one thing you would never spend money on, no matter how popular it became?",
  },
];
