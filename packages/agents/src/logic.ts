export const logicAgent = async (plan: any) => {
  console.log(`[Logic Agent] Generating application logic...`);
  return {
    "package.json": JSON.stringify({
      name: "sandbox-app",
      dependencies: { "react": "latest", "next": "latest" },
      scripts: { "dev": "next dev" }
    }, null, 2)
  };
};
