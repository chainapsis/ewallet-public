const DEVELOP = "develop/v";
const RELEASE = "release/v";
async function main() {
    const tag = process.env.GIT_TAG;
    if (tag === undefined || tag.length < 1) {
        console.error("tag is empty");
        process.exit(1);
    }
    if (!tag.startsWith(DEVELOP) && !tag.startsWith(RELEASE)) {
        console.error("Not a valid tag, tag: %s", tag);
        process.exit(1);
    }
    console.log("Git tag: %s", tag);
}
main().then();
export {};
