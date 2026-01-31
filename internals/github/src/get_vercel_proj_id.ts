async function main() {
  const demoWebId = process.env.VERCEL_PROJECT_ID__OKO_DEMO_WEB;
  const ctDashboardId = process.env.VERCEL_PROJECT_ID__CT_DASHBOARD;
  const userDashboardId = process.env.VERCEL_PROJECT_ID__USER_DASHBOARD;
  const attachedId = process.env.VERCEL_PROJECT_ID__OKO_ATTACHED;

  const okoApp = process.env.OKO_APP;
  console.log("oko app: %s", okoApp);

  let projId: string;
  switch (okoApp) {
    case "demo_web":
      projId = demoWebId!;
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

  console.log("Found vercel project id, id: %s", projId);

  console.log(JSON.stringify(projId));
}

main().then();

export {};
