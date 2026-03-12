// App tag format: <app>/<env>/v<version>
const APP_TAG_PATTERN = /^[a-z_]+\/(develop|release)\/v\d+\.\d+\.\d+$/;
async function main() {
    const tag = process.env.GIT_TAG;
    if (tag === undefined || tag.length < 1) {
        console.error("tag is empty");
        process.exit(1);
    }
    if (!APP_TAG_PATTERN.test(tag)) {
        console.error("Not a valid tag, tag: %s", tag);
        console.error("Expected format: <app>/<env>/v<version> (e.g. demo_web/develop/v0.0.1)");
        process.exit(1);
    }
    console.log("Git tag: %s", tag);
}
main().then();
export {};
