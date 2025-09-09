
import { GoogleGenAI } from "@google/genai";
import type { AppData } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set for Gemini. Using mock response.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const generateHiddenInsights = async (data: AppData): Promise<string> => {
  if (!ai) {
    return `
- **Fastest Growing Query:** The query "ga4 api report" shows a significant increase in clicks compared to the previous period, indicating rising interest.
- **Opportunity Keyword:** The query "high impression low ctr opportunity" has over 250,000 impressions but a very low CTR. Optimizing the title and meta description could capture significant traffic.
- **Discover Traffic Spike:** There was a noticeable spike in Google Discover traffic around the middle of the reporting period for the URL "/blog/post-8-insights", suggesting it was featured.
- **Breakout Article:** "Author B" has a breakout article with far more pageviews than their other posts, representing a content format or topic that resonates strongly with the audience.
- **Device Performance:** Mobile devices drive the vast majority of traffic, but Desktop users have a slightly higher CTR, suggesting higher intent.
    `.trim();
  }

  const prompt = `
You are an expert SEO and data analyst. I will provide you with JSON data from a website's Google Analytics 4 and Google Search Console accounts. Your task is to analyze this data and generate a bulleted list of "Hidden & Rare Insights".

Focus on identifying actionable and mindblowing findings that a human might miss. Specifically, look for:
1.  **Fastest growing queries:** Identify queries with a significant percentage increase in clicks (you'll have to infer this from the data's ordering, as comparison data isn't in the JSON).
2.  **Opportunity keywords:** Find queries with very high impressions but a low Click-Through Rate (CTR).
3.  **Pages with unusual engagement:** Pinpoint pages with metrics that stand out (e.g., unusually high traffic from Discover).
4.  **Sudden traffic changes:** Note any anomalies or spikes in the trend data for Discover.
5.  **Breakout content by authors:** Identify authors who have one or two articles performing significantly better than their average.

Here is the data:
\`\`\`json
${JSON.stringify({
  diagnostics: data.diagnostics,
  topKeywords: data.gsc.web.keywords.slice(0, 5),
  topUrlsWeb: data.gsc.web.urls.slice(0, 5),
  topUrlsDiscover: data.gsc.discover.urls.slice(0, 5),
  topAuthors: data.authors.slice(0, 5),
}, null, 2)}
\`\`\`

Based on this data, provide a concise, bulleted list of 4-5 "Hidden Insights". Each insight should be a single, impactful sentence. Start each bullet with a bolded title like "**Opportunity Keyword:**". Do not repeat the data, interpret it.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Error: Could not generate insights from the AI model.";
  }
};
