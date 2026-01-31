async function main() {
  const demoAppId = process.env.VERCEL_PROJECT_ID__OKO_DEMO_APP;
  const ctDashboardId = process.env.VERCEL_PROJECT_ID__OKO_DEMO_APP;
  const userDashboardId = process.env.VERCEL_PROJECT_ID__OKO_DEMO_APP;
  const attachedId = process.env.VERCEL_PROJECT_ID__OKO_DEMO_APP;

  const okoApp = process.env.OKO_APP;
  console.log("oko app: %s", okoApp);

  let projId: string;
  switch (okoApp) {
    case "demo_app":
      projId = demoAppId!;
      break;

    case "ct_dashboard":
      projId = ctDashboardId!;
      break;

    case "user_dashboard":
      projId = userDashboardId!;
      break;

    case "attachedId":
      projId = attachedId!;
      break;

    default:
      console.error("oko app invalid, app: %s", okoApp);

      process.exit(1);
  }

  console.log(JSON.stringify(projId));
}

main().then();

export {};
