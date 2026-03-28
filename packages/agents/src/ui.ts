export const uiAgent = async (plan: any) => {
  console.log(`[UI Agent] Generating UI components for plan...`);
  return {
    "app/page.tsx": `'use client';\nexport default function Page() {\n  return <div>Interactive Sandbox: ${plan.pages[0]}</div>;\n}`
  };
};
