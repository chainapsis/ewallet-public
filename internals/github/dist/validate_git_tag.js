const VALID_APPS = {
    demo_web: ["develop", "release"],
    user_dashboard: ["develop", "release"],
    ct_dashboard: ["develop", "release"],
    admin_web: ["develop", "release"],
    attached: ["develop", "release"],
    attached_mobile_host_web: ["develop", "release"],
    docs_web: ["release"],
};
const APP_TAG_PATTERN = /^([a-z_]+)\/(develop|release)\/v\d+\.\d+\.\d+$/;
async function main() {
    const tag = process.env.GIT_TAG;
    if (tag === undefined || tag.length < 1) {
        console.error("tag is empty");
        process.exit(1);
    }
    const match = APP_TAG_PATTERN.exec(tag);
    if (!match) {
        console.error("Not a valid tag, tag: %s", tag);
        console.error("Expected format: <app>/<env>/v<version> (e.g. demo_web/develop/v0.0.1)");
        process.exit(1);
    }
    const app = match[1];
    const env = match[2];
    const allowedEnvs = VALID_APPS[app];
    if (!allowedEnvs) {
        console.error("Unknown app: %s", app);
        console.error("Valid apps: %s", Object.keys(VALID_APPS).join(", "));
        process.exit(1);
    }
    if (!allowedEnvs.includes(env)) {
        console.error("App '%s' does not support '%s' environment", app, env);
        console.error("Allowed environments: %s", allowedEnvs.join(", "));
        process.exit(1);
    }
    console.log("Git tag: %s", tag);
}
main().then();
export {};
